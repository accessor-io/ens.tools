import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { db } from '../../db';
import { redisClient } from '../../db/redis';

export const configRouter = Router();

configRouter.use(authMiddleware);

configRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const cacheKey = `config:${req.userId}`;
    
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const result = await db.query(
      'SELECT config_json FROM user_configs WHERE user_id = $1',
      [req.userId]
    );

    const config = result.rows.length > 0 ? result.rows[0].config_json : {};
    
    await redisClient.setEx(cacheKey, 300, JSON.stringify(config));

    res.json(config);
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

configRouter.put('/', async (req: AuthRequest, res: Response) => {
  try {
    const config = req.body;

    const result = await db.query(
      `INSERT INTO user_configs (user_id, config_json)
       VALUES ($1, $2)
       ON CONFLICT (user_id) 
       DO UPDATE SET config_json = $2, updated_at = CURRENT_TIMESTAMP
       RETURNING config_json`,
      [req.userId, JSON.stringify(config)]
    );

    await redisClient.del(`config:${req.userId}`);

    res.json(result.rows[0].config_json);
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

