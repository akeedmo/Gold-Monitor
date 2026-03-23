import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import axios from "axios";
import Parser from "rss-parser";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  where, 
  Timestamp,
  increment,
  getDocFromServer
} from "firebase/firestore";

// Read Firebase configuration
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));

dotenv.config();

console.log("Server starting on port 3000...");
console.log("NODE_ENV:", process.env.NODE_ENV);
const app = express();
const PORT = 3000;
const parser = new Parser();

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

// Test Connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

// Auth Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.use(express.json());

// Visit Tracking Middleware
app.use((req, res, next) => {
  if (!req.path.startsWith('/api') && !req.path.includes('.')) {
    addDoc(collection(db, "visits"), {
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      user_agent: req.headers['user-agent'] || 'unknown',
      timestamp: Timestamp.now()
    }).catch(e => console.error("Tracking error:", e));
  }
  next();
});

// API Routes
app.post("/api/admin/login", async (req, res) => {
  const { password } = req.body;
  
  const storedPassDoc = await getDoc(doc(db, "settings", "admin_password"));
  const adminPass = storedPassDoc.exists() ? storedPassDoc.data().value : (process.env.ADMIN_PASSWORD || 'admin123');
  
  if (password === adminPass) {
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
    return res.json({ token });
  }
  res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
});

app.post("/api/admin/change-password", authenticate, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
  }
  
  await setDoc(doc(db, "settings", "admin_password"), { value: newPassword });
  res.json({ success: true });
});

