import { Request, Response, NextFunction } from 'express';
import { recoverMessageAddress } from 'viem';
import { db } from '../../db';

export interface AuthRequest extends Request {
  userId?: string;
  userAddress?: string;
}

interface AuthPayload {
  address: string;
  message: string;
  signature: string;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const token = authHeader.substring(7);
    
    // Decode JWT token (simplified - in production use a proper JWT library)
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    
    if (!payload.address || !payload.exp) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check token expiration
    if (Date.now() >= payload.exp * 1000) {
      return res.status(401).json({ error: 'Token expired' });
    }

    // Get or create user
    const userResult = await db.query(
      'SELECT id, address FROM users WHERE address = $1',
      [payload.address]
    );

    let userId: string;
    if (userResult.rows.length === 0) {
      const newUserResult = await db.query(
        'INSERT INTO users (address) VALUES ($1) RETURNING id',
        [payload.address]
      );
      userId = newUserResult.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
    }

    req.userId = userId;
    req.userAddress = payload.address;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

export const verifySignature = async (
  address: string,
  message: string,
  signature: string
): Promise<boolean> => {
  try {
    const recoveredAddress = await recoverMessageAddress({
      message,
      signature: signature as `0x${string}`,
    });
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
};

