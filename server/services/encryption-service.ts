/**
 * Server-side Encryption Service
 * Handles master key and per-user encryption keys
 * NOT exposed to client
 */

import crypto from 'crypto';

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;
  private static readonly SALT_LENGTH = 64;
  private static readonly TAG_LENGTH = 16;
  private static readonly KEY_LENGTH = 32; // 256 bits

  /**
   * Get master encryption key from environment
   * This key can decrypt ALL data
   */
  private static getMasterKey(): Buffer {
    const masterKey = process.env.MASTER_ENCRYPTION_KEY;
    if (!masterKey) {
      throw new Error('MASTER_ENCRYPTION_KEY environment variable is required');
    }
    
    // Derive a consistent 256-bit key from the master key
    return crypto.createHash('sha256').update(masterKey).digest();
  }

  /**
   * Generate a per-user encryption key
   * This key is derived from the master key + user address
   * Each user has their own key for privacy
   */
  static generateUserKey(userAddress: string): Buffer {
    const masterKey = this.getMasterKey();
    const combined = `${masterKey.toString('hex')}-${userAddress.toLowerCase()}`;
    return crypto.createHash('sha256').update(combined).digest();
  }

  /**
   * Encrypt data with master key (for admin access)
   */
  static encryptWithMasterKey(data: string): string {
    try {
      const key = this.getMasterKey();
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const salt = crypto.randomBytes(this.SALT_LENGTH);
      
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
      
      const encrypted = Buffer.concat([
        cipher.update(data, 'utf8'),
        cipher.final()
      ]);
      
      const tag = cipher.getAuthTag();
      
      const combined = Buffer.concat([
        salt,
        iv,
        tag,
        encrypted
      ]);
      
      return combined.toString('base64');
    } catch (error) {
      console.error('Master key encryption error:', error);
      throw new Error('Failed to encrypt data with master key');
    }
  }

  /**
   * Decrypt data with master key (for admin access)
   */
  static decryptWithMasterKey(encryptedData: string): string {
    try {
      const key = this.getMasterKey();
      const data = Buffer.from(encryptedData, 'base64');
      
      const salt = data.slice(0, this.SALT_LENGTH);
      const iv = data.slice(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
      const tag = data.slice(this.SALT_LENGTH + this.IV_LENGTH, this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH);
      const encrypted = data.slice(this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH);
      
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Master key decryption error:', error);
      throw new Error('Failed to decrypt data with master key');
    }
  }

  /**
   * Encrypt data with user-specific key
   */
  static encryptWithUserKey(data: string, userAddress: string): string {
    try {
      const key = this.generateUserKey(userAddress);
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const salt = crypto.randomBytes(this.SALT_LENGTH);
      
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
      
      const encrypted = Buffer.concat([
        cipher.update(data, 'utf8'),
        cipher.final()
      ]);
      
      const tag = cipher.getAuthTag();
      
      const combined = Buffer.concat([
        salt,
        iv,
        tag,
        encrypted
      ]);
      
      return combined.toString('base64');
    } catch (error) {
      console.error('User key encryption error:', error);
      throw new Error('Failed to encrypt data with user key');
    }
  }

  /**
   * Decrypt data with user-specific key
   */
  static decryptWithUserKey(encryptedData: string, userAddress: string): string {
    try {
      const key = this.generateUserKey(userAddress);
      const data = Buffer.from(encryptedData, 'base64');
      
      const salt = data.slice(0, this.SALT_LENGTH);
      const iv = data.slice(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
      const tag = data.slice(this.SALT_LENGTH + this.IV_LENGTH, this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH);
      const encrypted = data.slice(this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH);
      
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      console.error('User key decryption error:', error);
      throw new Error('Failed to decrypt data with user key');
    }
  }

  /**
   * Encrypt JSON object with master key
   */
  static encryptJSONWithMasterKey<T>(data: T): string {
    const jsonString = JSON.stringify(data);
    return this.encryptWithMasterKey(jsonString);
  }

  /**
   * Decrypt and parse JSON object with master key
   */
  static decryptJSONWithMasterKey<T>(encryptedData: string): T {
    const decryptedString = this.decryptWithMasterKey(encryptedData);
    return JSON.parse(decryptedString) as T;
  }

  /**
   * Encrypt JSON object with user key
   */
  static encryptJSONWithUserKey<T>(data: T, userAddress: string): string {
    const jsonString = JSON.stringify(data);
    return this.encryptWithUserKey(jsonString, userAddress);
  }

  /**
   * Decrypt and parse JSON object with user key
   */
  static decryptJSONWithUserKey<T>(encryptedData: string, userAddress: string): T {
    const decryptedString = this.decryptWithUserKey(encryptedData, userAddress);
    return JSON.parse(decryptedString) as T;
  }

  /**
   * Check if data is encrypted
   */
  static isEncrypted(data: string): boolean {
    try {
      const buffer = Buffer.from(data, 'base64');
      const minSize = this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH;
      return buffer.length >= minSize;
    } catch {
      return false;
    }
  }
}