app.get("/api/admin/stats", authenticate, async (req, res) => {
  try {
    const pricesSnapshot = await getDocs(query(collection(db, "prices"), orderBy("timestamp", "desc"), limit(1)));
    const latestPrice = pricesSnapshot.empty ? null : pricesSnapshot.docs[0].data();
    
    const newsSnapshot = await getDocs(collection(db, "news"));
    const totalNews = newsSnapshot.size;

    const visitsSnapshot = await getDocs(collection(db, "visits"));
    const totalVisits = visitsSnapshot.size;
    
    // Today's visits (simplified for now)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayVisitsSnapshot = await getDocs(query(collection(db, "visits"), where("timestamp", ">=", Timestamp.fromDate(today))));
    const todayVisits = todayVisitsSnapshot.size;
    
    res.json({
      total: totalVisits,
      today: todayVisits,
      week: 0, // Simplified
      month: 0, // Simplified
      history: [], // Simplified
      latestPrice: latestPrice,
      totalNews: totalNews
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/admin/settings", authenticate, async (req, res) => {
  const settings = req.body;
  try {
    for (const [key, value] of Object.entries(settings)) {
      await setDoc(doc(db, "settings", key), { value: String(value) });
    }
    res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to update settings' });
  }
});

app.get("/api/prices/latest", async (req, res) => {
  const pricesSnapshot = await getDocs(query(collection(db, "prices"), orderBy("timestamp", "desc"), limit(1)));
  res.json(pricesSnapshot.empty ? {} : pricesSnapshot.docs[0].data());
});

app.get("/api/prices/history", async (req, res) => {
  const historySnapshot = await getDocs(query(collection(db, "prices"), orderBy("timestamp", "desc"), limit(100)));
  res.json(historySnapshot.docs.map(d => d.data()));
});

app.get("/api/news", async (req, res) => {
  const newsSnapshot = await getDocs(query(collection(db, "news"), orderBy("timestamp", "desc"), limit(50)));
  res.json(newsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
});

app.post("/api/news/:id/view", async (req, res) => {
  await updateDoc(doc(db, "news", req.params.id), { views: increment(1) });
  res.json({ success: true });
});

app.post("/api/news/:id/like", async (req, res) => {
  await updateDoc(doc(db, "news", req.params.id), { likes: increment(1) });
  res.json({ success: true });
});

app.get("/api/exchange-rates", async (req, res) => {
  const ratesSnapshot = await getDocs(collection(db, "exchange_rates"));
  const ratesObj = ratesSnapshot.docs.reduce((acc: any, curr: any) => {
    acc[curr.id] = curr.data().rate;
    return acc;
  }, {});
  res.json(ratesObj);
});

app.post("/api/refresh", async (req, res) => {
  try {
    await Promise.all([
      fetchGoldPrices(),
      fetchNews(),
      fetchExchangeRates()
    ]);
    res.json({ success: true, message: "Data refreshed from external sources" });
  } catch (error) {
    res.status(500).json({ error: "Failed to refresh data" });
  }
});

app.post("/api/admin/exchange-rates", authenticate, async (req, res) => {
  const rates = req.body; // { currency: rate }
  try {
    for (const [currency, rate] of Object.entries(rates)) {
      await setDoc(doc(db, "exchange_rates", currency), { rate: Number(rate), updated_at: Timestamp.now() });
    }
    res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to update exchange rates' });
  }
});

app.get("/api/settings", async (req, res) => {
  const settingsSnapshot = await getDocs(collection(db, "settings"));
  const settingsObj = settingsSnapshot.docs.reduce((acc: any, curr: any) => {
    acc[curr.id] = curr.data().value;
    return acc;
  }, {});
  res.json(settingsObj);
});

app.post("/api/subscribe", async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: "Invalid email" });
  }
  try {
    await setDoc(doc(db, "subscribers", email.replace(/\./g, '_')), {
      email,
      subscribed_at: Timestamp.now(),
      status: 'active'
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Subscribe error:", error);
    res.status(500).json({ error: "Failed to subscribe" });
  }
});

app.get("/api/admin/subscribers", authenticate, async (req, res) => {
  try {
    const subscribersSnapshot = await getDocs(query(collection(db, "subscribers"), orderBy("subscribed_at", "desc")));
    res.json(subscribersSnapshot.docs.map(d => d.data()));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch subscribers" });
  }
});

app.post("/api/admin/notifications", authenticate, async (req, res) => {
  const { title, message, emails } = req.body;
  const appId = process.env.VITE_ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (appId && apiKey) {
    try {
      await axios.post(
        "https://onesignal.com/api/v1/notifications",
        {
          app_id: appId,
          contents: { en: message, ar: message },
          headings: { en: title, ar: title },
          included_segments: ["All"],
        },
        {
          headers: {
            Authorization: `Basic ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error("OneSignal Error:", error);
    }
  }

  let targetEmails = emails;
  if (!targetEmails || !Array.isArray(targetEmails) || targetEmails.length === 0) {
    const subscribersSnapshot = await getDocs(collection(db, "subscribers"));
    targetEmails = subscribersSnapshot.docs.map((s: any) => s.data().email);
  }

  if (targetEmails && targetEmails.length > 0) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const mailOptions = {
        from: `"أسعار الذهب" <${smtpUser}>`,
        to: smtpUser,
        bcc: targetEmails.join(','),
        subject: title,
        text: message,
        html: `<div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
                 <h2 style="color: #D4AF37;">${title}</h2>
                 <p style="font-size: 16px; color: #333; white-space: pre-wrap;">${message}</p>
                 <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                 <p style="font-size: 12px; color: #999;">تلقيت هذه الرسالة لأنك مشترك في تنبيهات أسعار الذهب.</p>
               </div>`,
      };

      transporter.sendMail(mailOptions).then(info => {
        console.log("Email sent successfully: %s", info.messageId);
      }).catch(error => {
        console.error("Email sending error:", error);
      });
    }
  }

  await addDoc(collection(db, "notifications"), { title, message, sent_at: Timestamp.now() });
  res.json({ success: true });
});

app.get("/api/admin/notifications", authenticate, async (req, res) => {
  const notificationsSnapshot = await getDocs(query(collection(db, "notifications"), orderBy("sent_at", "desc")));
  res.json(notificationsSnapshot.docs.map(d => d.data()));
});

app.delete("/api/news/:id", authenticate, async (req, res) => {
  await deleteDoc(doc(db, "news", req.params.id));
  res.json({ success: true });
});

app.post("/api/admin/announcement", authenticate, async (req, res) => {
  const { title, content } = req.body;
  await addDoc(collection(db, "news"), {
    title,
    contentSnippet: content,
    source: "إعلان إداري",
    pubDate: new Date().toISOString(),
    timestamp: Timestamp.now(),
    likes: 0,
    views: 0
  });
  res.json({ success: true });
});

// Automation: Fetch Gold Prices
async function fetchGoldPrices() {
  const apiKey = process.env.GOLD_API_KEY;
  
  const insertPrices = async (p24: number, p22: number, p21: number, p18: number) => {
    await addDoc(collection(db, "prices"), {
      price_24k: p24,
      price_22k: p22,
      price_21k: p21,
      price_18k: p18,
      currency: 'USD',
      timestamp: Timestamp.now()
    });
    console.log(`Prices updated: 24k=$${p24.toFixed(2)}`);
  };

  const insertMockData = async () => {
    const spotPrice = 2690 + Math.random() * 20; 
    const p24 = spotPrice / 31.1035;
    await insertPrices(p24, p24 * (22/24), p24 * (21/24), p24 * (18/24));
  };

  if (apiKey && apiKey !== 'YOUR_GOLDAPI_KEY' && apiKey.length > 10) {
    try {
      const response = await axios.get("https://www.goldapi.io/api/XAU/USD", {
        headers: { "x-access-token": apiKey },
        timeout: 5000
      });
      const data = response.data;
      if (data && (data.price_gram_24k || data.price)) {
        const p24 = data.price_gram_24k || (data.price / 31.1035);
        const p22 = data.price_gram_22k || (p24 * 22/24);
        const p21 = data.price_gram_21k || (p24 * 21/24);
        const p18 = data.price_gram_18k || (p24 * 18/24);
        await insertPrices(p24, p22, p21, p18);
        return;
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.warn(`Primary Gold API (goldapi.io) returned 403 Forbidden. This usually means the API key is invalid or quota exceeded. Falling back...`);
      } else {
        console.warn(`Primary Gold API failed: ${error.message}. Falling back...`);
      }
    }
  }

  try {
    const response = await axios.get("https://api.gold-api.com/price/XAU", { timeout: 5000 });
    if (response.data && response.data.price) {
      const p24 = response.data.price / 31.1035;
      await insertPrices(p24, p24 * (22/24), p24 * (21/24), p24 * (18/24));
      return;
    }
  } catch (error: any) {
    console.warn(`Secondary Gold API failed: ${error.message}`);
  }

  await insertMockData();
}

// Automation: Fetch News
async function fetchNews() {
  const feeds = [
    { url: "https://www.kitco.com/news/rss/gold.xml", source: "Kitco" },
    { url: "https://www.investing.com/rss/news_95.rss", source: "Investing.com" },
    { url: "https://www.fxstreet.com/rss/news/commodities/gold", source: "FXStreet" }
  ];

  try {
    for (const feedConfig of feeds) {
      try {
        const feed = await parser.parseURL(feedConfig.url);
        if (feed && feed.items) {
          for (const item of feed.items) {
            // Check if news already exists by link
            const q = query(collection(db, "news"), where("link", "==", item.link || "#"));
            const existing = await getDocs(q);
            if (existing.empty) {
              await addDoc(collection(db, "news"), {
                title: item.title || "No Title",
                link: item.link || "#",
                pubDate: item.pubDate || new Date().toISOString(),
                contentSnippet: item.contentSnippet || "",
                source: feedConfig.source,
                timestamp: Timestamp.now(),
                likes: 0,
                views: 0
              });
            }
          }
        }
      } catch (err: any) {
        console.warn(`Could not fetch news from ${feedConfig.source}: ${err.message}`);
      }
    }
  } catch (error) {
    console.error("Error in fetchNews process:", error);
  }
}

async function fetchExchangeRates() {
  try {
    const response = await axios.get("https://open.er-api.com/v6/latest/USD", { timeout: 10000 });
    const rates = response.data.rates;
    if (rates) {
      const targetCurrencies = ['USD', 'EUR', 'SAR', 'AED', 'GBP', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD', 'EGP', 'LYD', 'YER'];
      for (const curr of targetCurrencies) {
        if (rates[curr]) {
          let rate = rates[curr];
          if (curr === 'YER') {
            await setDoc(doc(db, "exchange_rates", "YER_SANAA"), { rate: 535, updated_at: Timestamp.now() });
            await setDoc(doc(db, "exchange_rates", "YER_ADEN"), { rate: 1650, updated_at: Timestamp.now() });
            if (rate < 1000) rate = 1650; 
          }
          await setDoc(doc(db, "exchange_rates", curr), { rate: rate, updated_at: Timestamp.now() });
        }
      }
      return;
    }
  } catch (error: any) {
    console.error("Error fetching exchange rates:", error.message);
  }
}

// SEO Routes
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  const baseUrl = process.env.APP_URL || `https://${req.get('host')}`;
  res.send("User-agent: *\nAllow: /\nSitemap: " + baseUrl + "/sitemap.xml");
});

app.get("/sitemap.xml", (req, res) => {
  res.type("application/xml");
  const baseUrl = process.env.APP_URL || `https://${req.get('host')}`;
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/</loc><priority>1.0</priority></url>
  <url><loc>${baseUrl}/charts</loc><priority>0.8</priority></url>
  <url><loc>${baseUrl}/news</loc><priority>0.8</priority></url>
  <url><loc>${baseUrl}/tips</loc><priority>0.7</priority></url>
  <url><loc>${baseUrl}/about</loc><priority>0.5</priority></url>
</urlset>`);
});

async function initFirestore() {
  try {
    // Default Settings
    const defaultSettings = [
      ['site_name', 'أسعار الذهب المباشرة'],
      ['primary_color', '#D4AF37'],
      ['secondary_color', '#000000'],
      ['admin_email', 'qydalrfyd@gmail.com']
    ];

    for (const [key, value] of defaultSettings) {
      const sDoc = await getDoc(doc(db, "settings", key));
      if (!sDoc.exists()) {
        await setDoc(doc(db, "settings", key), { value });
      }
    }
  } catch (error) {
    console.warn("Firestore initialization skipped or failed (likely permissions):", error instanceof Error ? error.message : error);
  }
}

async function startServer() {
  initFirestore().catch(err => console.error("initFirestore background error:", err));

  // Run automation
  setInterval(fetchGoldPrices, 5 * 60 * 1000);
  setInterval(fetchNews, 15 * 60 * 1000);
  setInterval(fetchExchangeRates, 60 * 60 * 1000);

  // Initial fetch
  fetchGoldPrices();
  fetchNews();
  fetchExchangeRates();

  console.log("Initializing Vite middleware...");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);

  console.log("Vite middleware initialized. Starting listener...");
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("CRITICAL: Failed to start server:", err);
});

export default app;
