/**
 * Admin Authentication Middleware
 * Verifies Ethereum signature and admin status
 */

import { Request, Response, NextFunction } from 'express';
import { recoverMessageAddress } from 'viem';
import { AdminService } from '../../services/admin-service';

export interface AdminRequest extends Request {
  adminId?: string;
  adminAddress?: string;
  adminRole?: 'admin' | 'super_admin';
}

interface AdminAuthPayload {
  address: string;
  message: string;
  signature: string;
}

/**
 * Verify Ethereum signature
 */
const verifySignature = async (
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

/**
 * Admin authentication middleware
 * Requires valid session token or signature verification
 */
export const adminAuthMiddleware = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check for session token first
    const sessionToken = req.headers['x-admin-session'] as string;
    
    if (sessionToken) {
      const admin = await AdminService.validateSession(sessionToken);
      if (admin) {
        req.adminId = admin.id;
        req.adminAddress = admin.address;
        req.adminRole = admin.role;
        return next();
      }
    }

    // Fallback to signature verification
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication provided' });
    }

    const token = authHeader.substring(7);
    let payload: AdminAuthPayload;

    try {
      payload = JSON.parse(Buffer.from(token, 'base64').toString());
    } catch {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    if (!payload.address || !payload.message || !payload.signature) {
      return res.status(401).json({ error: 'Invalid auth payload' });
    }

    // Verify signature
    const isValid = await verifySignature(
      payload.address,
      payload.message,
      payload.signature
    );

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Check if address is admin
    const admin = await AdminService.getAdminByAddress(payload.address);
    if (!admin) {
      return res.status(403).json({ error: 'Not authorized as admin' });
    }

    req.adminId = admin.id;
    req.adminAddress = admin.address;
    req.adminRole = admin.role;

    // Update last login
    await AdminService.updateLastLogin(admin.id);

    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Super admin only middleware
 */
export const superAdminMiddleware = (
  req: AdminRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.adminRole !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
};


