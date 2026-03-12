import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import initSqlJs from "sql.js";
import axios from "axios";
import Parser from "rss-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const dbPath = process.env.VERCEL ? "/tmp/gold_monitor.db" : "gold_monitor.db";
const parser = new Parser();

let sqlJsDb: any = null;
let inTransaction = false;

function saveDatabase() {
  if (!sqlJsDb) return;
  const data = sqlJsDb.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

const db = {
  async get(sql: string, params: any[] = []) {
    if (!sqlJsDb) return undefined;
    const stmt = sqlJsDb.prepare(sql);
    try {
      if (params.length) stmt.bind(params);
      if (stmt.step()) {
        return stmt.getAsObject();
      }
      return undefined;
    } catch (e) {
      console.error("DB Get Error:", e);
      return undefined;
    } finally {
      stmt.free();
    }
  },
  async all(sql: string, params: any[] = []) {
    if (!sqlJsDb) return [];
    const stmt = sqlJsDb.prepare(sql);
    const results = [];
    try {
      if (params.length) stmt.bind(params);
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      return results;
    } catch (e) {
      console.error("DB All Error:", e);
      return [];
    } finally {
      stmt.free();
    }
  },
  async run(sql: string, params: any[] = []) {
    if (!sqlJsDb) return;
    try {
      sqlJsDb.run(sql, params);
      if (!inTransaction) saveDatabase();
    } catch (e) {
      console.error("DB Run Error:", e);
      throw e;
    }
  },
  async exec(sql: string) {
    if (!sqlJsDb) return;
    try {
      sqlJsDb.exec(sql);
      const upperSql = sql.toUpperCase();
      if (upperSql.includes('COMMIT') || upperSql.includes('ROLLBACK')) {
        inTransaction = false;
        saveDatabase();
      } else if (upperSql.includes('BEGIN')) {
        inTransaction = true;
      } else {
        if (!inTransaction) saveDatabase();
      }
    } catch (e) {
      console.error("DB Exec Error:", e);
      throw e;
    }
  }
};

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
app.use(async (req, res, next) => {
  if (!req.path.startsWith('/api') && !req.path.includes('.')) {
    try {
      await db.run("INSERT INTO visits (ip, user_agent) VALUES (?, ?)", [
        req.ip || req.headers['x-forwarded-for'] || 'unknown',
        req.headers['user-agent'] || 'unknown'
      ]);
    } catch (e) {
      console.error("Tracking error:", e);
    }
  }
  next();
});

// API Routes
app.post("/api/admin/login", async (req, res) => {
  const { password } = req.body;
  
  const storedPass = await db.get("SELECT value FROM settings WHERE key = 'admin_password'");
  const adminPass = storedPass ? storedPass.value : (process.env.ADMIN_PASSWORD || 'admin123');
  
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
  
  await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ['admin_password', newPassword]);
  res.json({ success: true });
});

