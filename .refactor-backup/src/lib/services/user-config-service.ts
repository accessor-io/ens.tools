import { EncryptionService } from '../security/encryption-service';

export interface UserConfig {
  displayOptions: {
    theme: 'light' | 'dark' | 'auto';
    compactMode: boolean;
    showAdvanced: boolean;
    refreshInterval: number;
  };
  domainGroups: {
    id: string;
    name: string;
    color: string;
    description?: string;
  }[];
  domainAssignments: {
    domainName: string;
    groupId: string | null;
    project: string | null;
    notes?: string;
  }[];
  auditLogEnabled: boolean;
  auditLogMaxEntries: number;
  notifications: {
    enabled: boolean;
    emailEnabled: boolean;
    webhookEnabled: boolean;
    onExpiration: boolean;
    onSecurityEvents: boolean;
    onMetadataChanges: boolean;
    onFailedTransactions: boolean;
  };
  lastUpdated: number;
}

const defaultConfig: UserConfig = {
  displayOptions: {
    theme: 'light',
    compactMode: false,
    showAdvanced: false,
    refreshInterval: 30000,
  },
  domainGroups: [
    { id: 'personal', name: 'Personal', color: 'blue' },
    { id: 'work', name: 'Work', color: 'purple' },
    { id: 'projects', name: 'Projects', color: 'green' },
  ],
  domainAssignments: [],
  auditLogEnabled: true,
  auditLogMaxEntries: 1000,
  notifications: {
    enabled: true,
    emailEnabled: false,
    webhookEnabled: false,
    onExpiration: true,
    onSecurityEvents: true,
    onMetadataChanges: false,
    onFailedTransactions: true,
  },
  lastUpdated: Date.now(),
};

class UserConfigService {
  private getStorageKey(address: string): string {
    return `ens_config_${address.toLowerCase()}`;
  }

  private getEncryptionSecret(): string | undefined {
    // Try to get a user-specific secret from localStorage
    // In a more secure implementation, this could be derived from the wallet signature
    const stored = localStorage.getItem('ens_config_encryption_secret');
    if (stored) {
      return stored;
    }
    // Generate and store a new secret for this session
    const secret = crypto.getRandomValues(new Uint8Array(32))
      .reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '');
    localStorage.setItem('ens_config_encryption_secret', secret);
    return secret;
  }

  getUserConfig(address: string): UserConfig {
    try {
      const storageKey = this.getStorageKey(address);
      const encryptedData = localStorage.getItem(storageKey);
      
      if (!encryptedData) {
        return this.setUserConfig(address, defaultConfig);
      }

      // Try to decrypt - if it fails, might be old unencrypted format
      try {
        const secret = this.getEncryptionSecret();
        return EncryptionService.decryptJSON<UserConfig>(encryptedData, address, secret);
      } catch (decryptError) {
        // Fallback: try parsing as plain JSON (for migration from unencrypted data)
        try {
          const parsed = JSON.parse(encryptedData);
          // If successful, re-encrypt with new format
          if (parsed && typeof parsed === 'object') {
            return this.setUserConfig(address, parsed as UserConfig);
          }
        } catch (parseError) {
          console.error('Failed to parse config:', parseError);
        }
        // If all else fails, return default
        console.warn('Failed to decrypt user config, using default');
        return defaultConfig;
      }
    } catch (error) {
      console.error('Error loading user config:', error);
      return defaultConfig;
    }
  }

  setUserConfig(address: string, config: UserConfig): UserConfig {
    try {
      const updatedConfig = {
        ...config,
        lastUpdated: Date.now(),
      };
      
      const secret = this.getEncryptionSecret();
      const encrypted = EncryptionService.encryptJSON(updatedConfig, address, secret);
      
      const storageKey = this.getStorageKey(address);
      localStorage.setItem(storageKey, encrypted);
      
      return updatedConfig;
    } catch (error) {
      console.error('Error saving user config:', error);
      // Fallback to unencrypted storage if encryption fails
      try {
        const storageKey = this.getStorageKey(address);
        localStorage.setItem(storageKey, JSON.stringify(updatedConfig));
      } catch (fallbackError) {
        console.error('Fallback save also failed:', fallbackError);
      }
      return config;
    }
  }

  updateUserConfig(address: string, updates: Partial<UserConfig>): UserConfig {
    const currentConfig = this.getUserConfig(address);
    const updatedConfig = {
      ...currentConfig,
      ...updates,
      lastUpdated: Date.now(),
    };
    return this.setUserConfig(address, updatedConfig);
  }

  deleteUserConfig(address: string): void {
    localStorage.removeItem(`ens_config_${address}`);
  }

  getAllUserAddresses(): string[] {
    const addresses: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ens_config_')) {
        addresses.push(key.replace('ens_config_', ''));
      }
    }
    return addresses;
  }
}

export const userConfigService = new UserConfigService();

