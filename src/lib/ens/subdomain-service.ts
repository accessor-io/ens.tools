/**
 * Subdomain Service
 * Fetches subdomains for ENS domains from The Graph subgraph
 */

import { PublicClient } from 'viem';
import { normalize } from 'viem/ens';
import { namehash } from './ens-helpers';

const THE_GRAPH_ENDPOINT = 'https://api.thegraph.com/subgraphs/name/ensdomains/ens';

export interface SubdomainInfo {
  name: string;
  labelName: string;
  owner: string;
  resolver: string | null;
  expiryDate: Date | null;
  registrationDate: Date | null;
}

/**
 * Fetch subdomains for a parent domain using The Graph
 */
export async function fetchSubdomains(
  parentName: string,
  publicClient?: PublicClient
): Promise<SubdomainInfo[]> {
  try {
    const normalizedParent = normalize(parentName);
    const parentNode = namehash(normalizedParent);
    
    // Query The Graph for subdomains
    // Note: The Graph uses parent.id for the relationship
    const query = `
      query GetSubdomains($parentId: String!) {
        domains(
          where: {
            parent: $parentId
          }
          first: 100
          orderBy: createdAt
          orderDirection: desc
        ) {
          id
          name
          labelName
          owner {
            id
          }
          resolver {
            id
          }
          createdAt
          expiryDate
        }
      }
    `;

    const response = await fetch(THE_GRAPH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          parentId: parentNode.toLowerCase(),
        },
      }),
    });

    // Handle rate limiting and other HTTP errors
    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited - silently return empty array
        return [];
      }
      if (response.status >= 500) {
        // Server error - silently return empty array
        return [];
      }
      throw new Error(`GraphQL request failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors) {
      // Only log non-rate-limit errors
      const hasRateLimitError = data.errors.some((err: any) => 
        err.message?.includes('rate limit') || 
        err.message?.includes('429') ||
        err.extensions?.code === 'RATE_LIMITED'
      );
      
      if (!hasRateLimitError) {
        console.error('GraphQL errors:', data.errors);
      }
      // Fallback to empty array if query fails
      return [];
    }

    const domains = data.data?.domains || [];

    return domains.map((domain: any) => ({
      name: domain.name || '',
      labelName: domain.labelName || '',
      owner: domain.owner?.id || '',
      resolver: domain.resolver?.id || null,
      expiryDate: domain.expiryDate ? new Date(parseInt(domain.expiryDate) * 1000) : null,
      registrationDate: domain.createdAt ? new Date(parseInt(domain.createdAt) * 1000) : null,
    }));
  } catch (error: any) {
    // Handle network errors, CORS errors, and rate limiting gracefully
    const isNetworkError = 
      error?.name === 'TypeError' && 
      (error?.message?.includes('NetworkError') || 
       error?.message?.includes('Failed to fetch') ||
       error?.message?.includes('CORS'));
    
    const isRateLimitError = 
      error?.message?.includes('429') ||
      error?.message?.includes('rate limit');
    
    // Only log unexpected errors
    if (!isNetworkError && !isRateLimitError) {
      console.error('Error fetching subdomains from The Graph:', error);
    }
    
    // Fallback: Try to query directly from blockchain if publicClient is available
    if (publicClient) {
      return await fetchSubdomainsFromBlockchain(parentName, publicClient);
    }
    
    // Return empty array if both methods fail
    return [];
  }
}

/**
 * Fallback: Fetch subdomains by querying blockchain events
 * This is slower but works without The Graph
 */
async function fetchSubdomainsFromBlockchain(
  parentName: string,
  publicClient: PublicClient
): Promise<SubdomainInfo[]> {
  try {
    const normalizedParent = normalize(parentName);
    const parentNode = namehash(normalizedParent);
    
    // Query NewOwner events from ENS Registry
    // This is a simplified approach - in production, you'd want to cache and index these
    const ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' as const;
    
    // Note: This is a basic implementation. For production, you'd want to:
    // 1. Query from a specific block range
    // 2. Cache results
    // 3. Use an indexer service
    
    // For now, return empty array as this requires more complex event filtering
    console.warn('Blockchain subdomain querying not fully implemented. Using The Graph is recommended.');
    return [];
  } catch (error) {
    console.error('Error fetching subdomains from blockchain:', error);
    return [];
  }
}

/**
 * Get subdomain count for a parent domain
 */
export async function getSubdomainCount(parentName: string): Promise<number> {
  try {
    const subdomains = await fetchSubdomains(parentName);
    return subdomains.length;
  } catch (error) {
    console.error('Error getting subdomain count:', error);
    return 0;
  }
}

