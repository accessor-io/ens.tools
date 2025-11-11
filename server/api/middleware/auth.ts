import { Request, Response, NextFunction } from 'express';
import { recoverMessageAddress } from 'viem';
import jwt from 'jsonwebtoken';
import { db } from '../../db';
import { SecurityLogger } from './security-logger';

export interface AuthRequest extends Request {
  userId?: string;
  userAddress?: string;
}

interface AuthPayload {
  address: string;
  message: string;
  signature: string;
}

interface JWTPayload {
  address: string;
  userId: string;
  exp: number;
  iat?: number;
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
    
    // Verify JWT token signature
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      if (process.env.NODE_ENV === 'production') {
        console.error('JWT_SECRET must be set in production');
        return res.status(500).json({ error: 'Server configuration error' });
      }
      // Development fallback - but log warning
      console.warn('JWT_SECRET not set, using insecure default for development only');
    }
    
    let payload: JWTPayload;
    try {
      payload = jwt.verify(token, jwtSecret || 'dev-secret') as JWTPayload;
    } catch (error) {
      // Log authentication failures
      if (error instanceof jwt.TokenExpiredError) {
        await SecurityLogger.logAuthFailure(req, 'Token expired');
        return res.status(401).json({ error: 'Token expired' });
      }
      if (error instanceof jwt.JsonWebTokenError) {
        await SecurityLogger.logAuthFailure(req, 'Invalid token signature');
        return res.status(401).json({ error: 'Invalid token' });
      }
      await SecurityLogger.logAuthFailure(req, 'Token verification error');
      throw error;
    }
    
    if (!payload.address || !payload.userId) {
      return res.status(401).json({ error: 'Invalid token payload' });
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
    
    // Log successful authentication
    await SecurityLogger.logAuthSuccess(req, userId, payload.address);
    
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

