/**
 * ENS Marketplace Service
 * Specialized marketplace for ENS domain trading via Seaport
 */

import { SeaportService } from './seaport-service';
import { feeCollectionService } from './fee-collection-service';
import { Address } from 'viem';
import { ENS_ADDRESSES } from '../ens/ens-addresses';

export interface ENSListing {
  id: string;
  name: string;
  namehash: string;
  tokenId: string;
  seller: string;
  price: string;
  currency: string;
  expiryDate: Date | null;
  registrationDate: Date | null;
  isWrapped: boolean;
  fuses: number;
  resolver: string | null;
  resolvedAddress: string | null;
  listingDate: string;
  expirationDate?: string;
  status: 'active' | 'sold' | 'cancelled' | 'expired';
}

export interface ENSOffer {
  id: string;
  name: string;
  namehash: string;
  tokenId: string;
  buyer: string;
  price: string;
  currency: string;
  offerDate: string;
  expirationDate?: string;
  status: 'active' | 'accepted' | 'cancelled' | 'expired';
}

export interface ENSCollectionStats {
  totalDomains: number;
  listedDomains: number;
  floorPrice: string;
  totalVolume: string;
  averagePrice: string;
  totalSales: number;
  activeOffers: number;
}

export class ENSMarketplaceService {
  private seaportService: SeaportService | null = null;
  private readonly openseaApiUrl = 'https://api.opensea.io/api/v2';

  /**
   * Initialize Seaport service for ENS trading
   */
  initializeSeaport(publicClient: any, walletClient: any, chainId: number) {
    this.seaportService = new SeaportService(publicClient, walletClient, chainId);
  }

