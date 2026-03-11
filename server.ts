import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import axios from "axios";
import Parser from "rss-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const db = new Database("gold_monitor.db");
const parser = new Parser();

// Database Initialization
db.exec(`
  CREATE TABLE IF NOT EXISTS prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    price_24k REAL,
    price_22k REAL,
    price_21k REAL,
    price_18k REAL,
    currency TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS exchange_rates (
    currency TEXT PRIMARY KEY,
    rate REAL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT,
    user_agent TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    link TEXT,
    pubDate TEXT,
    contentSnippet TEXT,
    source TEXT,
    likes INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    message TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Default Settings
const defaultSettings = [
  ['site_name', 'أسعار الذهب المباشرة'],
  ['primary_color', '#D4AF37'],
  ['secondary_color', '#000000'],
  ['ads_header', ''],
  ['ads_sidebar', ''],
  ['ads_content', ''],
  ['admin_email', 'qydalrfyd@gmail.com'],
  ['monetization_link', 'https://www.google.com/adsense/start/']
];

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
defaultSettings.forEach(([key, value]) => insertSetting.run(key, value));

app.use(express.json());

// Visit Tracking Middleware
app.use((req, res, next) => {
  if (!req.path.startsWith('/api') && !req.path.includes('.')) {
    try {
      db.prepare("INSERT INTO visits (ip, user_agent) VALUES (?, ?)").run(
        req.ip || req.headers['x-forwarded-for'] || 'unknown',
        req.headers['user-agent'] || 'unknown'
      );
    } catch (e) {
      console.error("Tracking error:", e);
    }
  }
  next();
});

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

// API Routes
app.post("/api/admin/login", async (req, res) => {
  const { password } = req.body;
  
  // Check settings table first
  const storedPass = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get() as any;
  const adminPass = storedPass ? storedPass.value : (process.env.ADMIN_PASSWORD || 'admin123');
  
  if (password === adminPass) {
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
    return res.json({ token });
  }
  res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
});

app.post("/api/admin/change-password", authenticate, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
  }
  
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('admin_password', newPassword);
  res.json({ success: true });
});

app.get("/api/admin/stats", authenticate, (req, res) => {
  const totalVisits = db.prepare("SELECT COUNT(*) as count FROM visits").get() as any;
  const todayVisits = db.prepare("SELECT COUNT(*) as count FROM visits WHERE timestamp > date('now')").get() as any;
  const weekVisits = db.prepare("SELECT COUNT(*) as count FROM visits WHERE timestamp > date('now', '-7 days')").get() as any;
  const monthVisits = db.prepare("SELECT COUNT(*) as count FROM visits WHERE timestamp > date('now', '-30 days')").get() as any;
  
  const history = db.prepare(`
    SELECT date(timestamp) as date, COUNT(*) as count 
    FROM visits 
    WHERE timestamp > date('now', '-30 days') 
    GROUP BY date(timestamp)
    ORDER BY date ASC
  `).all();
  
  const latestPrice = db.prepare("SELECT * FROM prices ORDER BY timestamp DESC LIMIT 1").get();
  const totalNews = db.prepare("SELECT COUNT(*) as count FROM news").get() as any;
  
  res.json({
    total: totalVisits.count,
    today: todayVisits.count,
    week: weekVisits.count,
    month: monthVisits.count,
    history: history,
    latestPrice,
    totalNews: totalNews.count
  });
});

app.post("/api/admin/settings", authenticate, (req, res) => {
  const settings = req.body;
  const updateSetting = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  
  db.transaction(() => {
    for (const [key, value] of Object.entries(settings)) {
      updateSetting.run(key, String(value));
    }
  })();
  
  res.json({ success: true });
});

app.get("/api/prices/latest", (req, res) => {
  const price = db.prepare("SELECT * FROM prices ORDER BY timestamp DESC LIMIT 1").get();
  res.json(price || {});
});

app.get("/api/prices/history", (req, res) => {
  const history = db.prepare("SELECT * FROM prices ORDER BY timestamp DESC LIMIT 100").all();
  res.json(history);
});

app.get("/api/news", (req, res) => {
  const news = db.prepare("SELECT * FROM news ORDER BY timestamp DESC LIMIT 50").all();
  res.json(news);
});

app.post("/api/news/:id/view", (req, res) => {
  db.prepare("UPDATE news SET views = views + 1 WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.post("/api/news/:id/like", (req, res) => {
  db.prepare("UPDATE news SET likes = likes + 1 WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.get("/api/exchange-rates", (req, res) => {
  const rates = db.prepare("SELECT * FROM exchange_rates").all();
  const ratesObj = rates.reduce((acc: any, curr: any) => {
    acc[curr.currency] = curr.rate;
    return acc;
  }, {});
  res.json(ratesObj);
});

app.post("/api/admin/exchange-rates", authenticate, (req, res) => {
  const rates = req.body; // { currency: rate }
  const updateRate = db.prepare("INSERT OR REPLACE INTO exchange_rates (currency, rate, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)");
  
  db.transaction(() => {
    for (const [currency, rate] of Object.entries(rates)) {
      updateRate.run(currency, Number(rate));
    }
  })();
  
  res.json({ success: true });
});

app.get("/api/settings", (req, res) => {
  const settings = db.prepare("SELECT * FROM settings").all();
  const settingsObj = settings.reduce((acc: any, curr: any) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});
  res.json(settingsObj);
});

app.post("/api/admin/notifications", authenticate, async (req, res) => {
  const { title, message } = req.body;
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

  db.prepare("INSERT INTO notifications (title, message) VALUES (?, ?)").run(title, message);
  res.json({ success: true });
});

app.get("/api/admin/notifications", authenticate, (req, res) => {
  const notifications = db.prepare("SELECT * FROM notifications ORDER BY sent_at DESC").all();
  res.json(notifications);
});

app.delete("/api/news/:id", authenticate, (req, res) => {
  db.prepare("DELETE FROM news WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.post("/api/admin/announcement", authenticate, (req, res) => {
  const { title, content } = req.body;
  db.prepare(`
    INSERT INTO news (title, contentSnippet, source, pubDate)
    VALUES (?, ?, ?, ?)
  `).run(title, content, "إعلان إداري", new Date().toISOString());
  res.json({ success: true });
});

// Automation: Fetch Gold Prices
async function fetchGoldPrices() {
  const apiKey = process.env.GOLD_API_KEY;
  
  const insertPrices = (p24: number, p22: number, p21: number, p18: number) => {
    db.prepare(`
      INSERT INTO prices (price_24k, price_22k, price_21k, price_18k, currency)
      VALUES (?, ?, ?, ?, ?)
    `).run(p24, p22, p21, p18, 'USD');
    console.log(`Prices updated: 24k=$${p24.toFixed(2)}`);
  };

  const insertMockData = () => {
    const spotPrice = 2690 + Math.random() * 20; 
    const p24 = spotPrice / 31.1035;
    insertPrices(p24, p24 * (22/24), p24 * (21/24), p24 * (18/24));
  };

  // 1. Try Primary API (GoldAPI.io) if key exists
  if (apiKey && apiKey !== 'YOUR_GOLDAPI_KEY' && apiKey.length > 10) {
    try {
      const response = await axios.get("https://www.goldapi.io/api/XAU/USD", {
        headers: { "x-access-token": apiKey },
        timeout: 8000
      });
      const data = response.data;
      if (data && (data.price_gram_24k || data.price)) {
        const p24 = data.price_gram_24k || (data.price / 31.1035);
        const p22 = data.price_gram_22k || (p24 * 22/24);
        const p21 = data.price_gram_21k || (p24 * 21/24);
        const p18 = data.price_gram_18k || (p24 * 18/24);
        insertPrices(p24, p22, p21, p18);
        return;
      }
    } catch (error) {
      console.error("Primary Gold API failed:", error.message);
    }
  }

  // 2. Try Secondary Free API (Gold-API.com)
  try {
    const response = await axios.get("https://api.gold-api.com/price/XAU", { timeout: 8000 });
    if (response.data && response.data.price) {
      const p24 = response.data.price / 31.1035;
      insertPrices(p24, p24 * (22/24), p24 * (21/24), p24 * (18/24));
      console.log("Updated from secondary free API.");
      return;
    }
  } catch (error) {
    console.error("Secondary Gold API failed:", error.message);
  }

  // 3. Fallback to Mock Data
  console.log("All APIs failed. Using realistic mock data.");
  insertMockData();
}

// Automation: Fetch News
async function fetchNews() {
  const feeds = [
    { url: "https://www.kitco.com/rss/gold-news/", source: "Kitco" },
    { url: "https://www.gold.org/rss/news", source: "Gold.org" }
  ];

  try {
    const insertNews = db.prepare(`
      INSERT OR IGNORE INTO news (title, link, pubDate, contentSnippet, source)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    for (const feedConfig of feeds) {
      try {
        const feed = await parser.parseURL(feedConfig.url);
        feed.items.forEach(item => {
          insertNews.run(item.title, item.link, item.pubDate, item.contentSnippet, feedConfig.source);
        });
      } catch (err) {
        console.error(`Error fetching news from ${feedConfig.source}:`, err);
      }
    }
    console.log("News updated from all sources.");
  } catch (error) {
    console.error("Error in fetchNews process:", error);
  }
}

