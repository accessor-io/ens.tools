import { PublicClient } from 'viem';
import { normalize } from 'viem/ens';

export interface ENSDomain {
  name: string;
  labelName: string | null;
  labelhash: string | null;
  id: string;
  owner: string;
  resolvedAddress: string | null;
  expiryDate: Date | null;
  registrationDate: Date | null;
  isWrapped: boolean;
  parent: string | null;
  resolver: string | null;
  contentHash: string | null;
  texts: Record<string, string>;
}

export interface ENSTextRecord {
  key: string;
  value: string;
}

/**
 * Fetch ENS names owned by an address using The Graph subgraph
 */
export async function fetchENSNames(address: string): Promise<ENSDomain[]> {
  const GRAPH_URL = 'https://api.thegraph.com/subgraphs/name/ensdomains/ens';
  
  const query = `
    query GetNames($owner: String!) {
      domains(
        where: { owner: $owner }
        first: 100
        orderBy: createdAt
        orderDirection: desc
      ) {
        id
        name
        labelName
        labelhash
        owner {
          id
        }
        resolvedAddress {
          id
        }
        resolver {
          id
          addr {
            id
          }
          texts
          contentHash
        }
        wrappedDomain {
          id
          expiryDate
          fuses
        }
      }
    }
  `;

  try {
    const response = await fetch(GRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { owner: address.toLowerCase() },
      }),
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return [];
    }

    const domains = result.data?.domains || [];
    
    return domains.map((domain: any) => ({
      name: domain.name,
      labelName: domain.labelName,
      labelhash: domain.labelhash,
      id: domain.id,
      owner: domain.owner.id,
      resolvedAddress: domain.resolvedAddress?.id || null,
      expiryDate: domain.wrappedDomain?.expiryDate
        ? new Date(parseInt(domain.wrappedDomain.expiryDate) * 1000)
        : null,
      registrationDate: null, // Not available in current subgraph
      isWrapped: !!domain.wrappedDomain,
      parent: domain.parent?.name || null,
      resolver: domain.resolver?.id || null,
      contentHash: domain.resolver?.contentHash || null,
      texts: {},
    }));
  } catch (error) {
    console.error('Error fetching ENS names:', error);
    return [];
  }
}

/**
 * Resolve ENS name to address
 */
export async function resolveENSName(
  client: PublicClient,
  name: string
): Promise<string | null> {
  try {
    const normalizedName = normalize(name);
    const address = await client.getEnsAddress({ name: normalizedName });
    return address;
  } catch (error) {
    console.error('Error resolving ENS name:', error);
    return null;
  }
}

/**
 * Reverse resolve address to ENS name
 */
export async function reverseResolveAddress(
  client: PublicClient,
  address: string
): Promise<string | null> {
  try {
    const name = await client.getEnsName({ address: address as `0x${string}` });
    return name;
  } catch (error) {
    console.error('Error reverse resolving address:', error);
    return null;
  }
}

/**
 * Get ENS text records
 */
export async function getENSTextRecords(
  client: PublicClient,
  name: string,
  keys: string[]
): Promise<Record<string, string>> {
  const records: Record<string, string> = {};
  
  try {
    const normalizedName = normalize(name);
    
    for (const key of keys) {
      try {
        const value = await client.getEnsText({
          name: normalizedName,
          key,
        });
        if (value) {
          records[key] = value;
        }
      } catch (error) {
        // Continue on error for individual records
      }
    }
  } catch (error) {
    console.error('Error fetching text records:', error);
  }

  return records;
}

/**
 * Get ENS avatar
 */
export async function getENSAvatar(
  client: PublicClient,
  name: string
): Promise<string | null> {
  try {
    const normalizedName = normalize(name);
    const avatar = await client.getEnsAvatar({ name: normalizedName });
    return avatar;
  } catch (error) {
    console.error('Error fetching ENS avatar:', error);
    return null;
  }
}

/**
 * Get ENS resolver address
 */
export async function getENSResolver(
  client: PublicClient,
  name: string
): Promise<string | null> {
  try {
    const normalizedName = normalize(name);
    const resolver = await client.getEnsResolver({ name: normalizedName });
    return resolver || null;
  } catch (error) {
    console.error('Error fetching ENS resolver:', error);
    return null;
  }
}

/**
 * Check if name is available for registration
 */
export async function checkNameAvailability(
  client: PublicClient,
  name: string
): Promise<boolean> {
  try {
    const normalizedName = normalize(name);
    const owner = await client.getEnsAddress({ name: normalizedName });
    return !owner; // Available if no owner
  } catch (error) {
    return true; // Assume available on error
  }
}

/**
 * Calculate days until expiration
 */
export function getDaysUntilExpiration(expiryDate: Date | null): number | null {
  if (!expiryDate) return null;
  
  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Format expiration status
 */
export function getExpirationStatus(
  expiryDate: Date | null
): 'expired' | 'expiring-soon' | 'active' | 'unknown' {
  const days = getDaysUntilExpiration(expiryDate);
  
  if (days === null) return 'unknown';
  if (days < 0) return 'expired';
  if (days < 90) return 'expiring-soon';
  return 'active';
}

/**
 * Standard text record keys
 */
export const STANDARD_TEXT_KEYS = [
  'avatar',
  'description',
  'display',
  'email',
  'keywords',
  'mail',
  'notice',
  'location',
  'phone',
  'url',
  'com.github',
  'com.twitter',
  'com.discord',
  'com.reddit',
  'com.telegram',
  'org.telegram',
];

/**
 * Get all standard text records for a name
 */
export async function getAllTextRecords(
  client: PublicClient,
  name: string
): Promise<ENSTextRecord[]> {
  const records = await getENSTextRecords(client, name, STANDARD_TEXT_KEYS);
  
  return Object.entries(records).map(([key, value]) => ({
    key,
    value,
  }));
}

/**
 * Format address for display
 */
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
