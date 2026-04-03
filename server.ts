import express from 'express';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable CORS
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  // Cache for gold price
  let cachedPrice: any = null;
  let lastFetchTime = 0;
  const CACHE_DURATION = 60 * 1000; // 1 minute

  // API route for proxy - changed name to avoid ad-blockers
  app.get('/get-gold-data', async (req, res) => {
    const now = Date.now();
    if (cachedPrice && (now - lastFetchTime < CACHE_DURATION)) {
      console.log('Returning cached price');
      return res.json(cachedPrice);
    }

    try {
      const apiKey = process.env.GOLD_API_KEY?.trim();
      console.log('API Key present:', !!apiKey);
      
      // Define all possible ways to send the API key
      const variations = [];
      
      if (apiKey) {
        variations.push(
          { name: 'Header: x-api-key', url: 'https://api.gold-api.com/price/XAU/USD', headers: { 'x-api-key': apiKey } },
          { name: 'Header: Authorization Bearer', url: 'https://api.gold-api.com/price/XAU/USD', headers: { 'Authorization': `Bearer ${apiKey}` } },
          { name: 'Query: apiKey', url: `https://api.gold-api.com/price/XAU/USD?apiKey=${apiKey}`, headers: {} },
          { name: 'Query: api_key', url: `https://api.gold-api.com/price/XAU/USD?api_key=${apiKey}`, headers: {} },
          { name: 'Header: apikey', url: 'https://api.gold-api.com/price/XAU/USD', headers: { 'apikey': apiKey } }
        );
      }
      
      // Always add free fallbacks at the end
      variations.push(
        { name: 'Free: XAU/USD', url: 'https://api.gold-api.com/price/XAU/USD', headers: {} },
        { name: 'Free: XAU', url: 'https://api.gold-api.com/price/XAU', headers: {} },
        { name: 'Fallback: GoldAPI.io', url: 'https://www.goldapi.io/api/XAU/USD', headers: { 'x-access-token': 'goldapi-free-test' } }
      );
      
      let response;
      let lastErr;
      let successfulVariant = 'None';

      for (const variant of variations) {
        try {
          const displayUrl = variant.url.includes('key=') ? variant.url.split('key=')[0] + 'key=***' : variant.url;
          console.log(`Proxy attempting [${variant.name}]:`, displayUrl);
          
          const res = await axios.get(variant.url, { 
            headers: variant.headers,
            timeout: 8000 
          });

          if (res.status === 200 && res.data && (res.data.price || res.data.price_usd)) {
            response = res;
            successfulVariant = variant.name;
            console.log(`Success with variant: ${variant.name}`);
            break;
          }
        } catch (e: any) {
          lastErr = e;
          console.warn(`Variant [${variant.name}] failed:`, e.response?.status || e.message);
        }
      }

      if (!response) {
        throw lastErr || new Error('All variations failed');
      }
      
      // Add metadata and normalize price field
      const data = { ...response.data };
      // Ensure we have a 'price' field regardless of what the API calls it
      data.price = data.price || data.price_usd || data.value;
      data._variant = successfulVariant;
      data._isKeyUsed = successfulVariant.toLowerCase().includes('header') || successfulVariant.toLowerCase().includes('query');
      
      cachedPrice = data;
      lastFetchTime = now;
      
      res.json(cachedPrice);
    } catch (error: any) {
      console.error('Final Proxy Error:', error.response?.data || error.message);
      res.status(500).json({ 
        error: 'Failed to fetch price', 
        details: error.response?.data || error.message,
        status: error.response?.status
      });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
