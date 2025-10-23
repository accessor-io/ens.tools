/**
 * Seaport Order Signing Utility
 * Handles EIP-712 signing for Seaport orders
 */

import { getDomainSeparator, verifyOrder, signOrder } from '@opensea/seaport-js';
import type { SeaportOrderParameters } from './seaport-service';

export interface OrderSignature {
  orderHash: string;
  signature: string;
}

/**
 * EIP-712 Domain for Seaport
 */
export const SEAPORT_DOMAIN = {
  name: 'Seaport',
  version: '1.5',
  chainId: 1,
  verifyingContract: '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC',
};

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
    const orderHash = await getOrderHash(order);

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
    return await verifyOrder(orderParameters, signature, signer);
  } catch (error) {
    console.error('Error verifying Seaport order signature:', error);
    return false;
  }
}

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
 * EIP-712 Types for Seaport
 */
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

