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
  getUserConfig(address: string): UserConfig {
    try {
      const data = localStorage.getItem(`ens_config_${address}`);
      if (!data) {
        return this.setUserConfig(address, defaultConfig);
      }
      return JSON.parse(data);
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
      localStorage.setItem(`ens_config_${address}`, JSON.stringify(updatedConfig));
      return updatedConfig;
    } catch (error) {
      console.error('Error saving user config:', error);
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

