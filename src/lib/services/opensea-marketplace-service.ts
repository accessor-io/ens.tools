/**
 * OpenSea Marketplace Service
 * Integrates with OpenSea's Seaport protocol for NFT and ENS domain trading
 */

import { Abi } from 'viem';
import { SeaportService } from './seaport-service';
import { signSeaportOrder, verifySeaportOrderSignature, encodeOrder } from './seaport-signer';

// Seaport Contract ABI - Core functions for marketplace operations
export const SEAPORT_ABI = [
  {
    name: 'fulfillBasicOrder',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'parameters',
        type: 'tuple',
        components: [
          { name: 'considerationToken', type: 'address' },
          { name: 'considerationIdentifier', type: 'uint256' },
          { name: 'considerationAmount', type: 'uint256' },
          { name: 'offerer', type: 'address' },
          { name: 'zone', type: 'address' },
          { name: 'offerToken', type: 'address' },
          { name: 'offerIdentifier', type: 'uint256' },
          { name: 'offerAmount', type: 'uint256' },
          { name: 'basicOrderType', type: 'uint8' },
          { name: 'startTime', type: 'uint256' },
          { name: 'endTime', type: 'uint256' },
          { name: 'zoneHash', type: 'bytes32' },
          { name: 'salt', type: 'uint256' },
          { name: 'offererConduitKey', type: 'bytes32' },
          { name: 'fulfillerConduitKey', type: 'bytes32' },
          { name: 'totalOriginalAdditionalRecipients', type: 'uint256' },
          { name: 'additionalRecipients', type: 'tuple[]' },
          { name: 'signature', type: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: 'fulfilled', type: 'bool' }],
  },
  {
    name: 'fulfillOrder',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'order',
        type: 'tuple',
        components: [
          { name: 'parameters', type: 'tuple' },
          { name: 'signature', type: 'bytes' },
        ],
      },
      { name: 'fulfillerConduitKey', type: 'bytes32' },
    ],
    outputs: [{ name: 'fulfilled', type: 'bool' }],
  },
  {
    name: 'getOrderStatus',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'orderHash', type: 'bytes32' }],
    outputs: [
      { name: 'isValidated', type: 'bool' },
      { name: 'isCancelled', type: 'bool' },
      { name: 'totalFilled', type: 'uint256' },
      { name: 'totalSize', type: 'uint256' },
    ],
  },
  {
    name: 'matchOrders',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'orders',
        type: 'tuple[]',
        components: [
          { name: 'parameters', type: 'tuple' },
          { name: 'signature', type: 'bytes' },
        ],
      },
      { name: 'fulfillments', type: 'tuple[]' },
    ],
    outputs: [{ name: 'fulfilled', type: 'bool[]' }],
  },
] as const satisfies Abi;

// ERC-721 NFT Standard ABI
export const ERC721_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'setApprovalForAll',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' },
    ],
    outputs: [],
  },
  {
    name: 'getApproved',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'isApprovedForAll',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'operator', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
] as const satisfies Abi;

// Seaport v1.5 contract addresses
export const SEAPORT_CONTRACTS = {
  mainnet: '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC',
  sepolia: '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC',
  optimism: '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC',
  base: '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC',
  arbitrum: '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC',
} as const;

export interface Listing {
  id: string;
  tokenAddress: string;
  tokenId: string;
  tokenName: string;
  tokenImage?: string;
  seller: string;
  price: string;
  currency: string;
  platform: 'opensea' | 'looksrare' | 'blur' | 'other';
  listingDate: string;
  expirationDate?: string;
  status: 'active' | 'sold' | 'cancelled' | 'expired';
  isENS?: boolean;
  ensName?: string;
}

export interface Offer {
  id: string;
  tokenAddress: string;
  tokenId: string;
  tokenName: string;
  tokenImage?: string;
  buyer: string;
  price: string;
  currency: string;
  offerDate: string;
  expirationDate?: string;
  status: 'active' | 'accepted' | 'cancelled' | 'expired';
  isENS?: boolean;
  ensName?: string;
}

