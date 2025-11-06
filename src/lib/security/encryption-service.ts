import CryptoJS from 'crypto-js';

/**
 * Client-side encryption service for user data
 * Uses AES-256 encryption with user-specific keys
 */
export class EncryptionService {
  /**
   * Derive encryption key from user address and optional secret
   * In production, consider using a more secure key derivation method
   */
  private static deriveKey(address: string, secret?: string): string {
    // Use address + optional secret to derive a key
    const baseKey = secret || 'ens-tools-encryption-key';
    const combined = `${address.toLowerCase()}-${baseKey}`;
    // Use SHA-256 to create a consistent 256-bit key
    return CryptoJS.SHA256(combined).toString();
  }

  /**
   * Encrypt data using AES-256
   */
  static encrypt(data: string, address: string, secret?: string): string {
    try {
      const key = this.deriveKey(address, secret);
      const encrypted = CryptoJS.AES.encrypt(data, key).toString();
      return encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data using AES-256
   */
  static decrypt(encryptedData: string, address: string, secret?: string): string {
    try {
      const key = this.deriveKey(address, secret);
      const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) {
        throw new Error('Decryption failed - invalid key or corrupted data');
      }
      
      return decryptedString;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt JSON object
   */
  static encryptJSON<T>(data: T, address: string, secret?: string): string {
    const jsonString = JSON.stringify(data);
    return this.encrypt(jsonString, address, secret);
  }

  /**
   * Decrypt and parse JSON object
   */
  static decryptJSON<T>(encryptedData: string, address: string, secret?: string): T {
    const decryptedString = this.decrypt(encryptedData, address, secret);
    return JSON.parse(decryptedString) as T;
  }
}

