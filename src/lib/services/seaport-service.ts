/**
 * Production-Ready Seaport Service
 * Implements Seaport protocol for NFT marketplace operations
 */

import { createWalletClient, createPublicClient, http, formatUnits, parseUnits, Address, Chain } from 'viem';
import { sepolia, mainnet, optimism, base, arbitrum } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Seaport Order Types
export interface SeaportOfferItem {
  itemType: number; // 0 = Native, 1 = ERC20, 2 = ERC721, 3 = ERC1155
  token: string;
  identifierOrCriteria: string;
  startAmount: string;
  endAmount: string;
}

export interface SeaportConsiderationItem {
  itemType: number;
  token: string;
  identifierOrCriteria: string;
  startAmount: string;
  endAmount: string;
  recipient: string;
}

export interface SeaportOrderParameters {
  offerer: string;
  zone: string;
  offer: SeaportOfferItem[];
  consideration: SeaportConsiderationItem[];
  orderType: number; // 0 = Full Open, 1 = Partial Open, 2 = Restricted, 3 = Contract
  startTime: string;
  endTime: string;
  zoneHash: string;
  salt: string;
  conduitKey: string;
  totalOriginalConsiderationItems: number;
  counter: string;
}

export interface SeaportOrder {
  parameters: SeaportOrderParameters;
  signature: string;
}

export interface OrderStatus {
  isValidated: boolean;
  isCancelled: boolean;
  totalFilled: bigint;
  totalSize: bigint;
}

export interface FulfillmentOrder {
  parameters: SeaportOrderParameters;
  signature: string;
}

// Seaport v1.5 Contract ABI
export const SEAPORT_V15_ABI = [
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
      { name: 'order', type: 'tuple' },
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
      { name: 'orders', type: 'tuple[]' },
      { name: 'fulfillments', type: 'tuple[]' },
    ],
    outputs: [{ name: 'fulfilled', type: 'bool[]' }],
  },
  {
    name: 'validate',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'orders', type: 'tuple[]' }],
    outputs: [{ name: 'validated', type: 'bool[]' }],
  },
  {
    name: 'cancel',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'orders', type: 'tuple[]' }],
    outputs: [{ name: 'cancelled', type: 'bool' }],
  },
  {
    name: 'getCounter',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'offerer', type: 'address' }],
    outputs: [{ name: 'counter', type: 'uint256' }],
  },
] as const;

// Seaport Contract Addresses
export const SEAPORT_CONTRACTS: Record<number, Address> = {
  1: '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC', // Mainnet
  11155111: '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC', // Sepolia
  10: '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC', // Optimism
  8453: '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC', // Base
  42161: '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC', // Arbitrum
};

// Conduit Keys (empty for basic orders)
export const EMPTY_CONDUIT_KEY = '0x0000000000000000000000000000000000000000000000000000000000000000';

export class SeaportService {
  private publicClient: any;
  private walletClient: any;
  private chainId: number;

  constructor(publicClient: any, walletClient: any, chainId: number) {
    this.publicClient = publicClient;
    this.walletClient = walletClient;
    this.chainId = chainId;
  }

  /**
   * Get the Seaport contract address for the current chain
   */
  getSeaportAddress(): Address {
    return SEAPORT_CONTRACTS[this.chainId] || SEAPORT_CONTRACTS[1];
  }

  /**
   * Check order status on-chain
   */
  async getOrderStatus(orderHash: string): Promise<OrderStatus> {
    try {
      const result = await this.publicClient.readContract({
        address: this.getSeaportAddress(),
        abi: SEAPORT_V15_ABI,
        functionName: 'getOrderStatus',
        args: [orderHash as `0x${string}`],
      });

      return {
        isValidated: result[0],
        isCancelled: result[1],
        totalFilled: result[2],
        totalSize: result[3],
      };
    } catch (error) {
      console.error('Error getting order status:', error);
      throw error;
    }
  }

  /**
   * Get the nonce counter for an address
   */
  async getCounter(offerer: Address): Promise<bigint> {
    try {
      const counter = await this.publicClient.readContract({
        address: this.getSeaportAddress(),
        abi: SEAPORT_V15_ABI,
        functionName: 'getCounter',
        args: [offerer],
      });

      return counter;
    } catch (error) {
      console.error('Error getting counter:', error);
      throw error;
    }
  }

  /**
   * Validate orders on-chain
   */
  async validateOrders(orders: SeaportOrder[]): Promise<boolean[]> {
    try {
      const result = await this.publicClient.readContract({
        address: this.getSeaportAddress(),
        abi: SEAPORT_V15_ABI,
        functionName: 'validate',
        args: [orders],
      });

      return result;
    } catch (error) {
      console.error('Error validating orders:', error);
      throw error;
    }
  }

  /**
   * Cancel orders
   */
  async cancelOrders(orders: SeaportOrder[]): Promise<string> {
    if (!this.walletClient) {
      throw new Error('Wallet client not available');
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.getSeaportAddress(),
        abi: SEAPORT_V15_ABI,
        functionName: 'cancel',
        args: [orders],
      });

