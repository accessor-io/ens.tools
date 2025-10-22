/**
 * ENS Status Indicators
 * CCIP-Read and DNSSEC status detection and display
 */

import { PublicClient } from 'viem';
import { normalize } from 'viem/ens';
import { namehash } from './ens-helpers';
import { PUBLIC_RESOLVER_ABI } from './ens-contracts';

export interface ENSStatus {
  hasResolver: boolean;
  isCCIPRead?: boolean;
  isDNSSEC?: boolean;
  resolverAddress?: string;
}

/**
 * Check if a name uses CCIP-Read resolver
 */
export async function checkCCIPReadStatus(
  publicClient: PublicClient,
  name: string
): Promise<boolean> {
  try {
    const normalizedName = normalize(name);
    const resolverAddress = await publicClient.getEnsResolver({ name: normalizedName });
    
    if (!resolverAddress) {
      return false;
    }

    // Try to read a text record - if it triggers CCIP-Read, we'll detect it
    const node = namehash(normalizedName);
    
    try {
      await publicClient.readContract({
        address: resolverAddress,
        abi: PUBLIC_RESOLVER_ABI,
        functionName: 'text',
        args: [node, 'avatar'],
      });
      
      return false;
    } catch (error: any) {
      if (error.message?.includes('OffchainLookup') || error.message?.includes('CCIP')) {
        return true;
      }
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Check if a name is DNSSEC-verified
 */
export async function checkDNSSECStatus(
  publicClient: PublicClient,
  name: string
): Promise<boolean> {
  try {
    const normalizedName = normalize(name);
    
    // Check if name has DNS parent (not .eth)
    if (normalizedName.endsWith('.eth')) {
      return false;
    }
    
    // Check for DNS-related text records
    const node = namehash(normalizedName);
    const resolverAddress = await publicClient.getEnsResolver({ name: normalizedName });
    
    if (!resolverAddress) {
      return false;
    }
    
    try {
      const dnsTxt = await publicClient.readContract({
        address: resolverAddress,
        abi: PUBLIC_RESOLVER_ABI,
        functionName: 'text',
        args: [node, 'dnssec'],
      });
      
      return !!dnsTxt;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Get complete status for an ENS name
 */
export async function getENSStatus(
  publicClient: PublicClient,
  name: string
): Promise<ENSStatus> {
  try {
    const normalizedName = normalize(name);
    const resolverAddress = await publicClient.getEnsResolver({ name: normalizedName });
    
    if (!resolverAddress) {
      return {
        hasResolver: false,
        isCCIPRead: false,
        isDNSSEC: false,
      };
    }
    
    const [isCCIPRead, isDNSSEC] = await Promise.all([
      checkCCIPReadStatus(publicClient, name),
      checkDNSSECStatus(publicClient, name),
    ]);
    
    return {
      hasResolver: true,
      isCCIPRead,
      isDNSSEC,
      resolverAddress,
    };
  } catch {
    return {
      hasResolver: false,
      isCCIPRead: false,
      isDNSSEC: false,
    };
  }
}

/**
 * Validate URL for safe external links
 */
export function validateExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    const allowedProtocols = ['https:', 'http:'];
    if (!allowedProtocols.includes(parsed.protocol)) {
      return false;
    }
    
    const localhostPattern = /^(localhost|127\.0\.0\.1|::1)$/;
    if (localhostPattern.test(parsed.hostname)) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

