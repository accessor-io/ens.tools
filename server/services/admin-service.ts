/**
 * Admin Service
 * Handles admin authentication and authorization
 * NOT exposed to client
 */

import { db } from '../db';
import crypto from 'crypto';

export interface AdminUser {
  id: string;
  address: string;
  ensName?: string;
  role: 'admin' | 'super_admin';
  permissions?: any;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminSession {
  id: string;
  adminId: string;
  address: string;
  sessionToken: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export class AdminService {
  /**
   * Check if an address is an admin
   */
  static async isAdmin(address: string): Promise<boolean> {
    try {
      const result = await db.query(
        'SELECT id FROM admin_users WHERE address = $1 AND is_active = true',
        [address.toLowerCase()]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Get admin user by address
   */
  static async getAdminByAddress(address: string): Promise<AdminUser | null> {
    try {
      const result = await db.query(
        `SELECT id, address, ens_name, role, permissions, is_active, last_login, created_at, updated_at
         FROM admin_users 
         WHERE address = $1 AND is_active = true`,
        [address.toLowerCase()]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        address: row.address,
        ensName: row.ens_name,
        role: row.role,
        permissions: row.permissions,
        isActive: row.is_active,
        lastLogin: row.last_login,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error('Error getting admin user:', error);
      return null;
    }
  }

  /**
   * Create admin session
   */
  static async createSession(
    adminId: string,
    address: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AdminSession> {
    try {
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const result = await db.query(
        `INSERT INTO admin_sessions (admin_id, address, session_token, expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, admin_id, address, session_token, expires_at, ip_address, user_agent, created_at`,
        [adminId, address.toLowerCase(), sessionToken, expiresAt, ipAddress, userAgent]
      );

      const row = result.rows[0];
      return {
        id: row.id,
        adminId: row.admin_id,
        address: row.address,
        sessionToken: row.session_token,
        expiresAt: row.expires_at,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        createdAt: row.created_at,
      };
    } catch (error) {
      console.error('Error creating admin session:', error);
      throw error;
    }
  }

  /**
   * Validate admin session
   */
  static async validateSession(sessionToken: string): Promise<AdminUser | null> {
    try {
      const result = await db.query(
        `SELECT 
          s.id as session_id,
          s.expires_at,
          a.id,
          a.address,
          a.ens_name,
          a.role,
          a.permissions,
          a.is_active
         FROM admin_sessions s
         JOIN admin_users a ON s.admin_id = a.id
         WHERE s.session_token = $1 AND s.expires_at > NOW() AND a.is_active = true`,
        [sessionToken]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        address: row.address,
        ensName: row.ens_name,
        role: row.role,
        permissions: row.permissions,
        isActive: row.is_active,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error('Error validating admin session:', error);
      return null;
    }
  }

  /**
   * Update last login time
   */
  static async updateLastLogin(adminId: string): Promise<void> {
    try {
      await db.query(
        'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [adminId]
      );
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  /**
   * Revoke session
   */
  static async revokeSession(sessionToken: string): Promise<void> {
    try {
      await db.query(
        'DELETE FROM admin_sessions WHERE session_token = $1',
        [sessionToken]
      );
    } catch (error) {
      console.error('Error revoking session:', error);
      throw error;
    }
  }

  /**
   * Revoke all sessions for an admin
   */
  static async revokeAllSessions(adminId: string): Promise<void> {
    try {
      await db.query(
        'DELETE FROM admin_sessions WHERE admin_id = $1',
        [adminId]
      );
    } catch (error) {
      console.error('Error revoking all sessions:', error);
      throw error;
    }
  }

  /**
   * Clean expired sessions
   */
  static async cleanExpiredSessions(): Promise<void> {
    try {
      await db.query(
        'DELETE FROM admin_sessions WHERE expires_at < NOW()'
      );
    } catch (error) {
      console.error('Error cleaning expired sessions:', error);
    }
  }

  /**
   * Add admin user (super admin only)
   */
  static async addAdmin(
    address: string,
    role: 'admin' | 'super_admin' = 'admin',
    permissions?: any
  ): Promise<AdminUser> {
    try {
      const result = await db.query(
        `INSERT INTO admin_users (address, role, permissions)
         VALUES ($1, $2, $3)
         ON CONFLICT (address) 
         DO UPDATE SET role = $2, permissions = $3, is_active = true, updated_at = CURRENT_TIMESTAMP
         RETURNING id, address, ens_name, role, permissions, is_active, last_login, created_at, updated_at`,
        [address.toLowerCase(), role, permissions ? JSON.stringify(permissions) : null]
      );

      const row = result.rows[0];
      return {
        id: row.id,
        address: row.address,
        ensName: row.ens_name,
        role: row.role,
        permissions: row.permissions,
        isActive: row.is_active,
        lastLogin: row.last_login,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error('Error adding admin:', error);
      throw error;
    }
  }

  /**
   * Remove admin user (super admin only)
   */
  static async removeAdmin(address: string): Promise<void> {
    try {
      await db.query(
        'UPDATE admin_users SET is_active = false WHERE address = $1',
        [address.toLowerCase()]
      );
      // Also revoke all sessions
      const admin = await this.getAdminByAddress(address);
      if (admin) {
        await this.revokeAllSessions(admin.id);
      }
    } catch (error) {
      console.error('Error removing admin:', error);
      throw error;
    }
  }

  /**
   * List all admins
   */
  static async listAdmins(): Promise<AdminUser[]> {
    try {
      const result = await db.query(
        `SELECT id, address, ens_name, role, permissions, is_active, last_login, created_at, updated_at
         FROM admin_users
         ORDER BY created_at DESC`
      );

      return result.rows.map(row => ({
        id: row.id,
        address: row.address,
        ensName: row.ens_name,
        role: row.role,
        permissions: row.permissions,
        isActive: row.is_active,
        lastLogin: row.last_login,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      console.error('Error listing admins:', error);
      throw error;
    }
  }
}

