import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

let customExchangeRates = {
  YER_SANAA: 530,
  YER_ADEN: 1650
};

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
      latestPrice: { price: 2500 },
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

  app.get("/api/gold", async (req, res) => {
    try {
      const currency = req.query.currency || "USD";
      const apiKey = process.env.METALPRICE_API_KEY || "1bda868b4ac2385f9e5ceb205450a0f8";
      const response = await axios.get(`https://api.metalpriceapi.com/v1/latest?api_key=${apiKey}&base=${currency}&currencies=XAU`, {
        timeout: 10000
      });
      console.log("API Response Data:", response.data);
      // MetalPriceAPI returns data in a different structure, need to adapt it to match what the frontend expects.
      // Assuming frontend expects { price: number }
      // The API returns how much XAU you get for 1 unit of the base currency.
      // To get the price of 1 XAU in the base currency, we divide 1 by the rate.
      const price = response.data.rates && response.data.rates.XAU ? (1 / response.data.rates.XAU) : 0;
      console.log("Extracted Price:", price);
      res.json({ price: price });
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).json({ error: "Failed to fetch gold price" });
    }
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