app.get("/api/admin/stats", authenticate, async (req, res) => {
  try {
    const latestPrice = await db.get("SELECT * FROM prices ORDER BY timestamp DESC LIMIT 1");
    const totalNews = await db.get("SELECT COUNT(*) as count FROM news");

    const totalVisits = await db.get("SELECT COUNT(*) as count FROM visits");
    const todayVisits = await db.get("SELECT COUNT(*) as count FROM visits WHERE timestamp > date('now')");
    const weekVisits = await db.get("SELECT COUNT(*) as count FROM visits WHERE timestamp > date('now', '-7 days')");
    const monthVisits = await db.get("SELECT COUNT(*) as count FROM visits WHERE timestamp > date('now', '-30 days')");
    
    const history = await db.all(`
      SELECT date(timestamp) as date, COUNT(*) as count 
      FROM visits 
      WHERE timestamp > date('now', '-30 days') 
      GROUP BY date(timestamp)
      ORDER BY date ASC
    `);
    
    res.json({
      total: totalVisits?.count || 0,
      today: todayVisits?.count || 0,
      week: weekVisits?.count || 0,
      month: monthVisits?.count || 0,
      history: history || [],
      latestPrice: latestPrice || null,
      totalNews: totalNews?.count || 0
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/admin/settings", authenticate, async (req, res) => {
  const settings = req.body;
  
  await db.exec('BEGIN TRANSACTION');
  try {
    for (const [key, value] of Object.entries(settings)) {
      await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, String(value)]);
    }
    await db.exec('COMMIT');
  } catch (e) {
    await db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Failed to update settings' });
  }
  
  res.json({ success: true });
});

app.get("/api/prices/latest", async (req, res) => {
  const price = await db.get("SELECT * FROM prices ORDER BY timestamp DESC LIMIT 1");
  res.json(price || {});
});

app.get("/api/prices/history", async (req, res) => {
  const history = await db.all("SELECT * FROM prices ORDER BY timestamp DESC LIMIT 100");
  res.json(history || []);
});

app.get("/api/news", async (req, res) => {
  const news = await db.all("SELECT * FROM news ORDER BY timestamp DESC LIMIT 50");
  res.json(news || []);
});

app.post("/api/news/:id/view", async (req, res) => {
  await db.run("UPDATE news SET views = views + 1 WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});

app.post("/api/news/:id/like", async (req, res) => {
  await db.run("UPDATE news SET likes = likes + 1 WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});

app.get("/api/exchange-rates", async (req, res) => {
  const rates = await db.all("SELECT * FROM exchange_rates");
  const ratesObj = (rates || []).reduce((acc: any, curr: any) => {
    acc[curr.currency] = curr.rate;
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
  
  await db.exec('BEGIN TRANSACTION');
  try {
    for (const [currency, rate] of Object.entries(rates)) {
      await db.run("INSERT OR REPLACE INTO exchange_rates (currency, rate, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", [currency, Number(rate)]);
    }
    await db.exec('COMMIT');
  } catch (e) {
    await db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Failed to update exchange rates' });
  }
  
  res.json({ success: true });
});

app.get("/api/settings", async (req, res) => {
  const settings = await db.all("SELECT * FROM settings");
  const settingsObj = (settings || []).reduce((acc: any, curr: any) => {
    acc[curr.key] = curr.value;
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
    await db.run("INSERT OR IGNORE INTO subscribers (email) VALUES (?)", [email]);
    res.json({ success: true });
  } catch (error) {
    console.error("Subscribe error:", error);
    res.status(500).json({ error: "Failed to subscribe" });
  }
});

app.get("/api/admin/subscribers", authenticate, async (req, res) => {
  try {
    const subscribers = await db.all("SELECT * FROM subscribers ORDER BY subscribed_at DESC");
    res.json(subscribers);
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
    const subscribers = await db.all("SELECT email FROM subscribers");
    targetEmails = subscribers.map((s: any) => s.email);
  }

  // Send emails if targetEmails array is provided (Non-blocking)
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

      // Send asynchronously without awaiting
      transporter.sendMail(mailOptions).then(info => {
        console.log("Email sent successfully: %s", info.messageId);
      }).catch(error => {
        console.error("Email sending error:", error);
      });
    } else {
      console.log("SMTP not configured. Skipping email sending.");
    }
  }

  await db.run("INSERT INTO notifications (title, message) VALUES (?, ?)", [title, message]);
  res.json({ success: true });
});

app.get("/api/admin/notifications", authenticate, async (req, res) => {
  const notifications = await db.all("SELECT * FROM notifications ORDER BY sent_at DESC");
  res.json(notifications || []);
});

app.delete("/api/news/:id", authenticate, async (req, res) => {
  await db.run("DELETE FROM news WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});

app.post("/api/admin/announcement", authenticate, async (req, res) => {
  const { title, content } = req.body;
  await db.run(`
    INSERT INTO news (title, contentSnippet, source, pubDate)
    VALUES (?, ?, ?, ?)
  `, [title, content, "إعلان إداري", new Date().toISOString()]);
  res.json({ success: true });
});

// Automation: Fetch Gold Prices
async function fetchGoldPrices() {
  const apiKey = process.env.GOLD_API_KEY;
  
  const insertPrices = async (p24: number, p22: number, p21: number, p18: number) => {
    await db.run(`
      INSERT INTO prices (price_24k, price_22k, price_21k, price_18k, currency)
      VALUES (?, ?, ?, ?, ?)
    `, [p24, p22, p21, p18, 'USD']);
    console.log(`Prices updated: 24k=$${p24.toFixed(2)}`);
  };

  const insertMockData = async () => {
    const spotPrice = 2690 + Math.random() * 20; 
    const p24 = spotPrice / 31.1035;
    await insertPrices(p24, p24 * (22/24), p24 * (21/24), p24 * (18/24));
  };

  // 1. Try Primary API (GoldAPI.io) if key exists
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
        console.warn("Primary Gold API: Access Forbidden (403). Check your API key.");
      } else {
        console.warn(`Primary Gold API failed: ${error.message}`);
      }
    }
  }

  // 2. Try Secondary Free API (Gold-API.com)
  try {
    const response = await axios.get("https://api.gold-api.com/price/XAU", { timeout: 5000 });
    if (response.data && response.data.price) {
      const p24 = response.data.price / 31.1035;
      await insertPrices(p24, p24 * (22/24), p24 * (21/24), p24 * (18/24));
      console.log("Updated from secondary free API.");
      return;
    }
  } catch (error: any) {
    console.warn(`Secondary Gold API failed: ${error.message}`);
  }

  // 3. Try Tertiary Fallback (CoinGecko PAXG - tracks gold price)
  try {
    const response = await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd", { timeout: 5000 });
    if (response.data && response.data['pax-gold'] && response.data['pax-gold'].usd) {
      const spotPrice = response.data['pax-gold'].usd;
      const p24 = spotPrice / 31.1035;
      await insertPrices(p24, p24 * (22/24), p24 * (21/24), p24 * (18/24));
      console.log("Updated from CoinGecko (PAXG) fallback.");
      return;
    }
  } catch (error: any) {
    console.warn(`Tertiary Gold API failed: ${error.message}`);
  }

  // 4. Fallback to Mock Data
  console.log("All APIs failed. Using realistic mock data.");
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
            await db.run(`
              INSERT OR IGNORE INTO news (title, link, pubDate, contentSnippet, source)
              VALUES (?, ?, ?, ?, ?)
            `, [item.title || "No Title", item.link || "#", item.pubDate || new Date().toISOString(), item.contentSnippet || "", feedConfig.source]);
          }
        }
      } catch (err: any) {
        console.warn(`Could not fetch news from ${feedConfig.source}: ${err.message}`);
      }
    }
    console.log("News updated from available sources.");
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
            await db.run("INSERT OR REPLACE INTO exchange_rates (currency, rate, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", ['YER_SANAA', 535]);
            await db.run("INSERT OR REPLACE INTO exchange_rates (currency, rate, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", ['YER_ADEN', 1650]);
            if (rate < 1000) rate = 1650; 
          }
          await db.run("INSERT OR REPLACE INTO exchange_rates (currency, rate, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", [curr, rate]);
        }
      }
      console.log("Exchange rates updated from API.");
      return;
    }
  } catch (error: any) {
    console.error("Error fetching exchange rates, using defaults:", error.message);
  }

  // Fallback rates if API fails
  const defaultRates: any = {
    USD: 1, SAR: 3.75, AED: 3.67, KWD: 0.31, QAR: 3.64, BHD: 0.38, OMR: 0.38, EGP: 48.50, JOD: 0.71, LYD: 4.80, EUR: 0.92, GBP: 0.78, YER: 1650, YER_SANAA: 535, YER_ADEN: 1650
  };
  for (const [currency, rate] of Object.entries(defaultRates)) {
    await db.run("INSERT OR REPLACE INTO exchange_rates (currency, rate, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", [currency, rate]);
  }
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

async function initDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const filebuffer = fs.readFileSync(dbPath);
    sqlJsDb = new SQL.Database(filebuffer);
  } else {
    sqlJsDb = new SQL.Database();
  }

  await db.exec(`
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

    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'active'
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

  for (const [key, value] of defaultSettings) {
    await db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  }
}

async function startServer() {
  await initDB();

  // Run automation
  setInterval(fetchGoldPrices, 5 * 60 * 1000);
  setInterval(fetchNews, 15 * 60 * 1000);
  setInterval(fetchExchangeRates, 60 * 60 * 1000);

  // Initial fetch
  fetchGoldPrices();
  fetchNews();
  fetchExchangeRates();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer();

export default app;
