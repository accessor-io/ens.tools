import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { db } from '../../db';
import { redisClient } from '../../db/redis';

export const domainsRouter = Router();

domainsRouter.use(authMiddleware);

domainsRouter.get('/:name/enhanced', async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.params;
    const cacheKey = `domain:${name}`;
    
    // Check cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Query The Graph API
    const GRAPH_URL = 'https://api.thegraph.com/subgraphs/name/ensdomains/ens';
    
    const query = `
      query GetDomain($name: String!) {
        domain(id: $name) {
          id
          name
          labelName
          labelhash
          createdAt
          owner { id }
          resolvedAddress { id }
          resolver {
            id
            addr { id }
            contentHash
            texts
          }
          wrappedDomain {
            id
            expiryDate
            fuses
            owner { id }
          }
        }
      }
    `;

    const response = await fetch(GRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { name: name.toLowerCase() },
      }),
    });

    const result = await response.json();
    
    if (result.errors || !result.data?.domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const domainData = result.data.domain;
    
    // Cache for 1 hour
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(domainData));

    res.json(domainData);
  } catch (error) {
    console.error('Get domain error:', error);
    res.status(500).json({ error: 'Failed to fetch domain data' });
  }
});

