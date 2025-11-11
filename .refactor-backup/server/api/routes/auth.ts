import { Router, Request, Response } from 'express';
import { verifySignature } from '../middleware/auth';
import { db } from '../../db';
import { redisClient } from '../../db/redis';
import jwt from 'jsonwebtoken';
import { SecurityLogger } from '../middleware/security-logger';
import { validate, schemas } from '../middleware/validation';

export const authRouter = Router();

authRouter.post('/connect', validate(schemas.authConnect), async (req: any, res: Response) => {
  try {
    const { address, message, signature } = req.validatedData;

    // Verify signature
    const isValid = await verifySignature(address, message, signature);
    if (!isValid) {
      await SecurityLogger.logAuthFailure(req, 'Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Get or create user
    const userResult = await db.query(
      'SELECT id, address, ens_name FROM users WHERE address = $1',
      [address]
    );

    let userId: string;
    if (userResult.rows.length === 0) {
      const newUserResult = await db.query(
        'INSERT INTO users (address) VALUES ($1) RETURNING id',
        [address]
      );
      userId = newUserResult.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
    }

    // Create session token (simplified JWT)
    const token = createToken({ address, userId });

    // Store session in Redis
    await redisClient.setEx(`session:${address}`, 86400, token); // 24 hours

    // Log successful authentication
    await SecurityLogger.logAuthSuccess(req, userId, address);

    res.json({
      token,
      user: {
        id: userId,
        address,
      },
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

authRouter.post('/disconnect', async (req: Request, res: Response) => {
  try {
    const { address } = req.body;
    if (address) {
      await redisClient.del(`session:${address}`);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ error: 'Disconnect failed' });
  }
});

function createToken(payload: { address: string; userId: string }): string {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    console.warn('JWT_SECRET not set, using insecure default for development only');
  }
  
  return jwt.sign(
    payload,
    jwtSecret || 'dev-secret',
    { expiresIn: '24h' }
  );
}

