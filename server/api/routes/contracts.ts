import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { db } from '../../db';
import { redisClient } from '../../db/redis';

export const contractsRouter = Router();

contractsRouter.use(authMiddleware);

contractsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const cacheKey = `contracts:${req.userId}`;
    
    // Check cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const result = await db.query(
      'SELECT * FROM contracts WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );

    const contracts = result.rows;
    
    // Cache for 5 minutes
    await redisClient.setEx(cacheKey, 300, JSON.stringify(contracts));

    res.json(contracts);
  } catch (error) {
    console.error('Get contracts error:', error);
    res.status(500).json({ error: 'Failed to fetch contracts' });
  }
});

contractsRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      address,
      name,
      ens_name,
      chain,
      type,
      status,
      security,
      version,
      owner,
      multisig,
      upgradeable,
      verified,
      deployed,
      interactions24h,
      tvl,
      metadata,
    } = req.body;

    const result = await db.query(
      `INSERT INTO contracts (
        user_id, address, name, ens_name, chain, type, status, security,
        version, owner, multisig, upgradeable, verified, deployed,
        interactions24h, tvl, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        req.userId,
        address,
        name,
        ens_name,
        chain,
        type,
        status || 'active',
        security,
        version,
        owner,
        multisig || false,
        upgradeable || false,
        verified || false,
        deployed,
        interactions24h || 0,
        tvl,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );

    // Invalidate cache
    await redisClient.del(`contracts:${req.userId}`);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create contract error:', error);
    res.status(500).json({ error: 'Failed to create contract' });
  }
});

contractsRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const result = await db.query(
      `UPDATE contracts SET ${setClause} WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.userId, ...Object.values(updates)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // Invalidate cache
    await redisClient.del(`contracts:${req.userId}`);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update contract error:', error);
    res.status(500).json({ error: 'Failed to update contract' });
  }
});

contractsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM contracts WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // Invalidate cache
    await redisClient.del(`contracts:${req.userId}`);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete contract error:', error);
    res.status(500).json({ error: 'Failed to delete contract' });
  }
});

