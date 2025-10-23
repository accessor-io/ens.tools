/**
 * Advanced Seaport Features
 * Collection offers, bundle orders, and partial fills
 */

import { SeaportService, SeaportOrderParameters } from './seaport-service';
import { Address } from 'viem';

export interface CollectionOfferParameters {
  offerer: Address;
  collectionAddress: Address;
  price: string; // in ETH per token
  recipient?: Address;
  startTime?: number;
  endTime?: number;
}

export interface BundleOrderParameters {
  offerer: Address;
  items: {
    tokenAddress: Address;
    tokenId: string;
  }[];
  price: string; // total price in ETH
  recipient?: Address;
  startTime?: number;
  endTime?: number;
}

export interface PartialFillParameters {
  orderHash: string;
  fillAmount: string; // amount to fill
}

export class SeaportAdvancedService {
  private seaportService: SeaportService;

  constructor(seaportService: SeaportService) {
    this.seaportService = seaportService;
  }

  /**
   * Create a collection-wide offer
   * This allows buying any token from a collection at a fixed price
   */
  async createCollectionOffer(params: CollectionOfferParameters): Promise<SeaportOrderParameters> {
    const counter = await this.seaportService.getCounter(params.offerer);
    const now = Math.floor(Date.now() / 1000);

    // For collection offers, we use identifierOrCriteria = 0 to match any token
    const orderParameters: SeaportOrderParameters = {
      offerer: params.offerer,
      zone: '0x0000000000000000000000000000000000000000',
      offer: [
        {
          itemType: 0, // Native ETH
          token: '0x0000000000000000000000000000000000000000',
          identifierOrCriteria: '0',
          startAmount: parseUnits(params.price, 18).toString(),
          endAmount: parseUnits(params.price, 18).toString(),
        },
      ],
      consideration: [
        {
          itemType: 2, // ERC721
          token: params.collectionAddress,
          identifierOrCriteria: '0', // 0 means any token in collection
          startAmount: '1',
          endAmount: '1',
          recipient: params.recipient || params.offerer,
        },
      ],
      orderType: 1, // Partial Open for collection offers
      startTime: (params.startTime || now).toString(),
      endTime: (params.endTime || now + 90 * 24 * 60 * 60).toString(),
      zoneHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      salt: Math.floor(Math.random() * 1000000000).toString(),
      conduitKey: '0x0000000000000000000000000000000000000000000000000000000000000000',
      totalOriginalConsiderationItems: 1,
      counter: counter.toString(),
    };

    return orderParameters;
  }

  /**
   * Create a bundle order to sell multiple NFTs together
   */
  async createBundleOrder(params: BundleOrderParameters): Promise<SeaportOrderParameters> {
    const counter = await this.seaportService.getCounter(params.offerer);
    const now = Math.floor(Date.now() / 1000);

    // Offer multiple items
    const offer = params.items.map(item => ({
      itemType: 2, // ERC721
      token: item.tokenAddress,
      identifierOrCriteria: item.tokenId,
      startAmount: '1',
      endAmount: '1',
    }));

    const orderParameters: SeaportOrderParameters = {
      offerer: params.offerer,
      zone: '0x0000000000000000000000000000000000000000',
      offer,
      consideration: [
        {
          itemType: 0, // Native ETH
          token: '0x0000000000000000000000000000000000000000',
          identifierOrCriteria: '0',
          startAmount: parseUnits(params.price, 18).toString(),
          endAmount: parseUnits(params.price, 18).toString(),
          recipient: params.recipient || params.offerer,
        },
      ],
      orderType: 0, // Full Open
      startTime: (params.startTime || now).toString(),
      endTime: (params.endTime || now + 90 * 24 * 60 * 60).toString(),
      zoneHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      salt: Math.floor(Math.random() * 1000000000).toString(),
      conduitKey: '0x0000000000000000000000000000000000000000000000000000000000000000',
      totalOriginalConsiderationItems: 1,
      counter: counter.toString(),
    };

    return orderParameters;
  }

  /**
   * Create a partial fill for an order
   * Useful for ERC1155 tokens or partial fills of ERC721 orders
   */
  async createPartialFill(params: PartialFillParameters): Promise<any> {
    // In a real implementation, this would match the orders with proper fulfillments
    // For now, return the parameters
    return {
      orderHash: params.orderHash,
      fillAmount: params.fillAmount,
    };
  }

  /**
   * Create a multi-token offer
   * Offers multiple different NFTs for sale
   */
  async createMultiTokenOffer(params: {
    offerer: Address;
    items: {
      tokenAddress: Address;
      tokenId: string;
      tokenType: number; // 2 = ERC721, 3 = ERC1155
    }[];
    price: string;
    recipient?: Address;
  }): Promise<SeaportOrderParameters> {
    const counter = await this.seaportService.getCounter(params.offerer);
    const now = Math.floor(Date.now() / 1000);

    const offer = params.items.map(item => ({
      itemType: item.tokenType,
      token: item.tokenAddress,
      identifierOrCriteria: item.tokenId,
      startAmount: '1',
      endAmount: '1',
    }));

    const orderParameters: SeaportOrderParameters = {
      offerer: params.offerer,
      zone: '0x0000000000000000000000000000000000000000',
      offer,
      consideration: [
        {
          itemType: 0, // Native ETH
          token: '0x0000000000000000000000000000000000000000',
          identifierOrCriteria: '0',
          startAmount: parseUnits(params.price, 18).toString(),
          endAmount: parseUnits(params.price, 18).toString(),
          recipient: params.recipient || params.offerer,
        },
      ],
      orderType: 0, // Full Open
      startTime: now.toString(),
      endTime: (now + 90 * 24 * 60 * 60).toString(),
      zoneHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      salt: Math.floor(Math.random() * 1000000000).toString(),
      conduitKey: '0x0000000000000000000000000000000000000000000000000000000000000000',
      totalOriginalConsiderationItems: 1,
      counter: counter.toString(),
    };

    return orderParameters;
  }
}

function parseUnits(value: string, decimals: number): string {
  const parts = value.split('.');
  const wholePart = parts[0] || '0';
  const fractionalPart = parts[1] || '';
  const paddedFractional = fractionalPart.padEnd(decimals, '0').slice(0, decimals);
  return wholePart + paddedFractional;
}

