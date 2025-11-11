/**
 * Consolidated Seaport Service
 * Implements Seaport protocol for NFT marketplace operations
 * Includes: Core operations, Advanced features, Order signing, Error handling
 */

import { createWalletClient, createPublicClient, http, formatUnits, parseUnits, parseEther, Address, Chain } from 'viem';
import { sepolia, mainnet, optimism, base, arbitrum } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { feeCollectionService } from './fee-collection-service';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

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

// Advanced Features Interfaces
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

// Signing Interfaces
export interface OrderSignature {
  orderHash: string;
  signature: string;
}

// Error Handling Interfaces
export enum SeaportErrorType {
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  ORDER_EXPIRED = 'ORDER_EXPIRED',
  ORDER_INVALID = 'ORDER_INVALID',
  ORDER_ALREADY_FULFILLED = 'ORDER_ALREADY_FULFILLED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  INSUFFICIENT_APPROVAL = 'INSUFFICIENT_APPROVAL',
  NONCE_INVALID = 'NONCE_INVALID',
  SIGNATURE_INVALID = 'SIGNATURE_INVALID',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface SeaportError {
  type: SeaportErrorType;
  message: string;
  recoverable: boolean;
  suggestion?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

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

// EIP-712 Domain for Seaport
export const SEAPORT_DOMAIN = {
  name: 'Seaport',
  version: '1.5',
  chainId: 1,
  verifyingContract: '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC',
};

// EIP-712 Types for Seaport
export const SEAPORT_TYPES = {
  OrderComponents: [
    { name: 'offerer', type: 'address' },
    { name: 'zone', type: 'address' },
    { name: 'offer', type: 'OfferItem[]' },
    { name: 'consideration', type: 'ConsiderationItem[]' },
    { name: 'orderType', type: 'uint8' },
    { name: 'startTime', type: 'uint256' },
    { name: 'endTime', type: 'uint256' },
    { name: 'zoneHash', type: 'bytes32' },
    { name: 'salt', type: 'uint256' },
    { name: 'conduitKey', type: 'bytes32' },
    { name: 'counter', type: 'uint256' },
  ],
  OfferItem: [
    { name: 'itemType', type: 'uint8' },
    { name: 'token', type: 'address' },
    { name: 'identifierOrCriteria', type: 'uint256' },
    { name: 'startAmount', type: 'uint256' },
    { name: 'endAmount', type: 'uint256' },
  ],
  ConsiderationItem: [
    { name: 'itemType', type: 'uint8' },
    { name: 'token', type: 'address' },
    { name: 'identifierOrCriteria', type: 'uint256' },
    { name: 'startAmount', type: 'uint256' },
    { name: 'endAmount', type: 'uint256' },
    { name: 'recipient', type: 'address' },
  ],
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function parseUnitsHelper(value: string, decimals: number): string {
  const parts = value.split('.');
  const wholePart = parts[0] || '0';
  const fractionalPart = parts[1] || '';
  const paddedFractional = fractionalPart.padEnd(decimals, '0').slice(0, decimals);
  return wholePart + paddedFractional;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class SeaportErrorHandler {
  /**
   * Parse and categorize Seaport errors
   */
  static parseError(error: any): SeaportError {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorCode = error?.code || error?.error?.code;

    // Transaction execution errors
    if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient balance')) {
      return {
        type: SeaportErrorType.INSUFFICIENT_BALANCE,
        message: 'Insufficient balance to complete transaction',
        recoverable: true,
        suggestion: 'Please ensure you have enough ETH to cover the transaction and gas fees',
      };
    }

    if (errorMessage.includes('not authorized') || errorMessage.includes('approval')) {
      return {
        type: SeaportErrorType.INSUFFICIENT_APPROVAL,
        message: 'Token approval required',
        recoverable: true,
        suggestion: 'Please approve the marketplace to trade your tokens',
      };
    }

    if (errorMessage.includes('order expired') || errorMessage.includes('endTime')) {
      return {
        type: SeaportErrorType.ORDER_EXPIRED,
        message: 'Order has expired',
        recoverable: false,
        suggestion: 'The order is no longer valid. Please create a new order',
      };
    }

    if (errorMessage.includes('already fulfilled') || errorMessage.includes('filled')) {
      return {
        type: SeaportErrorType.ORDER_ALREADY_FULFILLED,
        message: 'Order has already been fulfilled',
        recoverable: false,
        suggestion: 'This order has already been completed',
      };
    }

    if (errorMessage.includes('cancelled')) {
      return {
        type: SeaportErrorType.ORDER_CANCELLED,
        message: 'Order has been cancelled',
        recoverable: false,
        suggestion: 'This order has been cancelled by the offerer',
      };
    }

    if (errorMessage.includes('signature') || errorMessage.includes('ECDSA')) {
      return {
        type: SeaportErrorType.SIGNATURE_INVALID,
        message: 'Invalid order signature',
        recoverable: false,
        suggestion: 'The order signature is invalid. Please contact support',
      };
    }

    if (errorMessage.includes('nonce') || errorMessage.includes('counter')) {
      return {
        type: SeaportErrorType.NONCE_INVALID,
        message: 'Invalid order nonce',
        recoverable: true,
        suggestion: 'The order nonce is outdated. Please refresh and try again',
      };
    }

    if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return {
        type: SeaportErrorType.NETWORK_ERROR,
        message: 'Network error occurred',
        recoverable: true,
        suggestion: 'Network issue detected. Please try again',
      };
    }

    if (errorCode === 'ACTION_REJECTED' || errorMessage.includes('user rejected')) {
      return {
        type: SeaportErrorType.TRANSACTION_FAILED,
        message: 'Transaction was rejected',
        recoverable: true,
        suggestion: 'Transaction was cancelled. You can try again',
      };
    }

    return {
      type: SeaportErrorType.UNKNOWN_ERROR,
      message: errorMessage,
      recoverable: false,
      suggestion: 'An unexpected error occurred. Please try again or contact support',
    };
  }

  /**
   * Format error for user display
   */
  static formatError(error: SeaportError): string {
    return `${error.message}${error.suggestion ? ` - ${error.suggestion}` : ''}`;
  }

  /**
   * Check if error is recoverable
   */
  static isRecoverable(error: SeaportError): boolean {
    return error.recoverable;
  }

  /**
   * Get suggested action for error
   */
  static getSuggestedAction(error: SeaportError): string | null {
    switch (error.type) {
      case SeaportErrorType.INSUFFICIENT_BALANCE:
        return 'Add more ETH to your wallet';
      case SeaportErrorType.INSUFFICIENT_APPROVAL:
        return 'Approve marketplace to trade tokens';
      case SeaportErrorType.NETWORK_ERROR:
        return 'Check your internet connection';
      case SeaportErrorType.NONCE_INVALID:
        return 'Refresh the page and try again';
      case SeaportErrorType.TRANSACTION_FAILED:
        return 'Try the transaction again';
      default:
        return null;
    }
  }

  /**
   * Log error with context
   */
  static logError(error: any, context: string): void {
    const parsedError = this.parseError(error);
    console.error(`[Seaport Error] ${context}:`, {
      type: parsedError.type,
      message: parsedError.message,
      originalError: error,
    });
  }
}

export class TransactionRetryHandler {
  private maxRetries: number;
  private retryDelay: number;

  constructor(maxRetries: number = 3, retryDelay: number = 2000) {
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  /**
   * Retry a transaction with exponential backoff
   */
  async retry<T>(
    fn: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const parsedError = SeaportErrorHandler.parseError(error);
        
        if (!parsedError.recoverable) {
          SeaportErrorHandler.logError(error, context);
          throw error;
        }

        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          console.log(`Retrying ${context} (attempt ${attempt + 1}/${this.maxRetries}) after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    SeaportErrorHandler.logError(lastError, context);
    throw lastError;
  }
}

export class OrderValidator {
  /**
   * Validate order parameters before submission
   */
  static validateOrder(order: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!order.parameters) {
      errors.push('Order parameters are missing');
      return { valid: false, errors };
    }

    const params = order.parameters;

    // Check offerer
    if (!params.offerer || params.offerer === '0x0000000000000000000000000000000000000000') {
      errors.push('Invalid offerer address');
    }

    // Check offer items
    if (!params.offer || params.offer.length === 0) {
      errors.push('Order must have at least one offer item');
    }

    // Check consideration items
    if (!params.consideration || params.consideration.length === 0) {
      errors.push('Order must have at least one consideration item');
    }

    // Check timestamps
    const now = Math.floor(Date.now() / 1000);
    if (Number(params.endTime) < now) {
      errors.push('Order end time must be in the future');
    }

    if (Number(params.startTime) > Number(params.endTime)) {
      errors.push('Order start time must be before end time');
    }

    // Check signature
    if (!order.signature || order.signature === '0x') {
      errors.push('Order signature is missing');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate price format
   */
  static validatePrice(price: string): { valid: boolean; error?: string } {
    if (!price || price.trim() === '') {
      return { valid: false, error: 'Price is required' };
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) {
      return { valid: false, error: 'Price must be a valid number' };
    }

    if (numPrice <= 0) {
      return { valid: false, error: 'Price must be greater than 0' };
    }

    if (numPrice > 1000000) {
      return { valid: false, error: 'Price is too large' };
    }

    return { valid: true };
  }

  /**
   * Validate address format
   */
  static validateAddress(address: string): { valid: boolean; error?: string } {
    if (!address || address.trim() === '') {
      return { valid: false, error: 'Address is required' };
    }

    if (!address.startsWith('0x')) {
      return { valid: false, error: 'Address must start with 0x' };
    }

    if (address.length !== 42) {
      return { valid: false, error: 'Address must be 42 characters long' };
    }

    return { valid: true };
  }
}

// ============================================================================
// ORDER SIGNING UTILITIES
// ============================================================================

/**
 * Get order hash for a Seaport order
 */
export async function getOrderHash(orderParameters: SeaportOrderParameters): Promise<string> {
  // In production, use the actual order hash from Seaport contract
  // For now, return a placeholder
  const orderString = JSON.stringify(orderParameters);
  const encoder = new TextEncoder();
  const data = encoder.encode(orderString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Sign a Seaport order using EIP-712
 */
export async function signSeaportOrder(
  orderParameters: SeaportOrderParameters,
  signer: any
): Promise<OrderSignature> {
  try {
    // Create the order structure
    const order = {
      parameters: orderParameters,
      signature: '0x',
    };

    // Get the order hash
    const orderHash = await getOrderHash(orderParameters);

    // Sign the order
    const signature = await signer.signTypedData({
      domain: SEAPORT_DOMAIN,
      types: SEAPORT_TYPES,
      primaryType: 'OrderComponents',
      message: orderParameters,
    });

    return {
      orderHash,
      signature,
    };
  } catch (error) {
    console.error('Error signing Seaport order:', error);
    throw error;
  }
}

/**
 * Verify a Seaport order signature
 */
export async function verifySeaportOrderSignature(
  orderParameters: SeaportOrderParameters,
  signature: string,
  signer: string
): Promise<boolean> {
  try {
    // Note: This would use @opensea/seaport-js verifyOrder in production
    // For now, return true if signature is not empty
    return signature !== '0x' && signature.length > 0;
  } catch (error) {
    console.error('Error verifying Seaport order signature:', error);
    return false;
  }
}

/**
 * Create a bundled order signature for multiple orders
 */
export async function createBundledOrderSignature(
  orders: SeaportOrderParameters[],
  signer: any
): Promise<string[]> {
  const signatures: string[] = [];
  
  for (const order of orders) {
    const signature = await signSeaportOrder(order, signer);
    signatures.push(signature.signature);
  }
  
  return signatures;
}

/**
 * Encode order parameters for contract interaction
 */
export function encodeOrder(orderParameters: SeaportOrderParameters): any {
  return {
    parameters: {
      offerer: orderParameters.offerer,
      zone: orderParameters.zone,
      offer: orderParameters.offer.map(item => ({
        itemType: item.itemType,
        token: item.token,
        identifierOrCriteria: BigInt(item.identifierOrCriteria),
        startAmount: BigInt(item.startAmount),
        endAmount: BigInt(item.endAmount),
      })),
      consideration: orderParameters.consideration.map(item => ({
        itemType: item.itemType,
        token: item.token,
        identifierOrCriteria: BigInt(item.identifierOrCriteria),
        startAmount: BigInt(item.startAmount),
        endAmount: BigInt(item.endAmount),
        recipient: item.recipient,
      })),
      orderType: orderParameters.orderType,
      startTime: BigInt(orderParameters.startTime),
      endTime: BigInt(orderParameters.endTime),
      zoneHash: orderParameters.zoneHash as `0x${string}`,
      salt: BigInt(orderParameters.salt),
      conduitKey: orderParameters.conduitKey as `0x${string}`,
      totalOriginalConsiderationItems: orderParameters.totalOriginalConsiderationItems,
      counter: BigInt(orderParameters.counter),
    },
    signature: '0x' as `0x${string}`,
  };
}

// ============================================================================
// MAIN SEAPORT SERVICE CLASS
// ============================================================================

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
   * Extract order details for fee recording
   */
  private extractOrderDetails(order: SeaportOrder | any): {
    seller: Address;
    buyer: Address | null;
    tokenAddress: Address | null;
    tokenId: bigint | null;
    salePrice: bigint;
    feeAmount: bigint;
  } {
    const params = order.parameters || order;
    const seller = (params.offerer || params.seller) as Address;
    
    // Extract buyer from consideration (the one receiving the NFT)
    // For basic orders, buyer is typically the fulfiller
    let buyer: Address | null = null;
    let tokenAddress: Address | null = null;
    let tokenId: bigint | null = null;
    
    // Extract NFT from offer (what seller is offering)
    if (params.offer && params.offer.length > 0) {
      const offerItem = params.offer[0];
      if (offerItem.itemType === 2 || offerItem.itemType === 3) { // ERC721 or ERC1155
        tokenAddress = offerItem.token as Address;
        tokenId = BigInt(offerItem.identifierOrCriteria);
      }
    }
    
    // Calculate sale price and fee from consideration
    let salePrice = 0n;
    let feeAmount = 0n;
    const feeConfig = feeCollectionService['config'];
    const feeRecipient = feeConfig.contractAddress !== '0x0000000000000000000000000000000000000000' 
      ? feeConfig.contractAddress.toLowerCase() 
      : null;
    
    if (params.consideration && params.consideration.length > 0) {
      params.consideration.forEach((item: SeaportConsiderationItem) => {
        const amount = BigInt(item.startAmount);
        if (item.itemType === 0) { // Native ETH
          if (feeRecipient && item.recipient.toLowerCase() === feeRecipient) {
            feeAmount = amount;
          } else {
            salePrice += amount;
          }
        }
        // Buyer is typically the recipient of the NFT in consideration
        if ((item.itemType === 2 || item.itemType === 3) && !buyer) {
          buyer = item.recipient as Address;
        }
      });
    }
    
    // If we couldn't determine buyer, use seller as fallback (will be updated from transaction)
    if (!buyer) {
      buyer = seller;
    }
    
    // Total sale price includes fee
    const totalPrice = salePrice + feeAmount;
    
    return {
      seller,
      buyer,
      tokenAddress,
      tokenId,
      salePrice: totalPrice,
      feeAmount,
    };
  }

  /**
   * Record marketplace fee after order fulfillment
   */
  private async recordMarketplaceFee(
    order: SeaportOrder | any,
    buyerAddress?: Address
  ): Promise<void> {
    try {
      const feeConfig = feeCollectionService['config'];
      
      // Skip if contract not deployed
      if (feeConfig.contractAddress === '0x0000000000000000000000000000000000000000') {
        return;
      }
      
      // Skip if no marketplace fee configured
      if (!feeConfig.marketplaceFeeBps || feeConfig.marketplaceFeeBps === 0) {
        return;
      }
      
      const orderDetails = this.extractOrderDetails(order);
      
      // Use provided buyer address or extract from order
      const buyer = buyerAddress || orderDetails.buyer;
      
      if (!buyer || !orderDetails.tokenAddress || orderDetails.tokenId === null) {
        console.warn('Cannot record marketplace fee: missing order details', orderDetails);
        return;
      }
      
      // Set clients if available
      if (this.publicClient && this.walletClient) {
        feeCollectionService.setClients(this.publicClient, this.walletClient);
        
        // Record the fee in the contract
        // Note: The fee was already sent to the contract via Seaport consideration items
        // We use recordMarketplaceFee to update the tracking counters without requiring additional payment
        try {
          // Use recordMarketplaceFee since fee was already collected via Seaport
          // This function doesn't require payment - it just records the fee in tracking counters
          await feeCollectionService.recordMarketplaceFee(
            orderDetails.seller,
            buyer,
            orderDetails.tokenAddress,
            orderDetails.tokenId,
            orderDetails.salePrice
          );
          console.log('Marketplace fee recorded successfully in contract');
        } catch (feeError) {
          // If fee recording fails, log but don't fail - the fee was already collected via Seaport
          console.warn('Could not record marketplace fee in contract (fee already collected via Seaport):', feeError);
        }
      }
    } catch (error) {
      // Don't fail the transaction if fee recording fails
      console.error('Error recording marketplace fee:', error);
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

      // Record marketplace fee after successful fulfillment
      if (this.publicClient && this.walletClient?.account) {
        // Wait for transaction to be mined to get buyer address
        try {
          const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
          const buyer = receipt.from as Address;
          await this.recordMarketplaceFee(parameters, buyer);
        } catch (error) {
          console.error('Error waiting for transaction receipt:', error);
          // Still try to record with available info
          await this.recordMarketplaceFee(parameters);
        }
      }

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

      // Record marketplace fee after successful fulfillment
      if (this.publicClient && this.walletClient?.account) {
        // Wait for transaction to be mined to get buyer address
        try {
          const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
          const buyer = receipt.from as Address;
          await this.recordMarketplaceFee(order, buyer);
        } catch (error) {
          console.error('Error waiting for transaction receipt:', error);
          // Still try to record with available info
          await this.recordMarketplaceFee(order);
        }
      }

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
    feeRecipient?: Address; // Marketplace fee recipient
    feeBps?: number; // Marketplace fee in basis points (e.g., 250 = 2.5%)
    startTime?: number;
    endTime?: number;
  }): Promise<SeaportOrderParameters> {
    const counter = await this.getCounter(params.offerer);
    const now = Math.floor(Date.now() / 1000);
    
    // Parse price - handle both string and number
    const totalPrice = typeof params.price === 'string' 
      ? parseEther(params.price)
      : parseEther(params.price.toString());
    const sellerRecipient = params.recipient || params.offerer;
    
    // Build consideration items
    const consideration: SeaportConsiderationItem[] = [];
    
    // If fee recipient is specified, split payment
    if (params.feeRecipient && params.feeBps && params.feeBps > 0) {
      const feeBps = BigInt(params.feeBps);
      const marketplaceFee = (totalPrice * feeBps) / 10000n;
      const sellerPayment = totalPrice - marketplaceFee;
      
      // Seller receives most of the payment
      consideration.push({
        itemType: 0, // Native ETH
        token: '0x0000000000000000000000000000000000000000',
        identifierOrCriteria: '0',
        startAmount: sellerPayment.toString(),
        endAmount: sellerPayment.toString(),
        recipient: sellerRecipient,
      });
      
      // Fee recipient receives marketplace fee
      consideration.push({
        itemType: 0, // Native ETH
        token: '0x0000000000000000000000000000000000000000',
        identifierOrCriteria: '0',
        startAmount: marketplaceFee.toString(),
        endAmount: marketplaceFee.toString(),
        recipient: params.feeRecipient,
      });
    } else {
      // No fee, seller receives full payment
      consideration.push({
        itemType: 0, // Native ETH
        token: '0x0000000000000000000000000000000000000000',
        identifierOrCriteria: '0',
        startAmount: totalPrice.toString(),
        endAmount: totalPrice.toString(),
        recipient: sellerRecipient,
      });
    }
    
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
      consideration,
      orderType: 0, // Full Open
      startTime: (params.startTime || now).toString(),
      endTime: (params.endTime || now + 90 * 24 * 60 * 60).toString(), // 90 days default
      zoneHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      salt: Math.floor(Math.random() * 1000000000).toString(),
      conduitKey: EMPTY_CONDUIT_KEY,
      totalOriginalConsiderationItems: consideration.length,
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
    feeRecipient?: Address; // Marketplace fee recipient
    feeBps?: number; // Marketplace fee in basis points
    startTime?: number;
    endTime?: number;
  }): Promise<SeaportOrderParameters> {
    const counter = await this.getCounter(params.offerer);
    const now = Math.floor(Date.now() / 1000);
    
    // Parse price
    const totalPrice = parseEther(params.price);
    
    // For offers, fees are deducted from the offer amount
    // The consideration (NFT) goes to the offerer, but we can't add fees here
    // Fees on offers are typically handled by the seller's listing order
    // So we'll keep the offer as-is, and fees will be collected when the listing is fulfilled
    
    const orderParameters: SeaportOrderParameters = {
      offerer: params.offerer,
      zone: '0x0000000000000000000000000000000000000000',
      offer: [
        {
          itemType: 0, // Native ETH
          token: '0x0000000000000000000000000000000000000000',
          identifierOrCriteria: '0',
          startAmount: totalPrice.toString(),
          endAmount: totalPrice.toString(),
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

  // ============================================================================
  // ADVANCED FEATURES
  // ============================================================================

  /**
   * Create a collection-wide offer
   * This allows buying any token from a collection at a fixed price
   */
  async createCollectionOffer(params: CollectionOfferParameters): Promise<SeaportOrderParameters> {
    const counter = await this.getCounter(params.offerer);
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
          startAmount: parseUnitsHelper(params.price, 18),
          endAmount: parseUnitsHelper(params.price, 18),
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
      conduitKey: EMPTY_CONDUIT_KEY,
      totalOriginalConsiderationItems: 1,
      counter: counter.toString(),
    };

    return orderParameters;
  }

  /**
   * Create a bundle order to sell multiple NFTs together
   */
  async createBundleOrder(params: BundleOrderParameters): Promise<SeaportOrderParameters> {
    const counter = await this.getCounter(params.offerer);
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
          startAmount: parseUnitsHelper(params.price, 18),
          endAmount: parseUnitsHelper(params.price, 18),
          recipient: params.recipient || params.offerer,
        },
      ],
      orderType: 0, // Full Open
      startTime: (params.startTime || now).toString(),
      endTime: (params.endTime || now + 90 * 24 * 60 * 60).toString(),
      zoneHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      salt: Math.floor(Math.random() * 1000000000).toString(),
      conduitKey: EMPTY_CONDUIT_KEY,
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
    const counter = await this.getCounter(params.offerer);
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
          startAmount: parseUnitsHelper(params.price, 18),
          endAmount: parseUnitsHelper(params.price, 18),
          recipient: params.recipient || params.offerer,
        },
      ],
      orderType: 0, // Full Open
      startTime: now.toString(),
      endTime: (now + 90 * 24 * 60 * 60).toString(),
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
