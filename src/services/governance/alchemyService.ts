// Alchemy API service for fetching detailed transaction information
// Uses Kiln dashboard API endpoints via Alchemy

const ALCHEMY_API_KEY = (import.meta as any).env?.VITE_ALCHEMY_API_KEY || '8nt9-doWu70XyYyAg5ECE2W2zTKQhmvW';
const ALCHEMY_API_URL = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
const PROXY_API_URL = '/api/alchemy';

export interface AlchemyTransfer {
  hash: string;
  from: string;
  to: string;
  value: number;
  asset: string;
  category: string;
  blockNum: string;
  blockTimestamp?: string;
  uniqueId: string;
  erc721TokenId?: string | null;
  erc1155Metadata?: any | null;
  tokenId?: string | null;
  rawContract?: {
    value: string;
    address: string | null;
    decimal: string;
  };
  metadata?: {
    blockTimestamp?: string;
    blockNumber?: string;
    logIndex?: number;
    [key: string]: any;
  };
}

export interface AlchemyTransactionDetails {
  hash: string;
  blockNumber: string;
  blockTimestamp: string;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  gasPrice: string;
  status: number;
  input: string;
  nonce: number;
  transactionIndex: number;
  logs?: any[];
  transfers?: AlchemyTransfer[];
}

export interface TransactionFlow {
  transactionHash: string;
  from: string;
  to: string;
  value: number;
  asset: string;
  timestamp: string;
  blockNumber: number;
  transfers: AlchemyTransfer[];
  details?: AlchemyTransactionDetails;
}

class AlchemyService {
  private cachePrefix = 'alchemy_cache_';
  private cacheExpiry = 365 * 24 * 60 * 60 * 1000; // 1 year (historical data doesn't change)

  private getCacheKey(address: string, direction: string, pageKey?: string): string {
    return `${this.cachePrefix}${address}_${direction}${pageKey ? `_${pageKey}` : ''}`;
  }

  private getCachedData<T>(key: string): T | null {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;
      
      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();
      
      if (now - timestamp > this.cacheExpiry) {
        localStorage.removeItem(key);
        return null;
      }
      
      return data as T;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }

