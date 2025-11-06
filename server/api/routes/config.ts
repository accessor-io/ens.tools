import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { db } from '../../db';
import { redisClient } from '../../db/redis';
import { ServerEncryptionService } from '../../utils/encryption';

export const configRouter = Router();

configRouter.use(authMiddleware);

configRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const cacheKey = `config:${req.userId}`;
    
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      try {
        // Try to decrypt cached data
        const decrypted = ServerEncryptionService.decryptJSON(cached, req.userAddress);
        return res.json(decrypted);
      } catch {
        // If decryption fails, cache might be old format, continue to DB
      }
    }

    const result = await db.query(
      'SELECT config_json FROM user_configs WHERE user_id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.json({});
    }

    const configData = result.rows[0].config_json;
    let config: any;

    // Check if data is encrypted (string) or unencrypted (JSONB object)
    if (typeof configData === 'string') {
      try {
        config = ServerEncryptionService.decryptJSON(configData, req.userAddress);
      } catch (error) {
        console.error('Failed to decrypt config:', error);
        // Fallback: might be old unencrypted string format
        try {
          config = JSON.parse(configData);
        } catch {
          config = {};
        }
      }
    } else {
      // Already decrypted (old format), use as-is
      config = configData;
    }
    
    // Cache encrypted version
    try {
      const encrypted = ServerEncryptionService.encryptJSON(config, req.userAddress);
      await redisClient.setEx(cacheKey, 300, encrypted);
    } catch (error) {
      console.error('Failed to encrypt for cache:', error);
    }

    res.json(config);
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

configRouter.put('/', async (req: AuthRequest, res: Response) => {
  try {
    const config = req.body;

    // Encrypt the config before storing
    const encryptedConfig = ServerEncryptionService.encryptJSON(config, req.userAddress);

    const result = await db.query(
      `INSERT INTO user_configs (user_id, config_json)
       VALUES ($1, $2::text)
       ON CONFLICT (user_id) 
       DO UPDATE SET config_json = $2::text, updated_at = CURRENT_TIMESTAMP
       RETURNING config_json`,
      [req.userId, encryptedConfig]
    );

    // Clear cache
    await redisClient.del(`config:${req.userId}`);

    // Return decrypted config to client
    const decrypted = ServerEncryptionService.decryptJSON(result.rows[0].config_json, req.userAddress);
    res.json(decrypted);
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

