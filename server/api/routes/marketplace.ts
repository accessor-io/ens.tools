import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { SecurityLogger } from '../middleware/security-logger';

export const marketplaceRouter = Router();

// Apply authentication to all marketplace routes
marketplaceRouter.use(authMiddleware);

/**
 * Proxy endpoint for OpenSea API calls
 * This hides the API key from the frontend
 */
marketplaceRouter.get('/opensea/*', async (req: AuthRequest, res: Response) => {
  try {
    const openseaApiKey = process.env.OPENSEA_API_KEY;
    if (!openseaApiKey) {
      return res.status(500).json({ error: 'Marketplace API not configured' });
    }

    // Get the path after /opensea/
    const openseaPath = req.path.replace('/opensea', '');
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    
    // Build OpenSea API URL
    const openseaUrl = `https://api.opensea.io/api/v2${openseaPath}${queryString}`;

    // Forward the request to OpenSea
    const response = await fetch(openseaUrl, {
      method: req.method,
      headers: {
        'X-API-KEY': openseaApiKey,
        'Content-Type': 'application/json',
        // Forward relevant headers
        ...(req.headers['user-agent'] && { 'User-Agent': req.headers['user-agent'] as string }),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenSea API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'Failed to fetch from marketplace',
        status: response.status,
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Marketplace proxy error:', error);
    await SecurityLogger.logSuspiciousActivity(req, {
      type: 'marketplace_proxy_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'medium');
    res.status(500).json({ error: 'Failed to proxy marketplace request' });
  }
});

/**
 * Proxy endpoint for general marketplace searches
 */
marketplaceRouter.get('/search', async (req: AuthRequest, res: Response) => {
  try {
    const { chain = 'ethereum', query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    // Validate chain
    const validChains = ['ethereum', 'polygon', 'arbitrum', 'optimism'];
    if (!validChains.includes(chain as string)) {
      return res.status(400).json({ error: 'Invalid chain' });
    }

    const openseaApiKey = process.env.OPENSEA_API_KEY;
    if (!openseaApiKey) {
      return res.status(500).json({ error: 'Marketplace API not configured' });
    }

    const url = `https://api.opensea.io/api/v2/chain/${chain}/collection/ens/nfts?search=${encodeURIComponent(query)}`;
    
    const response = await fetch(url, {
      headers: {
        'X-API-KEY': openseaApiKey,
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'Failed to search marketplace',
        status: response.status,
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Marketplace search error:', error);
    res.status(500).json({ error: 'Failed to search marketplace' });
  }
});

