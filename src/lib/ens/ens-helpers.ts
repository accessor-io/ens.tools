/**
 * ENS Helper Utilities
 * Specification-compliant name hashing, coin types, and contenthash handling
 */

import { keccak256, toBytes, toHex, Hex } from 'viem';
import { normalize } from 'viem/ens';

/**
 * Calculate namehash for an ENS name (RFC 1035, Section 3.5)
 * EIP-137 compliant
 */
export function namehash(name: string): `0x${string}` {
  if (!name) {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }
  
  const normalized = normalize(name);
  const parts = normalized.split('.');
  
  return parts.reduceRight((hash, label) => {
    const labelHash = keccak256(toBytes(label));
    return keccak256(toBytes(hash + labelHash.slice(2) as Hex));
  }, '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex);
}

/**
 * Calculate labelhash for a single label
 */
export function labelhash(label: string): `0x${string}` {
  const normalized = normalize(label);
  return keccak256(toBytes(normalized));
}

/**
 * Common coin types (EIP-2304)
 */
export const COIN_TYPES = {
  ETH: 60,
  BTC: 0,
  LTC: 2,
  DOGE: 3,
  XRP: 144,
  ADA: 1815,
  DOT: 354,
  SOL: 501,
  AVAX: 9000,
  MATIC: 966,
  BNB: 9006,
  ARB: 42161,
  OP: 42170,
  BASE: 8453,
} as const;

/**
 * Get coin type for common cryptocurrencies
 */
export function getCoinType(symbol: string): number | null {
  return COIN_TYPES[symbol.toUpperCase() as keyof typeof COIN_TYPES] || null;
}

/**
 * Validate coin address format based on coin type
 */
export function validateCoinAddress(address: string, coinType: number): boolean {
  if (coinType === COIN_TYPES.ETH) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
  if (coinType === COIN_TYPES.BTC) {
    return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || 
           /^bc1[a-z0-9]{39,59}$/.test(address);
  }
  return true;
}

/**
 * Encode address bytes from hex string
 */
export function encodeAddress(address: string): Uint8Array {
  if (address.startsWith('0x')) {
    return toBytes(address as Hex);
  }
  return new TextEncoder().encode(address);
}

/**
 * Decode address bytes to hex string or text
 */
export function decodeAddress(bytes: Uint8Array, coinType: number): string {
  if (coinType === COIN_TYPES.ETH) {
    return toHex(bytes);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Contenthash codec constants (EIP-1577)
 */
export const CONTENTHASH_PREFIX = {
  IPFS: 0xe3,
  IPNS: 0xe5,
  SWARM: 0xe4,
  ONION: 0xbc,
  ONION3: 0xbd,
} as const;

/**
 * Encode IPFS/IPNS hash to contenthash
 */
export function encodeContenthash(contentHash: string): Uint8Array {
  if (contentHash.startsWith('/ipfs/')) {
    const hash = contentHash.slice(6);
    const decoded = Buffer.from(hash, 'base32');
    const encoded = new Uint8Array(decoded.length + 2);
    encoded[0] = CONTENTHASH_PREFIX.IPFS >> 8;
    encoded[1] = CONTENTHASH_PREFIX.IPFS & 0xff;
    encoded.set(decoded, 2);
    return encoded;
  }
  
  if (contentHash.startsWith('/ipns/')) {
    const hash = contentHash.slice(6);
    const decoded = Buffer.from(hash, 'base32');
    const encoded = new Uint8Array(decoded.length + 2);
    encoded[0] = CONTENTHASH_PREFIX.IPNS >> 8;
    encoded[1] = CONTENTHASH_PREFIX.IPNS & 0xff;
    encoded.set(decoded, 2);
    return encoded;
  }
  
  if (contentHash.startsWith('/')) {
    throw new Error('Unsupported contenthash format');
  }
  
  return toBytes(contentHash as Hex);
}

/**
 * Decode contenthash to human-readable format
 */
export function decodeContenthash(contenthash: Uint8Array): string {
  if (contenthash.length < 2) {
    return toHex(contenthash);
  }
  
  const prefix = (contenthash[0] << 8) | contenthash[1];
  
  switch (prefix) {
    case CONTENTHASH_PREFIX.IPFS:
      const ipfsHash = Buffer.from(contenthash.slice(2)).toString('base32');
      return `/ipfs/${ipfsHash}`;
    case CONTENTHASH_PREFIX.IPNS:
      const ipnsHash = Buffer.from(contenthash.slice(2)).toString('base32');
      return `/ipns/${ipnsHash}`;
    case CONTENTHASH_PREFIX.SWARM:
      const swarmHash = toHex(contenthash.slice(2));
      return `/bzz/${swarmHash}`;
    case CONTENTHASH_PREFIX.ONION:
      const onionHash = Buffer.from(contenthash.slice(2)).toString('hex');
      return `/onion/${onionHash}`;
    case CONTENTHASH_PREFIX.ONION3:
      const onion3Hash = Buffer.from(contenthash.slice(2)).toString('hex');
      return `/onion3/${onion3Hash}`;
    default:
      return toHex(contenthash);
  }
}

/**
 * Validate ENS name format
 */
export function isValidENSName(name: string): boolean {
  try {
    normalize(name);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract parent domain from ENS name
 */
export function getParentDomain(name: string): string | null {
  const normalized = normalize(name);
  const parts = normalized.split('.');
  
  if (parts.length <= 1) {
    return null;
  }
  
  return parts.slice(1).join('.');
}

/**
 * Extract label from ENS name
 */
export function getLabel(name: string): string {
  const normalized = normalize(name);
  const parts = normalized.split('.');
  return parts[0];
}

/**
 * Generate cryptographically secure random secret for commit/reveal
 */
export function generateSecret(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

/**
 * Validate payload size limits
 */
export function validatePayloadSize(data: string, maxSize: number = 5000): boolean {
  return new TextEncoder().encode(data).length <= maxSize;
}

