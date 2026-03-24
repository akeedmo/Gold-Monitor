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

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

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

      // 1. Get API keys from Firestore
      const keysDoc = await getDoc(doc(db, 'settings', 'apiKeys'));
      const data = keysDoc.exists() ? keysDoc.data() : { manualPriceMode: false, manualPrice: 0, activeKey: null, pendingKeys: [] };
      
      const manualPriceMode = data.manualPriceMode || false;
      const manualPrice = Number(data.manualPrice) || 0;

      // 2. Handle Manual Mode
      if (manualPriceMode && Number.isFinite(manualPrice) && manualPrice > 0) {
        goldPriceCache = {
          price: manualPrice,
          timestamp: now,
          isFallback: true // Mark as manual/fallback
        };
        return res.json(goldPriceCache);
      }

      // 3. Get Active Key
      let apiKey = process.env.GOLD_API_KEY || "";
      let apiProvider = process.env.GOLD_API_PROVIDER || "GoldAPI";
      
      if (data.activeKey) {
        if (typeof data.activeKey === 'object' && data.activeKey.key) {
          apiKey = data.activeKey.key;
          const rawProvider = data.activeKey.provider || "GoldAPI";
          apiProvider = rawProvider.toUpperCase().includes('METAL') ? 'MetalPrice' : 
                        rawProvider.toUpperCase().includes('PRICE') ? 'GoldPriceAPI' : 'GoldAPI';
        } else if (typeof data.activeKey === 'string') {
          apiKey = data.activeKey;
        }
      }

      if (!apiKey) {
        console.warn("No API key found in Firestore or Environment. Using fallback price.");
        // If no key, try to use manual price if available, even if mode is off
        if (manualPrice > 0) {
          goldPriceCache = { price: manualPrice, timestamp: now, isFallback: true };
          return res.json(goldPriceCache);
        }
      }

      // Helper function to fetch from a specific key/provider
      const fetchFromProvider = async (key: string, provider: string) => {
        const maskedKey = key ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : "null";
        console.log(`Attempting fetch from ${provider} with key ${maskedKey}`);
        
        if (provider === 'MetalPrice') {
          const response = await axios.get(`https://api.metalpriceapi.com/v1/latest?api_key=${key}&base=USD&currencies=XAU`, { timeout: 10000 });
          if (response.data.success === false) {
            throw new Error(`MetalPrice Error: ${response.data.error?.info || response.data.error?.message || 'Unknown error'}`);
          }
          const xauRate = Number(response.data.rates?.XAU);
          return xauRate ? (1 / xauRate) : 0;
        } else if (provider === 'GoldPriceAPI') {
          const response = await axios.get(`https://api.goldpriceapi.com/v1/latest?api_key=${key}&base=USD&currencies=XAU`, { timeout: 10000 });
          if (response.data.success === false) {
            throw new Error(`GoldPriceAPI Error: ${response.data.error?.message || 'Unknown error'}`);
          }
          return Number(response.data.price) || 0;
        } else {
          // GoldAPI.io
          try {
            // Use www.goldapi.io as api.goldapi.io might have DNS issues in this environment
            const response = await axios.get('https://www.goldapi.io/api/XAU/USD', {
              headers: { 
                'x-access-token': key,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'GoldPriceApp/1.0'
              },
              timeout: 10000
            });
            
            if (response.data && response.data.error) {
              throw new Error(`GoldAPI Error: ${response.data.error}`);
            }
            
            return Number(response.data.price) || 0;
          } catch (err: any) {
            if (err.response?.data?.error) {
              throw new Error(`GoldAPI Error: ${err.response.data.error}`);
            }
            throw err;
          }
        }
      };

      // 4. Fetch from API
      let price = 0;
      const keysToTry = [];
      
      // Add active key first
      if (apiKey) {
        keysToTry.push({ key: apiKey, provider: apiProvider, isPrimary: true });
      }
      
      // Add pending keys
      const pending = data.pendingKeys || [];
      pending.forEach((p: any) => {
        let pProv = "GoldAPI";
        const rawP = p.provider?.toUpperCase() || "";
        if (rawP.includes('METAL')) pProv = 'MetalPrice';
        else if (rawP.includes('PRICE')) pProv = 'GoldPriceAPI';
        keysToTry.push({ key: p.key, provider: pProv, isPrimary: false });
      });

      let lastErrorMessage = "";

      for (const item of keysToTry) {
        try {
          // Small delay between retries to avoid rate limiting
          if (keysToTry.indexOf(item) > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          const cleanKey = item.key.trim();
          price = await fetchFromProvider(cleanKey, item.provider);
          if (price > 0) {
            console.log(`Successfully fetched price (${price}) using ${item.provider}`);
            goldPriceCache = { price, timestamp: now, isFallback: false };
            
            // Update stats and clear error log on success
            try {
              await setDoc(doc(db, 'settings', 'stats'), {
                latestPrice: {
                  price: price,
                  timestamp: new Date(now).toISOString()
                }
              }, { merge: true });
              
              await setDoc(doc(db, 'settings', 'apiKeys'), { 
                lastError: null,
                lastSuccess: new Date(now).toISOString()
              }, { merge: true });
            } catch (dbErr) {
              console.warn("Failed to update Firestore on success:", dbErr);
            }
            
            return res.json(goldPriceCache);
          }
        } catch (apiErr: any) {
          const status = apiErr.response?.status;
          const errorDetail = apiErr.response?.data?.error?.info || apiErr.response?.data?.message || apiErr.message;
          lastErrorMessage = `Fetch failed for ${item.provider} (Status: ${status || 'N/A'}): ${errorDetail}`;
          console.error(lastErrorMessage);
          
          // If 403, 401, or "Invalid API Key" error, try cross-provider fallback (maybe user picked wrong provider)
          const isInvalidKey = status === 403 || status === 401 || 
                              (errorDetail && (errorDetail.includes('Invalid API Key') || errorDetail.includes('Invalid key')));
          
          if (isInvalidKey) {
            const providersToTry = ['GoldAPI', 'MetalPrice', 'GoldPriceAPI'].filter(p => p !== item.provider);
            for (const otherProvider of providersToTry) {
              try {
                console.log(`Trying cross-provider fallback: ${otherProvider}...`);
                const altPrice = await fetchFromProvider(item.key.trim(), otherProvider);
                if (altPrice > 0) {
                  console.log(`Cross-provider fallback success! Price: ${altPrice} using ${otherProvider}`);
                  goldPriceCache = { price: altPrice, timestamp: now, isFallback: false };
                  await setDoc(doc(db, 'settings', 'apiKeys'), { 
                    lastError: null,
                    lastSuccess: new Date(now).toISOString()
                  }, { merge: true });
                  return res.json(goldPriceCache);
                }
              } catch (crossErr) {
                // Ignore cross-provider failures
              }
            }
          }
        }
      }

      // Log the last error to Firestore so admin can see it
      if (lastErrorMessage) {
        await setDoc(doc(db, 'settings', 'apiKeys'), { 
          lastError: {
            message: lastErrorMessage,
            timestamp: new Date().toISOString()
          }
        }, { merge: true });
      }

      // 5. Final Fallback (if all keys fail)
      console.error(`All API attempts failed. Last error: ${lastErrorMessage}`);
      
      // --- NEW: Real-Price Fallback (PAXG) ---
      // If all keys fail, try to get real market price of PAX Gold (1:1 with Gold)
      try {
        console.log("Attempting to fetch real price from PAXG (CoinGecko)...");
        const paxgRes = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd', { timeout: 8000 });
        const paxgPrice = Number(paxgRes.data['pax-gold']?.usd);
        if (paxgPrice > 0) {
          console.log(`PAXG Fallback success: ${paxgPrice}`);
          goldPriceCache = { price: paxgPrice, timestamp: now, isFallback: true };
          
          // Update lastSuccess and clear error if fallback is successful
          try {
            await setDoc(doc(db, 'settings', 'apiKeys'), { 
              lastError: null,
              lastSuccess: new Date(now).toISOString()
            }, { merge: true });
          } catch (e) { /* ignore */ }
          
          return res.json(goldPriceCache);
        }
      } catch (paxgErr: any) {
        console.error("PAXG fallback failed:", paxgErr.message);
      }

      // If we have a manual price, use it as a more reliable fallback than stale cache
      if (Number.isFinite(manualPrice) && manualPrice > 0) {
        console.log("Using manual price as last-resort fallback.");
        goldPriceCache = {
          price: manualPrice,
          timestamp: now,
          isFallback: true
        };
        return res.json(goldPriceCache);
      }

      if (goldPriceCache.price > 0) {
        console.log("Using stale cache as last-resort fallback.");
        goldPriceCache.isFallback = true;
        return res.json(goldPriceCache);
      }

      // If no cache at all, try manual price or Firestore stats
      const statsDoc = await getDoc(doc(db, 'settings', 'stats'));
      const lastPrice = (Number.isFinite(manualPrice) && manualPrice > 0) ? manualPrice : (statsDoc.exists() ? Number(statsDoc.data().latestPrice?.price) : 2150);
      
      goldPriceCache = {
        price: Number.isFinite(lastPrice) && lastPrice > 0 ? lastPrice : 2150,
        timestamp: now,
        isFallback: true
      };
      res.json(goldPriceCache);

    } catch (error: any) {
      console.error("Gold price fetch error:", error.message);
      // Return whatever we have in cache or a default
      res.json({
        price: (Number.isFinite(goldPriceCache.price) && goldPriceCache.price > 0) ? goldPriceCache.price : 2150,
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