  private setCachedData<T>(key: string, data: T): void {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(cacheEntry));
    } catch (error) {
      console.error('Error writing cache:', error);
      // If storage is full, try to clear old entries
      try {
        this.clearOldCacheEntries();
        localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
      } catch (e) {
        console.error('Failed to write cache after cleanup:', e);
      }
    }
  }

  private clearOldCacheEntries(): void {
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();
      
      keys.forEach(key => {
        if (key.startsWith(this.cachePrefix)) {
          try {
            const cached = localStorage.getItem(key);
            if (cached) {
              const { timestamp } = JSON.parse(cached);
              if (now - timestamp > this.cacheExpiry) {
                localStorage.removeItem(key);
              }
            }
          } catch (e) {
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.error('Error clearing old cache entries:', error);
    }
  }

  private async fetchAlchemyAPI(method: string, params: any[]): Promise<any> {
    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method,
      params
    };

    const executeRequest = async (url: string) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`Alchemy API error: ${JSON.stringify(data.error)}`);
      }

      return data.result;
    };

    try {
      // Prefer the local proxy to avoid browser CORS and to keep API key private when available
      return await executeRequest(PROXY_API_URL);
    } catch (proxyError) {
      console.warn('Proxy API request failed, falling back to direct Alchemy API endpoint.', proxyError);
      // Fall back to direct Alchemy API call (browser fetch) if the local proxy is unavailable
      return await executeRequest(ALCHEMY_API_URL);
    }
  }

  async getAssetTransfers(address: string, direction: 'from' | 'to' | 'both' = 'both', maxTransfers: number = 10000): Promise<AlchemyTransfer[]> {
    // Check cache first
    const cacheKey = this.getCacheKey(address.toLowerCase(), direction);
    const cached = this.getCachedData<AlchemyTransfer[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const transfers: AlchemyTransfer[] = [];
    let pageKey: string | null = null;
    const maxCount = 1000; // Full API capacity

    do {
      const params: any = {
        fromBlock: '0x0',
        toBlock: 'latest',
        category: ['external', 'erc20', 'erc721', 'erc1155'],
        withMetadata: true,
        excludeZeroValue: false,
        maxCount: `0x${maxCount.toString(16)}`
      };

      if (direction === 'from' || direction === 'both') {
        params.fromAddress = address;
      }
      if (direction === 'to' || direction === 'both') {
        params.toAddress = address;
      }

      if (pageKey) {
        params.pageKey = pageKey;
      }

      const result = await this.fetchAlchemyAPI('alchemy_getAssetTransfers', [params]);

      if (result?.transfers) {
        transfers.push(...result.transfers);
        pageKey = result.pageKey || null;
      } else {
        pageKey = null;
      }
    } while (pageKey && transfers.length < maxTransfers);

    // Cache the results
    this.setCachedData(cacheKey, transfers);

    return transfers;
  }

  // Batch fetch transfers for multiple addresses
  async getBatchAssetTransfers(addresses: string[], direction: 'from' | 'to' | 'both' = 'both'): Promise<Map<string, AlchemyTransfer[]>> {
    const results = new Map<string, AlchemyTransfer[]>();
    
    // Process in parallel for speed
    await Promise.all(
      addresses.map(async (address) => {
        try {
          const transfers = await this.getAssetTransfers(address, direction, 5000);
          results.set(address.toLowerCase(), transfers);
        } catch (error) {
          console.error(`Error fetching transfers for ${address}:`, error);
          results.set(address.toLowerCase(), []);
        }
      })
    );

    return results;
  }

  async getTransactionDetails(txHash: string): Promise<AlchemyTransactionDetails | null> {
    try {
      const [txResult, receiptResult] = await Promise.all([
        this.fetchAlchemyAPI('eth_getTransactionByHash', [txHash]),
        this.fetchAlchemyAPI('eth_getTransactionReceipt', [txHash])
      ]);

      if (!txResult) {
        return null;
      }

      const blockNumber = parseInt(txResult.blockNumber, 16);
      const blockResult = await this.fetchAlchemyAPI('eth_getBlockByNumber', [
        txResult.blockNumber,
        false
      ]);

      return {
        hash: txResult.hash,
        blockNumber: txResult.blockNumber,
        blockTimestamp: blockResult?.timestamp || '0x0',
        from: txResult.from,
        to: txResult.to || '',
        value: txResult.value,
        gasUsed: receiptResult?.gasUsed || '0x0',
        gasPrice: txResult.gasPrice || '0x0',
        status: receiptResult?.status ? parseInt(receiptResult.status, 16) : 1,
        input: txResult.input,
        nonce: parseInt(txResult.nonce, 16),
        transactionIndex: parseInt(txResult.transactionIndex, 16),
        logs: receiptResult?.logs || []
      };
    } catch (error) {
      console.error(`Error fetching transaction details for ${txHash}:`, error);
      return null;
    }
  }

  async getTransactionFlow(txHash: string): Promise<TransactionFlow | null> {
    try {
      const details = await this.getTransactionDetails(txHash);
      if (!details) {
        return null;
      }

      const transfers = await this.getAssetTransfersForTransaction(txHash);

      const blockTimestamp = details.blockTimestamp 
        ? new Date(parseInt(details.blockTimestamp, 16) * 1000).toISOString()
        : new Date().toISOString();

      const totalValue = transfers.reduce((sum, t) => sum + (t.value || 0), 0);

      return {
        transactionHash: txHash,
        from: details.from,
        to: details.to,
        value: totalValue,
        asset: transfers[0]?.asset || 'ETH',
        timestamp: blockTimestamp,
        blockNumber: parseInt(details.blockNumber, 16),
        transfers,
        details
      };
    } catch (error) {
      console.error(`Error fetching transaction flow for ${txHash}:`, error);
      return null;
    }
  }

  async getAssetTransfersForTransaction(txHash: string): Promise<AlchemyTransfer[]> {
    try {
      const params = {
        fromBlock: '0x0',
        toBlock: 'latest',
        category: ['external', 'erc20', 'erc721', 'erc1155'],
        withMetadata: true,
        excludeZeroValue: false,
        maxCount: '0x3e8'
      };

      const result = await this.fetchAlchemyAPI('alchemy_getAssetTransfers', [params]);

      if (!result?.transfers) {
        return [];
      }

      return result.transfers.filter((t: any) => t.hash && t.hash.toLowerCase() === txHash.toLowerCase());
    } catch (error) {
      console.error(`Error fetching transfers for transaction ${txHash}:`, error);
      return [];
    }
  }

  async getAddressTransactions(address: string, limit: number = 100): Promise<AlchemyTransfer[]> {
    const transfers = await this.getAssetTransfers(address, 'both');
    return transfers.slice(0, limit);
  }

  async getAddressSpending(address: string): Promise<{
    totalSent: number;
    totalReceived: number;
    transactionCount: number;
    byAsset: Record<string, { sent: number; received: number }>;
  }> {
    const transfers = await this.getAssetTransfers(address, 'both');
    
    const result = {
      totalSent: 0,
      totalReceived: 0,
      transactionCount: new Set(transfers.map(t => t.hash)).size,
      byAsset: {} as Record<string, { sent: number; received: number }>
    };

    const addressLower = address.toLowerCase();

    transfers.forEach(transfer => {
      const asset = transfer.asset || 'ETH';
      const value = transfer.value || 0;

      if (!result.byAsset[asset]) {
        result.byAsset[asset] = { sent: 0, received: 0 };
      }

      if (transfer.from.toLowerCase() === addressLower) {
        result.totalSent += value;
        result.byAsset[asset].sent += value;
      }

      if (transfer.to.toLowerCase() === addressLower) {
        result.totalReceived += value;
        result.byAsset[asset].received += value;
      }
    });

    return result;
  }

  async getAddressTransfersToRecipient(recipientAddress: string, fromAddresses: string[], limit: number = 1000): Promise<{
    transfers: AlchemyTransfer[];
    bySender: Record<string, { transfers: AlchemyTransfer[]; totalValue: number; count: number }>;
  }> {
    const recipientLower = recipientAddress.toLowerCase();
    const fromAddressesLower = fromAddresses.map(a => a.toLowerCase());
    const allTransfers: AlchemyTransfer[] = [];
    
    const params: any = {
      fromBlock: '0x0',
      toBlock: 'latest',
      toAddress: recipientAddress,
      category: ['external', 'erc20', 'erc721', 'erc1155'],
      withMetadata: true,
      excludeZeroValue: false,
      maxCount: `0x${limit.toString(16)}`
    };

    const result = await this.fetchAlchemyAPI('alchemy_getAssetTransfers', [params]);
    
    if (result?.transfers) {
      const relevantTransfers = result.transfers.filter((t: any) => {
        const fromLower = (t.from || '').toLowerCase();
        return fromAddressesLower.includes(fromLower) && 
               (t.to || '').toLowerCase() === recipientLower;
      });
      allTransfers.push(...relevantTransfers);
    }

    const bySender: Record<string, { transfers: AlchemyTransfer[]; totalValue: number; count: number }> = {};
    
    allTransfers.forEach(transfer => {
      const sender = transfer.from.toLowerCase();
      if (!bySender[sender]) {
        bySender[sender] = { transfers: [], totalValue: 0, count: 0 };
      }
      bySender[sender].transfers.push(transfer);
      bySender[sender].totalValue += transfer.value || 0;
      bySender[sender].count += 1;
    });

    return {
      transfers: allTransfers.slice(0, limit),
      bySender
    };
  }

  async getMultipleAddressesSpending(addresses: string[]): Promise<Record<string, {
    totalSent: number;
    totalReceived: number;
    transactionCount: number;
  }>> {
    const results: Record<string, {
      totalSent: number;
      totalReceived: number;
      transactionCount: number;
    }> = {};

    await Promise.all(addresses.map(async (address) => {
      try {
        const spending = await this.getAddressSpending(address);
        results[address.toLowerCase()] = {
          totalSent: spending.totalSent,
          totalReceived: spending.totalReceived,
          transactionCount: spending.transactionCount
        };
      } catch (error) {
        console.error(`Error fetching spending for ${address}:`, error);
        results[address.toLowerCase()] = {
          totalSent: 0,
          totalReceived: 0,
          transactionCount: 0
        };
      }
    }));

    return results;
  }
}

export const alchemyService = new AlchemyService();