export interface CollectionStats {
  floorPrice: string;
  totalVolume: string;
  totalSales: number;
  owners: number;
  items: number;
  listedCount: number;
  avgPrice: string;
}

export class OpenSeaMarketplaceService {
  private readonly openseaApiUrl = 'https://api.opensea.io/api/v2';
  private readonly etherscanApiUrl = 'https://api.etherscan.io/api';
  private seaportService: SeaportService | null = null;

  /**
   * Fetch listings for a specific token contract
   */
  async getListings(tokenAddress: string, chainId: number = 1): Promise<Listing[]> {
    try {
      const chain = this.getChainName(chainId);
      const url = `${this.openseaApiUrl}/chain/${chain}/contract/${tokenAddress}/listings`;
      
      const response = await fetch(url, {
        headers: {
          'X-API-KEY': process.env.VITE_OPENSEA_API_KEY || '',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch listings: ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformListings(data.listings || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
      return this.getMockListings(tokenAddress);
    }
  }

  /**
   * Fetch offers for a specific token contract
   */
  async getOffers(tokenAddress: string, chainId: number = 1): Promise<Offer[]> {
    try {
      const chain = this.getChainName(chainId);
      const url = `${this.openseaApiUrl}/chain/${chain}/contract/${tokenAddress}/offers`;
      
      const response = await fetch(url, {
        headers: {
          'X-API-KEY': process.env.VITE_OPENSEA_API_KEY || '',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch offers: ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformOffers(data.offers || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
      return this.getMockOffers(tokenAddress);
    }
  }

  /**
   * Fetch collection statistics
   */
  async getCollectionStats(tokenAddress: string, chainId: number = 1): Promise<CollectionStats> {
    try {
      const chain = this.getChainName(chainId);
      const url = `${this.openseaApiUrl}/chain/${chain}/contract/${tokenAddress}/stats`;
      
      const response = await fetch(url, {
        headers: {
          'X-API-KEY': process.env.VITE_OPENSEA_API_KEY || '',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformStats(data);
    } catch (error) {
      console.error('Error fetching collection stats:', error);
      return this.getMockStats();
    }
  }

  /**
   * Check if Seaport marketplace is approved for a token
   */
  async checkApproval(
    publicClient: any,
    tokenAddress: string,
    owner: string,
    tokenId: string
  ): Promise<boolean> {
    try {
      const approvedAddress = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC721_ABI,
        functionName: 'getApproved',
        args: [BigInt(tokenId)],
      });

      const seaportAddress = SEAPORT_CONTRACTS.mainnet;
      return approvedAddress.toLowerCase() === seaportAddress.toLowerCase();
    } catch (error) {
      console.error('Error checking approval:', error);
      return false;
    }
  }

  /**
   * Approve Seaport marketplace for token trading
   */
  async approveMarketplace(
    walletClient: any,
    tokenAddress: string,
    tokenId: string
  ): Promise<string> {
    try {
      const seaportAddress = SEAPORT_CONTRACTS.mainnet;
      
      const hash = await walletClient.writeContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC721_ABI,
        functionName: 'approve',
        args: [seaportAddress as `0x${string}`, BigInt(tokenId)],
      });

      return hash;
    } catch (error) {
      console.error('Error approving marketplace:', error);
      throw error;
    }
  }

  /**
   * Approve marketplace for all tokens in a collection
   */
  async approveMarketplaceForAll(
    walletClient: any,
    tokenAddress: string
  ): Promise<string> {
    try {
      const seaportAddress = SEAPORT_CONTRACTS.mainnet;
      
      const hash = await walletClient.writeContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC721_ABI,
        functionName: 'setApprovalForAll',
        args: [seaportAddress as `0x${string}`, true],
      });

      return hash;
    } catch (error) {
      console.error('Error approving marketplace for all:', error);
      throw error;
    }
  }

  /**
   * Initialize Seaport service with clients
   */
  initializeSeaport(publicClient: any, walletClient: any, chainId: number) {
    this.seaportService = new SeaportService(publicClient, walletClient, chainId);
  }

  /**
   * Create a listing order for an NFT
   */
  async createListingOrder(params: {
    tokenAddress: string;
    tokenId: string;
    price: string;
    publicClient: any;
    walletClient: any;
    chainId: number;
  }): Promise<any> {
    if (!this.seaportService) {
      this.initializeSeaport(params.publicClient, params.walletClient, params.chainId);
    }

    const address = await params.walletClient.getAddresses();
    const orderParameters = await this.seaportService!.createERC721ListingOrder({
      offerer: address[0],
      tokenAddress: params.tokenAddress as `0x${string}`,
      tokenId: params.tokenId,
      price: params.price,
    });

    return orderParameters;
  }

  /**
   * Create an offer for an NFT
   */
  async createOffer(params: {
    tokenAddress: string;
    tokenId: string;
    price: string;
    publicClient: any;
    walletClient: any;
    chainId: number;
  }): Promise<any> {
    if (!this.seaportService) {
      this.initializeSeaport(params.publicClient, params.walletClient, params.chainId);
    }

    const address = await params.walletClient.getAddresses();
    const orderParameters = await this.seaportService!.createERC721OfferOrder({
      offerer: address[0],
      tokenAddress: params.tokenAddress as `0x${string}`,
      tokenId: params.tokenId,
      price: params.price,
    });

    return orderParameters;
  }

  /**
   * Fulfill an order (buy NFT from listing)
   */
  async fulfillOrder(order: any, publicClient: any, walletClient: any, chainId: number): Promise<string> {
    if (!this.seaportService) {
      this.initializeSeaport(publicClient, walletClient, chainId);
    }

    const encodedOrder = encodeOrder(order.parameters);
    encodedOrder.signature = order.signature;
    
    const hash = await this.seaportService!.fulfillOrder(encodedOrder);
    return hash;
  }

  /**
   * Check order status
   */
  async checkOrderStatus(orderHash: string, publicClient: any, chainId: number): Promise<any> {
    if (!this.seaportService) {
      this.initializeSeaport(publicClient, null, chainId);
    }

    return await this.seaportService!.getOrderStatus(orderHash);
  }

  /**
   * Cancel an order
   */
  async cancelOrder(order: any, publicClient: any, walletClient: any, chainId: number): Promise<string> {
    if (!this.seaportService) {
      this.initializeSeaport(publicClient, walletClient, chainId);
    }

    const orders = [order];
    const hash = await this.seaportService!.cancelOrders(orders);
    return hash;
  }

  /**
   * Fetch ENS domains listed on OpenSea
   */
  async getENSListings(chainId: number = 1): Promise<Listing[]> {
    try {
      const chain = this.getChainName(chainId);
      const url = `${this.openseaApiUrl}/chain/${chain}/collection/ens`;
      
      const response = await fetch(url, {
        headers: {
          'X-API-KEY': process.env.VITE_OPENSEA_API_KEY || '',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ENS listings: ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformListings(data.nfts || [], true);
    } catch (error) {
      console.error('Error fetching ENS listings:', error);
      return this.getMockENSListings();
    }
  }

  /**
   * Helper methods
   */
  private getChainName(chainId: number): string {
    const chainMap: Record<number, string> = {
      1: 'ethereum',
      5: 'goerli',
      11155111: 'sepolia',
      10: 'optimism',
      8453: 'base',
      42161: 'arbitrum',
    };
    return chainMap[chainId] || 'ethereum';
  }

  private transformListings(data: any[], isENS: boolean = false): Listing[] {
    return data.map((item: any) => ({
      id: item.identifier || item.token_id || '',
      tokenAddress: item.contract || item.address || '',
      tokenId: item.token_id || item.identifier || '',
      tokenName: item.name || `#${item.token_id}`,
      tokenImage: item.image_url || item.image || '',
      seller: item.seller?.address || '',
      price: item.current_price || item.starting_price || '0',
      currency: item.payment_token?.symbol || 'ETH',
      platform: 'opensea',
      listingDate: item.listing_time || new Date().toISOString(),
      expirationDate: item.expiration_time,
      status: item.order_status === 'fulfilled' ? 'sold' : 'active',
      isENS,
      ensName: isENS ? item.name : undefined,
    }));
  }

  private transformOffers(data: any[]): Offer[] {
    return data.map((item: any) => ({
      id: item.identifier || item.token_id || '',
      tokenAddress: item.contract || item.address || '',
      tokenId: item.token_id || item.identifier || '',
      tokenName: item.name || `#${item.token_id}`,
      tokenImage: item.image_url || item.image || '',
      buyer: item.maker?.address || '',
      price: item.current_price || item.base_price || '0',
      currency: item.payment_token?.symbol || 'ETH',
      offerDate: item.created_date || new Date().toISOString(),
      expirationDate: item.expiration_time,
      status: item.order_status === 'fulfilled' ? 'accepted' : 'active',
    }));
  }

  private transformStats(data: any): CollectionStats {
    return {
      floorPrice: data.floor_price || '0',
      totalVolume: data.total_volume || '0',
      totalSales: data.total_sales || 0,
      owners: data.num_owners || 0,
      items: data.total_supply || 0,
      listedCount: data.num_listed || 0,
      avgPrice: data.average_price || '0',
    };
  }

  private getMockListings(tokenAddress: string): Listing[] {
    return [
      {
        id: '1',
        tokenAddress,
        tokenId: '1234',
        tokenName: 'ENS Domain #1234',
        tokenImage: '',
        seller: '0x742d35Cc6634C0532925a3b844Bc9e7595f0f35a3',
        price: '0.5',
        currency: 'ETH',
        platform: 'opensea',
        listingDate: new Date().toISOString(),
        status: 'active',
      },
      {
        id: '2',
        tokenAddress,
        tokenId: '5678',
        tokenName: 'ENS Domain #5678',
        tokenImage: '',
        seller: '0x8a2f91b4Cc8C9A5E6B0c2D3e4F5a6B7c8D9e0F1a2',
        price: '1.2',
        currency: 'ETH',
        platform: 'opensea',
        listingDate: new Date().toISOString(),
        status: 'active',
      },
    ];
  }

  private getMockOffers(tokenAddress: string): Offer[] {
    return [
      {
        id: '1',
        tokenAddress,
        tokenId: '1234',
        tokenName: 'ENS Domain #1234',
        tokenImage: '',
        buyer: '0x9a2f91b4Cc8C9A5E6B0c2D3e4F5a6B7c8D9e0F1a2',
        price: '0.45',
        currency: 'ETH',
        offerDate: new Date().toISOString(),
        status: 'active',
      },
    ];
  }

  private getMockENSListings(): Listing[] {
    return [
      {
        id: '1',
        tokenAddress: '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85',
        tokenId: '123456789',
        tokenName: 'vitalik.eth',
        tokenImage: '',
        seller: '0x742d35Cc6634C0532925a3b844Bc9e7595f0f35a3',
        price: '25',
        currency: 'ETH',
        platform: 'opensea',
        listingDate: new Date().toISOString(),
        status: 'active',
        isENS: true,
        ensName: 'vitalik.eth',
      },
      {
        id: '2',
        tokenAddress: '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85',
        tokenId: '987654321',
        tokenName: 'company.eth',
        tokenImage: '',
        seller: '0x8a2f91b4Cc8C9A5E6B0c2D3e4F5a6B7c8D9e0F1a2',
        price: '15',
        currency: 'ETH',
        platform: 'opensea',
        listingDate: new Date().toISOString(),
        status: 'active',
        isENS: true,
        ensName: 'company.eth',
      },
    ];
  }

  private getMockStats(): CollectionStats {
    return {
      floorPrice: '0.01',
      totalVolume: '1250.5',
      totalSales: 1234,
      owners: 567,
      items: 10000,
      listedCount: 123,
      avgPrice: '1.02',
    };
  }
}

export const marketplaceService = new OpenSeaMarketplaceService();