  /**
   * Search for ENS domains by name
   */
  async searchDomains(query: string, chainId: number = 1): Promise<ENSListing[]> {
    try {
      const chain = this.getChainName(chainId);
      const url = `${this.openseaApiUrl}/chain/${chain}/collection/ens/nfts?search=${encodeURIComponent(query)}`;
      
      const response = await fetch(url, {
        headers: {
          'X-API-KEY': process.env.VITE_OPENSEA_API_KEY || '',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ENS domains: ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformENSListings(data.nfts || [], query);
    } catch (error) {
      console.error('Error searching ENS domains:', error);
      return [];
    }
  }

  /**
   * Get active listings for ENS domains
   */
  async getActiveListings(chainId: number = 1): Promise<ENSListing[]> {
    try {
      const chain = this.getChainName(chainId);
      const url = `${this.openseaApiUrl}/chain/${chain}/collection/ens/listings?limit=50`;
      
      const response = await fetch(url, {
        headers: {
          'X-API-KEY': process.env.VITE_OPENSEA_API_KEY || '',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch listings: ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformENSListings(data.listings || []);
    } catch (error) {
      console.error('Error fetching ENS listings:', error);
      // Fallback to The Graph subgraph
      return this.fetchListingsFromGraph();
    }
  }

  /**
   * Get active offers for ENS domains
   */
  async getActiveOffers(chainId: number = 1): Promise<ENSOffer[]> {
    try {
      const chain = this.getChainName(chainId);
      const url = `${this.openseaApiUrl}/chain/${chain}/collection/ens/offers?limit=50`;
      
      const response = await fetch(url, {
        headers: {
          'X-API-KEY': process.env.VITE_OPENSEA_API_KEY || '',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch offers: ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformENSOffers(data.offers || []);
    } catch (error) {
      console.error('Error fetching ENS offers:', error);
      return [];
    }
  }

  /**
   * Create a listing for an ENS domain
   */
  async createDomainListing(params: {
    name: string;
    namehash: string;
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
    const ensAddresses = ENS_ADDRESSES[params.chainId as keyof typeof ENS_ADDRESSES] || ENS_ADDRESSES[1];
    
    // Get fee collection config for marketplace fees
    const feeConfig = feeCollectionService['config'];
    const feeRecipient = feeConfig.contractAddress !== '0x0000000000000000000000000000000000000000' 
      ? feeConfig.contractAddress 
      : undefined;
    const feeBps = feeConfig.marketplaceFeeBps || 250; // Default 2.5%
    
    const orderParameters = await this.seaportService!.createERC721ListingOrder({
      offerer: address[0],
      tokenAddress: ensAddresses.nameWrapper as `0x${string}`,
      tokenId: params.tokenId,
      price: params.price,
      feeRecipient,
      feeBps: feeRecipient ? feeBps : undefined,
    });

    return orderParameters;
  }

  /**
   * Create an offer for an ENS domain
   */
  async createDomainOffer(params: {
    name: string;
    namehash: string;
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
    const ensAddresses = ENS_ADDRESSES[params.chainId as keyof typeof ENS_ADDRESSES] || ENS_ADDRESSES[1];
    
    // Get fee collection config for marketplace fees
    const feeConfig = feeCollectionService['config'];
    const feeRecipient = feeConfig.contractAddress !== '0x0000000000000000000000000000000000000000' 
      ? feeConfig.contractAddress 
      : undefined;
    const feeBps = feeConfig.marketplaceFeeBps || 250; // Default 2.5%
    
    const orderParameters = await this.seaportService!.createERC721OfferOrder({
      offerer: address[0],
      tokenAddress: ensAddresses.nameWrapper as `0x${string}`,
      tokenId: params.tokenId,
      price: params.price,
      feeRecipient,
      feeBps: feeRecipient ? feeBps : undefined,
    });

    return orderParameters;
  }

  /**
   * Buy an ENS domain from a listing
   */
  async buyDomain(order: any, publicClient: any, walletClient: any, chainId: number): Promise<string> {
    if (!this.seaportService) {
      this.initializeSeaport(publicClient, walletClient, chainId);
    }

    const encodedOrder = this.seaportService!.formatOrder(order);
    const hash = await this.seaportService!.fulfillOrder(encodedOrder);
    return hash;
  }

  /**
   * Get collection statistics for ENS
   */
  async getCollectionStats(chainId: number = 1): Promise<ENSCollectionStats> {
    try {
      const chain = this.getChainName(chainId);
      const url = `${this.openseaApiUrl}/chain/${chain}/collection/ens/stats`;
      
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
      console.error('Error fetching ENS stats:', error);
      return this.fetchStatsFromGraph();
    }
  }

  /**
   * Fetch stats from The Graph subgraph
   */
  private async fetchStatsFromGraph(): Promise<ENSCollectionStats> {
    try {
      const GRAPH_URL = 'https://api.thegraph.com/subgraphs/name/ensdomains/ens';
      
      const query = `
        query GetENSStats {
          domains(first: 1) {
            id
          }
          _meta {
            block {
              number
            }
          }
        }
      `;

      const response = await fetch(GRAPH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const result = await response.json();
      
      // Get actual count from OpenSea if possible
      const openseaStats = await this.fetchOpenSeaStats();
      
      return {
        totalDomains: openseaStats.totalDomains || 2000000,
        listedDomains: openseaStats.listedDomains || 0,
        floorPrice: openseaStats.floorPrice || '0.01',
        totalVolume: openseaStats.totalVolume || '0',
        averagePrice: openseaStats.averagePrice || '0',
        totalSales: openseaStats.totalSales || 0,
        activeOffers: openseaStats.activeOffers || 0,
      };
    } catch (error) {
      console.error('Error fetching stats from Graph:', error);
      return {
        totalDomains: 0,
        listedDomains: 0,
        floorPrice: '0',
        totalVolume: '0',
        averagePrice: '0',
        totalSales: 0,
        activeOffers: 0,
      };
    }
  }

  /**
   * Fetch OpenSea stats
   */
  private async fetchOpenSeaStats(): Promise<Partial<ENSCollectionStats>> {
    try {
      const url = `${this.openseaApiUrl}/chain/ethereum/collection/ens/stats`;
      const response = await fetch(url, {
        headers: {
          'X-API-KEY': process.env.VITE_OPENSEA_API_KEY || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return this.transformStats(data);
      }
    } catch (error) {
      console.error('Error fetching OpenSea stats:', error);
    }
    return {};
  }

  /**
   * Check if domain is available for listing
   */
  async checkDomainAvailability(name: string, owner: string, publicClient: any): Promise<boolean> {
    try {
      // Check if user owns the domain
      const normalizedName = name.toLowerCase().trim();
      const namehash = await publicClient.getEnsText({
        name: normalizedName,
        key: 'eth',
      });

      return !!namehash;
    } catch (error) {
      console.error('Error checking domain availability:', error);
      return false;
    }
  }

  /**
   * Get domain details
   */
  async getDomainDetails(name: string, publicClient: any): Promise<any> {
    try {
      const normalizedName = name.toLowerCase().trim();
      
      const [address, expiry, resolver] = await Promise.all([
        publicClient.getEnsAddress({ name: normalizedName }),
        publicClient.getEnsExpiry({ name: normalizedName }),
        publicClient.getEnsResolver({ name: normalizedName }),
      ]);

      return {
        name: normalizedName,
        address,
        expiry,
        resolver,
      };
    } catch (error) {
      console.error('Error getting domain details:', error);
      return null;
    }
  }

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

  private transformENSListings(data: any[], query?: string): ENSListing[] {
    return data
      .filter((item: any) => {
        if (!query) return true;
        const name = item.name || item.identifier || '';
        return name.toLowerCase().includes(query.toLowerCase());
      })
      .map((item: any) => ({
        id: item.identifier || item.token_id || '',
        name: item.name || item.identifier || '',
        namehash: item.namehash || '',
        tokenId: item.token_id || item.identifier || '',
        seller: item.seller?.address || '',
        price: item.current_price || item.starting_price || '0',
        currency: item.payment_token?.symbol || 'ETH',
        expiryDate: item.expiry_date ? new Date(item.expiry_date) : null,
        registrationDate: item.registration_date ? new Date(item.registration_date) : null,
        isWrapped: item.is_wrapped || false,
        fuses: item.fuses || 0,
        resolver: item.resolver || null,
        resolvedAddress: item.resolved_address || null,
        listingDate: item.listing_time || new Date().toISOString(),
        expirationDate: item.expiration_time,
        status: item.order_status === 'fulfilled' ? 'sold' : 'active',
      }));
  }

  private transformENSOffers(data: any[]): ENSOffer[] {
    return data.map((item: any) => ({
      id: item.identifier || item.token_id || '',
      name: item.name || item.identifier || '',
      namehash: item.namehash || '',
      tokenId: item.token_id || item.identifier || '',
      buyer: item.maker?.address || '',
      price: item.current_price || item.base_price || '0',
      currency: item.payment_token?.symbol || 'ETH',
      offerDate: item.created_date || new Date().toISOString(),
      expirationDate: item.expiration_time,
      status: item.order_status === 'fulfilled' ? 'accepted' : 'active',
    }));
  }

  private transformStats(data: any): ENSCollectionStats {
    return {
      totalDomains: data.total_supply || 0,
      listedDomains: data.num_listed || 0,
      floorPrice: data.floor_price || '0',
      totalVolume: data.total_volume || '0',
      averagePrice: data.average_price || '0',
      totalSales: data.total_sales || 0,
      activeOffers: data.num_offers || 0,
    };
  }

  /**
   * Fetch ENS listings from The Graph subgraph
   */
  private async fetchListingsFromGraph(): Promise<ENSListing[]> {
    try {
      const GRAPH_URL = 'https://api.thegraph.com/subgraphs/name/ensdomains/ens';
      
      const query = `
        query GetRecentDomains {
          domains(
            first: 50
            orderBy: createdAt
            orderDirection: desc
            where: { owner_not: "0x0000000000000000000000000000000000000000" }
          ) {
            id
            name
            labelName
            labelhash
            createdAt
            expiryDate
            owner {
              id
            }
            resolvedAddress {
              id
            }
            registration {
              id
              expiryDate
              registrationDate
            }
            wrappedDomain {
              id
              expiryDate
              fuses
            }
          }
        }
      `;

      const response = await fetch(GRAPH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const result = await response.json();
      
      if (result.errors) {
        console.error('GraphQL errors:', result.errors);
        return [];
      }

      const domains = result.data?.domains || [];
      
      return domains.map((domain: any, index: number) => {
        let expiryDate = null;
        if (domain.wrappedDomain?.expiryDate) {
          expiryDate = new Date(parseInt(domain.wrappedDomain.expiryDate) * 1000);
        } else if (domain.registration?.expiryDate) {
          expiryDate = new Date(parseInt(domain.registration.expiryDate) * 1000);
        } else if (domain.expiryDate) {
          expiryDate = new Date(parseInt(domain.expiryDate) * 1000);
        }

        let registrationDate = null;
        if (domain.registration?.registrationDate) {
          registrationDate = new Date(parseInt(domain.registration.registrationDate) * 1000);
        } else if (domain.createdAt) {
          registrationDate = new Date(parseInt(domain.createdAt) * 1000);
        }

        return {
          id: domain.id,
          name: domain.name,
          namehash: domain.labelhash || '',
          tokenId: domain.id,
          seller: domain.owner.id,
          price: '0', // No listing price - these are registered domains
          currency: 'ETH',
          expiryDate,
          registrationDate,
          isWrapped: !!domain.wrappedDomain,
          fuses: domain.wrappedDomain?.fuses || 0,
          resolver: null,
          resolvedAddress: domain.resolvedAddress?.id || null,
          listingDate: new Date().toISOString(),
          status: 'active' as const,
        };
      });
    } catch (error) {
      console.error('Error fetching from The Graph:', error);
      return [];
    }
  }

}

export const ensMarketplaceService = new ENSMarketplaceService();

