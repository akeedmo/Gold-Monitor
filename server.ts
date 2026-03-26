import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import path from "path";
import dotenv from "dotenv";
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, limit, getDocs, addDoc, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Initialize Firebase for server-side access
let db: any = null;

const getDb = () => {
  if (db) return db;

  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    let firebaseConfig: any = null;
    if (fs.existsSync(configPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }

    if (!firebaseConfig) {
      console.error("Firebase config not found. Firestore will not be available.");
      return null;
    }

    // Initialize Client SDK (Uses API Key + Rules, avoids IAM issues in this environment)
    const firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    
    console.log(`Firestore Client SDK initialized (Project: ${firebaseConfig.projectId}, Database: ${firebaseConfig.firestoreDatabaseId || 'default'})`);
    return db;
  } catch (err: any) {
    console.error("Failed to initialize Firebase Client SDK:", err.message);
    return null;
  }
};

// Initial attempt
getDb();

const METALPRICE_API_KEY = process.env.METALPRICE_API_KEY;
const BACKEND_SECRET = "a1b2c3d4e5f6g7h8i9j0";

if (!METALPRICE_API_KEY) {
  console.warn("METALPRICE_API_KEY is missing in environment variables.");
}

let customExchangeRates = {
  YER_SANAA: 530,
  YER_ADEN: 1650
};

// Cache for gold price (now reading from Firestore)
let goldPriceCache = {
  price: 0,
  timestamp: 0,
  isFallback: false,
  change_value: 0,
  change_type: 'stable'
};

async function getApiKeyFromFirestore() {
  const database = getDb();
  if (!database) return null;
  
  try {
    const docRef = doc(database, 'settings', 'api_keys');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      // FORCE COMMIT: Added support for lowercase api key field from Firebase
      // This ensures that if the user typed 'metalpriceapi_key' instead of 'METALPRICE_API_KEY', it still works.
      return data?.METALPRICE_API_KEY || data?.metalpriceapi_key || null;
    }
  } catch (error: any) {
    console.error("Error fetching API key from Firestore:", error.message);
  }
  return null;
}

async function fetchGoldPriceFromAPI(updateType: 'manual' | 'auto' = 'manual') {
  // Check Firestore first, then environment variable
  const firestoreKey = await getApiKeyFromFirestore();
  const activeKey = firestoreKey || process.env.METALPRICE_API_KEY;

  if (!activeKey) {
    throw new Error("METALPRICE_API_KEY is not configured in Firestore or environment variables");
  }

  // Refresh exchange rates from Firestore before calculation
  const database = getDb();
  if (database) {
    try {
      const ratesDoc = await getDoc(doc(database, 'settings', 'exchangeRates'));
      if (ratesDoc.exists()) {
        const ratesData = ratesDoc.data() as any;
        customExchangeRates.YER_SANAA = Number(ratesData.YER_SANAA) || 530;
        customExchangeRates.YER_ADEN = Number(ratesData.YER_ADEN) || 1650;
        console.log("Exchange rates refreshed from Firestore:", customExchangeRates);
      }
    } catch (e) {
      console.warn("Failed to refresh exchange rates from Firestore, using current values.");
    }
  }

  try {
    // 1. Fetch from MetalpriceAPI
    const response = await axios.get(`https://api.metalpriceapi.com/v1/latest?api_key=${activeKey}&base=USD&currencies=XAU`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.info || "MetalpriceAPI request failed");
    }

    const pricePerOunce = 1 / response.data.rates.XAU;
    const remainingApi = response.data.remaining || 0;

    // 2. Get last price from Firestore to calculate difference
    if (!database) throw new Error("Database not initialized");
    
    const q = query(
      collection(database, 'price_history'),
      orderBy('updated_at', 'desc'),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    
    let prevPrice = pricePerOunce;
    if (!querySnapshot.empty) {
      prevPrice = querySnapshot.docs[0].data().price_usd;
    }

    const changeValue = pricePerOunce - prevPrice;
    const changeType = changeValue > 0 ? 'up' : (changeValue < 0 ? 'down' : 'stable');

    const now = new Date().toISOString();
    const priceData = {
      price_usd: pricePerOunce,
      price_sanaa: pricePerOunce * customExchangeRates.YER_SANAA,
      price_aden: pricePerOunce * customExchangeRates.YER_ADEN,
      updated_at: now,
      update_type: updateType,
      remaining_api: remainingApi,
      change_value: Math.abs(changeValue),
      change_type: changeType
    };

    // 3. Save to Firestore
    try {
      await addDoc(collection(database, 'price_history'), {
        ...priceData,
        backend_secret: BACKEND_SECRET
      });
      console.log("Price data saved to Firestore history.");
    } catch (error: any) {
      console.error("Error saving price history to Firestore:", error.message);
    }
    
    // Update cache
    goldPriceCache = {
      price: pricePerOunce,
      timestamp: Date.now(),
      isFallback: false,
      change_value: Math.abs(changeValue),
      change_type: changeType
    };

    return priceData;
  } catch (error: any) {
    console.error("Error fetching gold price from API:", error.message);
    throw error;
  }
}