async function fetchExchangeRates() {
  const insertRate = db.prepare("INSERT OR REPLACE INTO exchange_rates (currency, rate, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)");
  
  try {
    const response = await axios.get("https://open.er-api.com/v6/latest/USD", { timeout: 10000 });
    const rates = response.data.rates;
    if (rates) {
      const targetCurrencies = ['USD', 'EUR', 'SAR', 'AED', 'GBP', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD', 'EGP', 'LYD', 'YER'];
      targetCurrencies.forEach(curr => {
        if (rates[curr]) {
          let rate = rates[curr];
          // Special handling for YER market rate if official is too low
          if (curr === 'YER') {
            // Insert both Sanaa and Aden rates
            // Sanaa is usually around 530-540
            // Aden is usually around 1600-1700
            insertRate.run('YER_SANAA', 535);
            insertRate.run('YER_ADEN', 1650);
            // Keep YER as a fallback (using Aden rate as it's more common for gold trade in market)
            if (rate < 1000) rate = 1650; 
          }
          insertRate.run(curr, rate);
        }
      });
      console.log("Exchange rates updated from API.");
      return;
    }
  } catch (error) {
    console.error("Error fetching exchange rates, using defaults:", error.message);
  }

  // Fallback rates if API fails
  const defaultRates: any = {
    USD: 1, SAR: 3.75, AED: 3.67, KWD: 0.31, QAR: 3.64, BHD: 0.38, OMR: 0.38, EGP: 48.50, JOD: 0.71, LYD: 4.80, EUR: 0.92, GBP: 0.78, YER: 1650, YER_SANAA: 535, YER_ADEN: 1650
  };
  Object.entries(defaultRates).forEach(([currency, rate]) => {
    insertRate.run(currency, rate);
  });
}

// SEO Routes
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send("User-agent: *\nAllow: /\nSitemap: " + (process.env.APP_URL || "http://localhost:3000") + "/sitemap.xml");
});

app.get("/sitemap.xml", (req, res) => {
  res.type("application/xml");
  const baseUrl = process.env.APP_URL || "http://localhost:3000";
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/</loc><priority>1.0</priority></url>
  <url><loc>${baseUrl}/charts</loc><priority>0.8</priority></url>
  <url><loc>${baseUrl}/news</loc><priority>0.8</priority></url>
  <url><loc>${baseUrl}/tips</loc><priority>0.7</priority></url>
  <url><loc>${baseUrl}/about</loc><priority>0.5</priority></url>
</urlset>`);
});

// Run automation
setInterval(fetchGoldPrices, 5 * 60 * 1000);
setInterval(fetchNews, 15 * 60 * 1000);
setInterval(fetchExchangeRates, 60 * 60 * 1000);

// Initial fetch
fetchGoldPrices();
fetchNews();
fetchExchangeRates();

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
