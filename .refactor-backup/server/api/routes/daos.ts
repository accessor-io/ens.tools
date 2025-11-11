import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { db } from '../../db';
import { redisClient } from '../../db/redis';

export const daosRouter = Router();

daosRouter.use(authMiddleware);

daosRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const cacheKey = `daos:${req.userId}`;
    
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const result = await db.query(
      'SELECT * FROM daos WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );

    const daos = result.rows;
    
    await redisClient.setEx(cacheKey, 300, JSON.stringify(daos));

    res.json(daos);
  } catch (error) {
    console.error('Get DAOs error:', error);
    res.status(500).json({ error: 'Failed to fetch DAOs' });
  }
});

daosRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      ens_name,
      description,
      category,
      chain,
      governance_token,
      treasury,
      members,
      proposals,
      status,
      verified,
      website,
      social,
      metadata,
    } = req.body;

    const result = await db.query(
      `INSERT INTO daos (
        user_id, name, ens_name, description, category, chain,
        governance_token, treasury, members, proposals, status,
        verified, website, social, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        req.userId,
        name,
        ens_name,
        description,
        category,
        chain,
        governance_token,
        treasury,
        members || 0,
        proposals || 0,
        status || 'active',
        verified || false,
        website,
        social ? JSON.stringify(social) : null,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );

    await redisClient.del(`daos:${req.userId}`);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create DAO error:', error);
    res.status(500).json({ error: 'Failed to create DAO' });
  }
});

daosRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const result = await db.query(
      `UPDATE daos SET ${setClause} WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.userId, ...Object.values(updates)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'DAO not found' });
    }

    await redisClient.del(`daos:${req.userId}`);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update DAO error:', error);
    res.status(500).json({ error: 'Failed to update DAO' });
  }
});

daosRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM daos WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'DAO not found' });
    }

    await redisClient.del(`daos:${req.userId}`);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete DAO error:', error);
    res.status(500).json({ error: 'Failed to delete DAO' });
  }
});