// Automatic update every 12 hours
setInterval(async () => {
  console.log("Running automatic gold price update (12-hour interval)...");
  try {
    // Check if we have remaining API quota (optional, MetalpriceAPI returns it in response)
    // For now, we just try to fetch. If it fails due to quota, we catch it.
    await fetchGoldPriceFromAPI('auto');
  } catch (err) {
    console.error("Automatic update failed:", err);
  }
}, 12 * 60 * 60 * 1000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Debug endpoint
  app.get("/api/debug/firebase", (req, res) => {
    const database = getDb();
    res.json({
      initialized: !!database,
      configExists: fs.existsSync(path.resolve(process.cwd(), 'firebase-applet-config.json')),
      env: {
        METALPRICE_API_KEY: !!process.env.METALPRICE_API_KEY
      }
    });
  });

  // API Keys management
  app.get("/api/admin/api-key", async (req, res) => {
    try {
      const firestoreKey = await getApiKeyFromFirestore();
      const envKey = process.env.METALPRICE_API_KEY;
      
      const activeKey = firestoreKey || envKey;
      
      res.json({
        hasKey: !!activeKey,
        isFromFirestore: !!firestoreKey,
        maskedKey: activeKey ? `${activeKey.substring(0, 4)}...${activeKey.substring(activeKey.length - 4)}` : null
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch API key info" });
    }
  });

  app.post("/api/admin/api-key", async (req, res) => {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "API key is required" });
    }

    const database = getDb();
    if (!database) {
      return res.status(500).json({ error: "Firebase not initialized" });
    }

    try {
      await setDoc(doc(database, 'settings', 'api_keys'), {
        METALPRICE_API_KEY: apiKey,
        updatedAt: serverTimestamp(),
        backend_secret: BACKEND_SECRET
      }, { merge: true });
      
      res.json({ success: true, message: "API key updated successfully" });
    } catch (error: any) {
      console.error("Error updating API key:", error.message);
      res.status(500).json({ error: "Failed to update API key", details: error.message });
    }
  });

  // API routes
  app.get("/api/exchange-rates", (req, res) => {
    res.json(customExchangeRates);
  });

  app.post("/api/admin/exchange-rates", (req, res) => {
    customExchangeRates = { ...customExchangeRates, ...req.body };
    res.json({ success: true });
  });

  // Manual update endpoint
  app.post("/api/admin/update-price", async (req, res) => {
    try {
      const firestoreKey = await getApiKeyFromFirestore();
      const activeKey = firestoreKey || process.env.METALPRICE_API_KEY;
      
      if (!activeKey) {
        return res.status(400).json({ success: false, error: "METALPRICE_API_KEY is missing. Please add it in the settings." });
      }
      const data = await fetchGoldPriceFromAPI('manual');
      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Error in /api/admin/update-price:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // History endpoint
  app.get("/api/admin/price-history", async (req, res) => {
    try {
      const database = getDb();
      if (!database) throw new Error("Firebase not initialized");
      
      const q = query(
        collection(database, 'price_history'),
        orderBy('updated_at', 'desc'),
        limit(50)
      );
      const querySnapshot = await getDocs(q);
      
      const history = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(history);
    } catch (error: any) {
      console.error("Error in /api/admin/price-history:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Proxy endpoint for visitors (reads from Firestore)
  app.get("/api/gold-price", async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    try {
      const database = getDb();
      if (!database) {
        console.error("Firebase not initialized in /api/gold-price");
        return res.status(500).json({ error: "Firebase not initialized" });
      }

      // Get latest from Firestore
      console.log("Fetching latest gold price from Firestore...");
      
      const q = query(
        collection(database, 'price_history'),
        orderBy('updated_at', 'desc'),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const latest = querySnapshot.docs[0].data();
        console.log("Latest price found:", latest.price_usd);
        return res.json({
          price: latest.price_usd,
          timestamp: new Date(latest.updated_at).getTime(),
          isFallback: false,
          change_value: latest.change_value,
          change_type: latest.change_type,
          price_sanaa: latest.price_sanaa,
          price_aden: latest.price_aden
        });
      }

      console.log("No price history found in Firestore, returning default.");
      // If no history, return default
      res.json({
        price: 2500,
        timestamp: Date.now(),
        isFallback: true,
        change_value: 0,
        change_type: 'stable'
      });
    } catch (error: any) {
      console.error("Error in /api/gold-price:", error);
      // Check for specific Firestore permission errors
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        return res.status(500).json({ 
          error: "Permission denied accessing database. Please ensure Firebase is correctly set up.",
          details: error.message
        });
      }
      res.status(500).json({ error: error.message || "Internal server error" });
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

  app.get("/api/status", async (req, res) => {
    const database = getDb();
    const hasEnvApiKey = !!process.env.METALPRICE_API_KEY;
    const hasFirebaseConfig = fs.existsSync(path.resolve(process.cwd(), 'firebase-applet-config.json'));
    
    let firestoreStatus = "Not connected";
    let hasFirestoreApiKey = false;

    if (database) {
      try {
        const testDoc = await getDoc(doc(database, 'settings', 'api_keys'));
        if (testDoc.exists()) {
          firestoreStatus = "Connected & Authorized";
          const data = testDoc.data();
          hasFirestoreApiKey = !!(data?.METALPRICE_API_KEY || data?.metalpriceapi_key);
        } else {
          firestoreStatus = "Connected (api_keys document not found)";
        }
      } catch (e: any) {
        firestoreStatus = `Error: ${e.message}`;
      }
    }

    res.json({
      env: process.env.NODE_ENV || "development",
      envApiKeySet: hasEnvApiKey,
      firestoreApiKeySet: hasFirestoreApiKey,
      firebaseConfigExists: hasFirebaseConfig,
      firestoreStatus,
      timestamp: new Date().toISOString()
    });
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
