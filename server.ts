import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import path from "path";
import dotenv from "dotenv";
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'fs';

dotenv.config();

// Initialize Firebase for server-side access to settings
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let db: any = null;
if (fs.existsSync(firebaseConfigPath)) {
  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

let customExchangeRates = {
  YER_SANAA: 530,
  YER_ADEN: 1650
};

// Cache for gold price
let goldPriceCache = {
  price: 2150,
  timestamp: 0,
  isFallback: false
};

const CACHE_DURATION = 1 * 60 * 1000; // 1 minute

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/exchange-rates", (req, res) => {
    res.json(customExchangeRates);
  });

  app.post("/api/admin/exchange-rates", (req, res) => {
    // In a real app, verify admin token here
    customExchangeRates = { ...customExchangeRates, ...req.body };
    res.json({ success: true });
  });

  // Proxy endpoint with caching to avoid rate limits (10 requests/hour)
  app.get("/api/gold-price", async (req, res) => {
    // Prevent browser caching so the client always gets the latest price
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const now = Date.now();
    const force = req.query.force === 'true';
    
    // Return cached price if valid and not forced
    if (!force && goldPriceCache.price > 0 && (now - goldPriceCache.timestamp < CACHE_DURATION)) {
      console.log("Serving gold price from server cache");
      return res.json(goldPriceCache);
    }

    console.log(force ? "Forced refresh, fetching fresh gold price..." : "Cache expired or empty, fetching fresh gold price...");
    
    try {
      if (!db) throw new Error("Firebase not initialized on server");

      // 1. Get Settings from Firestore
      const settingsDoc = await getDoc(doc(db, 'settings', 'apiKeys'));
      const settingsData = settingsDoc.exists() ? settingsDoc.data() : { manualPriceMode: false, manualPrice: 0 };
      
      const manualPriceMode = settingsData.manualPriceMode || false;
      const manualPrice = Number(settingsData.manualPrice) || 0;

      // 2. Handle Manual Mode
      if (manualPriceMode && Number.isFinite(manualPrice) && manualPrice > 0) {
        goldPriceCache = {
          price: manualPrice,
          timestamp: now,
          isFallback: true
        };
        return res.json(goldPriceCache);
      }

      // 3. Fetch from multiple sources for reliability
      const sources = [
        { 
          name: 'Google Scraping (USD/oz)', 
          url: 'https://www.google.com/search?q=gold+price+per+ounce+usd',
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
          parser: (text: string) => {
            // Look for the price in the Google search result
            const match = text.match(/<span class="pclqee">([\d,.]+)<\/span>/) || 
                          text.match(/data-precision="2">([\d,.]+)<\/span>/) ||
                          text.match(/<span>(\d{1,3}(?:,\d{3})*(?:\.\d+)?)<\/span>\s*<span[^>]*>USD<\/span>/);
            return match ? Number(match[1].replace(/,/g, '')) : 0;
          }
        },
        {
          name: 'Gold-API (Alternative)',
          url: 'https://api.gold-api.com/api/gold',
          parser: (data: any) => Number(data.price)
        }
      ];

      for (const source of sources) {
        try {
          console.log(`Fetching from ${source.name}...`);
          const response = await axios.get(source.url, { 
            timeout: 5000,
            headers: source.headers || {}
          });
          
          let price = 0;
          if (source.parser) {
            price = source.parser(response.data);
          } else if (source.name === 'Gold-API') price = Number(response.data.price);
          else if (source.name === 'CoinGecko (PAXG)') price = Number(response.data['pax-gold']?.usd);
          else if (source.name === 'Binance (PAXG)') price = Number(response.data.price);

          if (price > 0) {
            console.log(`Successfully fetched price (${price}) using ${source.name}`);
            goldPriceCache = { price, timestamp: now, isFallback: false };
            
            // Update stats
            try {
              await setDoc(doc(db, 'settings', 'stats'), {
                latestPrice: { price, timestamp: new Date(now).toISOString() }
              }, { merge: true });
            } catch (dbErr) { console.warn("Failed to update stats:", dbErr); }
            
            return res.json(goldPriceCache);
          }
        } catch (err: any) {
          console.warn(`${source.name} failed:`, err.message);
        }
      }

      // 4. Final Fallback (Cache or Default)
      console.error("All public API attempts failed.");
      
      if (goldPriceCache.price > 0) {
        console.log("Using stale cache as last-resort fallback.");
        goldPriceCache.isFallback = true;
        return res.json(goldPriceCache);
      }

      // Default
      goldPriceCache = { price: 2500, timestamp: now, isFallback: true };
      res.json(goldPriceCache);

    } catch (error: any) {
      console.error("Gold price fetch error:", error.message);
      res.json({
        price: (Number.isFinite(goldPriceCache.price) && goldPriceCache.price > 0) ? goldPriceCache.price : 2500,
        timestamp: now,
        isFallback: true
      });
    }
  });

  // Mock endpoints for AdminDashboard
  app.get("/api/admin/stats", (req, res) => {
    res.json({
      total: 1500,
      today: 120,
      week: 800,
      month: 3000,
      history: [
        { date: '2026-03-18', count: 100 },
        { date: '2026-03-19', count: 150 },
        { date: '2026-03-20', count: 120 },
        { date: '2026-03-21', count: 200 },
        { date: '2026-03-22', count: 180 },
        { date: '2026-03-23', count: 120 },
      ],
      latestPrice: { price: (Number.isFinite(goldPriceCache.price) && goldPriceCache.price > 0) ? goldPriceCache.price : 2500 },
      totalNews: 45
    });
  });

  app.get("/api/settings", (req, res) => {
    res.json({
      siteName: "مراقب الذهب",
      contactEmail: "qydalrfyd@gmail.com",
      maintenanceMode: false
    });
  });

  app.get("/api/news", (req, res) => {
    res.json([]);
  });

  app.get("/api/admin/notifications", (req, res) => {
    res.json([]);
  });

  app.get("/api/admin/subscribers", (req, res) => {
    res.json([]);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