      return hash;
    } catch (error) {
      console.error('Error cancelling orders:', error);
      throw error;
    }
  }

  /**
   * Fulfill a basic order (single NFT for ETH)
   */
  async fulfillBasicOrder(parameters: any): Promise<string> {
    if (!this.walletClient) {
      throw new Error('Wallet client not available');
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.getSeaportAddress(),
        abi: SEAPORT_V15_ABI,
        functionName: 'fulfillBasicOrder',
        args: [parameters],
        value: BigInt(parameters.considerationAmount),
      });

      return hash;
    } catch (error) {
      console.error('Error fulfilling basic order:', error);
      throw error;
    }
  }

  /**
   * Fulfill a complete order
   */
  async fulfillOrder(order: SeaportOrder, fulfillerConduitKey: string = EMPTY_CONDUIT_KEY): Promise<string> {
    if (!this.walletClient) {
      throw new Error('Wallet client not available');
    }

    try {
      // Calculate total value to send
      const totalValue = order.parameters.consideration.reduce((sum, item) => {
        if (item.itemType === 0) { // Native ETH
          return sum + BigInt(item.startAmount);
        }
        return sum;
      }, BigInt(0));

      const hash = await this.walletClient.writeContract({
        address: this.getSeaportAddress(),
        abi: SEAPORT_V15_ABI,
        functionName: 'fulfillOrder',
        args: [order, fulfillerConduitKey],
        value: totalValue,
      });

      return hash;
    } catch (error) {
      console.error('Error fulfilling order:', error);
      throw error;
    }
  }

  /**
   * Match multiple orders atomically
   */
  async matchOrders(orders: SeaportOrder[], fulfillments: any[]): Promise<string> {
    if (!this.walletClient) {
      throw new Error('Wallet client not available');
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.getSeaportAddress(),
        abi: SEAPORT_V15_ABI,
        functionName: 'matchOrders',
        args: [orders, fulfillments],
      });

      return hash;
    } catch (error) {
      console.error('Error matching orders:', error);
      throw error;
    }
  }

  /**
   * Create an ERC721 listing order
   */
  async createERC721ListingOrder(params: {
    offerer: Address;
    tokenAddress: Address;
    tokenId: string;
    price: string; // in ETH
    recipient?: Address;
    startTime?: number;
    endTime?: number;
  }): Promise<SeaportOrderParameters> {
    const counter = await this.getCounter(params.offerer);
    const now = Math.floor(Date.now() / 1000);
    
    const orderParameters: SeaportOrderParameters = {
      offerer: params.offerer,
      zone: '0x0000000000000000000000000000000000000000',
      offer: [
        {
          itemType: 2, // ERC721
          token: params.tokenAddress,
          identifierOrCriteria: params.tokenId,
          startAmount: '1',
          endAmount: '1',
        },
      ],
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
      endTime: (params.endTime || now + 90 * 24 * 60 * 60).toString(), // 90 days default
      zoneHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      salt: Math.floor(Math.random() * 1000000000).toString(),
      conduitKey: EMPTY_CONDUIT_KEY,
      totalOriginalConsiderationItems: 1,
      counter: counter.toString(),
    };

    return orderParameters;
  }

  /**
   * Create an ERC721 offer order
   */
  async createERC721OfferOrder(params: {
    offerer: Address;
    tokenAddress: Address;
    tokenId: string;
    price: string; // in ETH
    recipient?: Address;
    startTime?: number;
    endTime?: number;
  }): Promise<SeaportOrderParameters> {
    const counter = await this.getCounter(params.offerer);
    const now = Math.floor(Date.now() / 1000);
    
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
          token: params.tokenAddress,
          identifierOrCriteria: params.tokenId,
          startAmount: '1',
          endAmount: '1',
          recipient: params.recipient || params.offerer,
        },
      ],
      orderType: 0, // Full Open
      startTime: (params.startTime || now).toString(),
      endTime: (params.endTime || now + 90 * 24 * 60 * 60).toString(), // 90 days default
      zoneHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      salt: Math.floor(Math.random() * 1000000000).toString(),
      conduitKey: EMPTY_CONDUIT_KEY,
      totalOriginalConsiderationItems: 1,
      counter: counter.toString(),
    };

    return orderParameters;
  }

  /**
   * Wait for transaction receipt with retries
   */
  async waitForTransaction(hash: string, retries: number = 10): Promise<any> {
    let attempt = 0;
    
    while (attempt < retries) {
      try {
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
        return receipt;
      } catch (error) {
        attempt++;
        if (attempt >= retries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  /**
   * Format order parameters for display
   */
  formatOrder(order: SeaportOrder): any {
    return {
      offerer: order.parameters.offerer,
      offer: order.parameters.offer.map(item => ({
        type: this.getItemTypeName(item.itemType),
        token: item.token,
        identifier: item.identifierOrCriteria,
        amount: item.startAmount,
      })),
      consideration: order.parameters.consideration.map(item => ({
        type: this.getItemTypeName(item.itemType),
        token: item.token,
        identifier: item.identifierOrCriteria,
        amount: formatUnits(BigInt(item.startAmount), 18),
        recipient: item.recipient,
      })),
      startTime: new Date(Number(order.parameters.startTime) * 1000).toISOString(),
      endTime: new Date(Number(order.parameters.endTime) * 1000).toISOString(),
      status: Number(order.parameters.endTime) < Math.floor(Date.now() / 1000) ? 'expired' : 'active',
    };
  }

  private getItemTypeName(itemType: number): string {
    const types = ['Native', 'ERC20', 'ERC721', 'ERC1155'];
    return types[itemType] || 'Unknown';
  }
}

