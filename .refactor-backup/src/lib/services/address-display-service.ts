export type AddressDisplayFormat = 'full' | 'abbreviated' | 'ens-name';

export interface AddressDisplayConfig {
  format: AddressDisplayFormat;
  resolveENS: boolean;
}

class AddressDisplayService {
  private config: AddressDisplayConfig = {
    format: 'abbreviated',
    resolveENS: true,
  };

  private ensCache: Map<string, string> = new Map();

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    const saved = localStorage.getItem('addressDisplayConfig');
    if (saved) {
      try {
        this.config = { ...this.config, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to load address display config:', e);
      }
    }
  }

  saveConfig(config: Partial<AddressDisplayConfig>) {
    this.config = { ...this.config, ...config };
    localStorage.setItem('addressDisplayConfig', JSON.stringify(this.config));
  }

  getConfig(): AddressDisplayConfig {
    return { ...this.config };
  }

  formatAddress(address: string, ensName?: string | null): string {
    if (!address) return '';

    switch (this.config.format) {
      case 'full':
        return address;
      case 'ens-name':
        if (this.config.resolveENS && ensName) {
          return ensName;
        }
        return this.abbreviateAddress(address);
      case 'abbreviated':
      default:
        return this.abbreviateAddress(address);
    }
  }

  private abbreviateAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  setENSName(address: string, ensName: string) {
    this.ensCache.set(address.toLowerCase(), ensName);
  }

  getENSName(address: string): string | undefined {
    return this.ensCache.get(address.toLowerCase());
  }

  clearCache() {
    this.ensCache.clear();
  }
}

export const addressDisplayService = new AddressDisplayService();

