import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { db } from '../../db';
import { redisClient } from '../../db/redis';

export const integrationsRouter = Router();

integrationsRouter.use(authMiddleware);

integrationsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const cacheKey = `integrations:${req.userId}`;
    
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const result = await db.query(
      'SELECT * FROM integrations WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );

    const integrations = result.rows;
    
    await redisClient.setEx(cacheKey, 300, JSON.stringify(integrations));

    res.json(integrations);
  } catch (error) {
    console.error('Get integrations error:', error);
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

integrationsRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      type,
      description,
      status,
      address,
      endpoint,
      chain,
      ens_name,
      version,
      calls24h,
      uptime,
      verified,
      metadata,
    } = req.body;

    const result = await db.query(
      `INSERT INTO integrations (
        user_id, name, type, description, status, address, endpoint,
        chain, ens_name, version, calls24h, uptime, verified, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        req.userId,
        name,
        type,
        description,
        status || 'active',
        address,
        endpoint,
        chain,
        ens_name,
        version,
        calls24h || 0,
        uptime,
        verified || false,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );

    await redisClient.del(`integrations:${req.userId}`);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create integration error:', error);
    res.status(500).json({ error: 'Failed to create integration' });
  }
});

integrationsRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const result = await db.query(
      `UPDATE integrations SET ${setClause} WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.userId, ...Object.values(updates)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    await redisClient.del(`integrations:${req.userId}`);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update integration error:', error);
    res.status(500).json({ error: 'Failed to update integration' });
  }
});

integrationsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM integrations WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    await redisClient.del(`integrations:${req.userId}`);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete integration error:', error);
    res.status(500).json({ error: 'Failed to delete integration' });
  }
});

