import crypto from 'crypto';

/**
 * Server-side encryption service for user data
 * Uses Node.js built-in crypto module with AES-256-GCM
 */
export class ServerEncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;
  private static readonly SALT_LENGTH = 64;
  private static readonly TAG_LENGTH = 16;
  private static readonly TAG_POSITION = SALT_LENGTH + IV_LENGTH;
  private static readonly ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

  /**
   * Get encryption key from environment or derive from user data
   * In production, use a secure key management service
   */
  private static getEncryptionKey(address: string): Buffer {
    // Use ENCRYPTION_KEY from environment if available
    const envKey = process.env.ENCRYPTION_KEY;
    
    if (envKey) {
      // Use provided key, derive user-specific key using address
      const combined = `${address.toLowerCase()}-${envKey}`;
      return crypto.createHash('sha256').update(combined).digest();
    }
    
    // Fallback: derive from address (less secure, should use env key in production)
    const fallbackKey = process.env.FALLBACK_ENCRYPTION_KEY || 'ens-tools-default-key';
    const combined = `${address.toLowerCase()}-${fallbackKey}`;
    return crypto.createHash('sha256').update(combined).digest();
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  static encrypt(data: string, address: string): string {
    try {
      const key = this.getEncryptionKey(address);
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const salt = crypto.randomBytes(this.SALT_LENGTH);
      
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
      
      // Derive tag for authentication
      const encrypted = Buffer.concat([
        cipher.update(data, 'utf8'),
        cipher.final()
      ]);
      
      const tag = cipher.getAuthTag();
      
      // Combine salt + iv + tag + encrypted data
      const combined = Buffer.concat([
        salt,
        iv,
        tag,
        encrypted
      ]);
      
      return combined.toString('base64');
    } catch (error) {
      console.error('Server encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  static decrypt(encryptedData: string, address: string): string {
    try {
      const key = this.getEncryptionKey(address);
      const data = Buffer.from(encryptedData, 'base64');
      
      // Extract components
      const salt = data.slice(0, this.SALT_LENGTH);
      const iv = data.slice(this.SALT_LENGTH, this.TAG_POSITION);
      const tag = data.slice(this.TAG_POSITION, this.ENCRYPTED_POSITION);
      const encrypted = data.slice(this.ENCRYPTED_POSITION);
      
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Server decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt JSON object
   */
  static encryptJSON<T>(data: T, address: string): string {
    const jsonString = JSON.stringify(data);
    return this.encrypt(jsonString, address);
  }

  /**
   * Decrypt and parse JSON object
   */
  static decryptJSON<T>(encryptedData: string, address: string): T {
    const decryptedString = this.decrypt(encryptedData, address);
    return JSON.parse(decryptedString) as T;
  }

  /**
   * Check if data is encrypted (has the expected structure)
   */
  static isEncrypted(data: string): boolean {
    try {
      const buffer = Buffer.from(data, 'base64');
      // Encrypted data should be at least the size of salt + iv + tag
      return buffer.length >= this.ENCRYPTED_POSITION;
    } catch {
      return false;
    }
  }
}

