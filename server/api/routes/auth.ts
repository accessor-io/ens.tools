import { Router, Request, Response } from 'express';
import { verifySignature } from '../middleware/auth';
import { db } from '../../db';
import { redisClient } from '../../db/redis';
import crypto from 'crypto';

export const authRouter = Router();

authRouter.post('/connect', async (req: Request, res: Response) => {
  try {
    const { address, message, signature } = req.body;

    if (!address || !message || !signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify signature
    const isValid = await verifySignature(address, message, signature);
    if (!isValid) {
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
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + 86400; // 24 hours
  
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'dev-secret')
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

