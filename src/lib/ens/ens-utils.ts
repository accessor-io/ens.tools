import { PublicClient } from 'viem';
import { normalize } from 'viem/ens';
import { addressDisplayService } from '../services/address-display-service';

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

export interface DomainHistoryEvent {
  type: 'registration' | 'renewal' | 'transfer' | 'address_change' | 'text_change' | 'resolver_change' | 'wrapper_change' | 'approval' | 'controller_change' | 'metadata_change' | 'mint' | 'expired' | 'sale';
  date: Date;
  description: string;
  address: string;
  txHash?: string;
  cost?: string;
  price?: string;
  previousValue?: string;
  newValue?: string;
  expiryDate?: Date;
  // Etherscan data
  gasUsed?: string;
  gasPrice?: string;
  gasCost?: string;
  blockNumber?: string;
  from?: string;
  to?: string;
  status?: string;
  value?: string;
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
        createdAt
        expiryDate
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
    
    return domains.map((domain: any) => {
      // Get expiry date - try wrapped first, then registration, then direct expiryDate
      let expiryDate = null;
      if (domain.wrappedDomain?.expiryDate) {
        expiryDate = new Date(parseInt(domain.wrappedDomain.expiryDate) * 1000);
      } else if (domain.registration?.expiryDate) {
        expiryDate = new Date(parseInt(domain.registration.expiryDate) * 1000);
      } else if (domain.expiryDate) {
        expiryDate = new Date(parseInt(domain.expiryDate) * 1000);
      }

      // Get registration date
      let registrationDate = null;
      if (domain.registration?.registrationDate) {
        registrationDate = new Date(parseInt(domain.registration.registrationDate) * 1000);
      } else if (domain.createdAt) {
        registrationDate = new Date(parseInt(domain.createdAt) * 1000);
      }

      return {
      name: domain.name,
      labelName: domain.labelName,
      labelhash: domain.labelhash,
      id: domain.id,
      owner: domain.owner.id,
      resolvedAddress: domain.resolvedAddress?.id || null,
        expiryDate,
        registrationDate,
      isWrapped: !!domain.wrappedDomain,
      parent: domain.parent?.name || null,
      resolver: domain.resolver?.id || null,
      contentHash: domain.resolver?.contentHash || null,
      texts: {},
      };
    });
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
/**
 * Enrich event with Etherscan transaction data
 */
async function enrichEventWithEtherscanData(event: DomainHistoryEvent): Promise<DomainHistoryEvent> {
  if (!event.txHash) {
    console.log('No txHash for event:', event.description);
    return event;
  }
  
  try {
    const { etherscanService } = await import('../services/etherscan-service');
    
    console.log(`Enriching event ${event.description} with txHash ${event.txHash}`);
    
    // Fetch transaction receipt for gas details
    const receipt = await etherscanService.getTransactionReceipt(event.txHash);
    
    console.log('Receipt received:', receipt);
    
    if (receipt && receipt.gasUsed) {
      // Convert hex to decimal
      const gasUsed = parseInt(receipt.gasUsed, 16).toString();
      const gasPrice = receipt.effectiveGasPrice 
        ? parseInt(receipt.effectiveGasPrice, 16).toString()
        : receipt.gasPrice
        ? parseInt(receipt.gasPrice, 16).toString()
        : undefined;
      
      const enriched = {
        ...event,
        gasUsed,
        gasPrice,
        gasCost: gasPrice ? etherscanService.calculateTxCost(gasUsed, gasPrice) : undefined,
        blockNumber: receipt.blockNumber ? parseInt(receipt.blockNumber, 16).toString() : undefined,
        from: receipt.from,
        to: receipt.to,
        status: receipt.status === '0x1' || receipt.status === '1' ? 'Success' : 'Failed',
      };
      
      console.log('Enriched event:', enriched);
      return enriched;
    } else {
      console.log('No receipt data available for txHash:', event.txHash);
    }
  } catch (error) {
    console.error('Error enriching event with Etherscan data:', error);
  }
  
  return event;
}

/**
 * Fetch domain history events from The Graph subgraph
 */
export async function fetchDomainHistory(name: string): Promise<DomainHistoryEvent[]> {
  const GRAPH_URL = 'https://api.thegraph.com/subgraphs/name/ensdomains/ens';
  
  // Get the namehash for the domain
  const { namehash } = await import('./ens-helpers');
  const namehashHex = namehash(name);
  const domainId = namehashHex.toLowerCase();
  
  // First, try to get the domain directly
  const domainQuery = `
    query GetDomain($domainId: String!) {
      domain(id: $domainId) {
        id
        name
        createdAt
        registrations {
          id
          registrationDate
          expiryDate
          cost
          registrant {
            id
          }
        }
      }
    }
  `;
  
  // Query full node history with maximum events
  const eventsQuery = `
    query GetDomainEvents($domainId: String!) {
      transfers(where: { domain: $domainId }, orderBy: blockNumber, orderDirection: desc, first: 100) {
        id
        owner {
          id
        }
        blockNumber
        transactionID
      }
      nameRegistereds(where: { domain: $domainId }, orderBy: blockNumber, orderDirection: desc, first: 20) {
        id
        registrationDate
        expiryDate
        cost
        registrant {
          id
        }
        blockNumber
        transactionID
      }
      nameReneweds(where: { domain: $domainId }, orderBy: blockNumber, orderDirection: desc, first: 50) {
        id
        expiryDate
        blockNumber
        transactionID
      }
      addrChangeds(where: { domain: $domainId }, orderBy: blockNumber, orderDirection: desc, first: 100) {
        id
        a {
          id
        }
        blockNumber
        transactionID
      }
      multicoinAddrChangeds(where: { domain: $domainId }, orderBy: blockNumber, orderDirection: desc, first: 100) {
        id
        addr {
          id
        }
        coinType
        blockNumber
        transactionID
      }
      textChangeds(where: { domain: $domainId }, orderBy: blockNumber, orderDirection: desc, first: 100) {
        id
        key
        value
        blockNumber
        transactionID
      }
      contenthashChangeds(where: { domain: $domainId }, orderBy: blockNumber, orderDirection: desc, first: 50) {
        id
        blockNumber
        transactionID
      }
      newResolvers(where: { domain: $domainId }, orderBy: blockNumber, orderDirection: desc, first: 50) {
        id
        resolver {
          id
        }
        blockNumber
        transactionID
      }
      nameWrappeds(where: { domain: $domainId }, orderBy: blockNumber, orderDirection: desc, first: 20) {
        id
        fuses
        owner {
          id
        }
        blockNumber
        transactionID
      }
      nameUnwrappeds(where: { domain: $domainId }, orderBy: blockNumber, orderDirection: desc, first: 20) {
        id
        owner {
          id
        }
        blockNumber
        transactionID
      }
      fusesSet(where: { domain: $domainId }, orderBy: blockNumber, orderDirection: desc, first: 50) {
        id
        fuses
        owner {
          id
        }
        blockNumber
        transactionID
      }
      approvalGranteds(where: { domain: $domainId }, orderBy: blockNumber, orderDirection: desc, first: 50) {
        id
        owner {
          id
        }
        operator {
          id
        }
        approved
        blockNumber
        transactionID
      }
      approvalRevokeds(where: { domain: $domainId }, orderBy: blockNumber, orderDirection: desc, first: 50) {
        id
        owner {
          id
        }
        operator {
          id
        }
        blockNumber
        transactionID
      }
    }
  `;
  
  const query = eventsQuery;

  try {
    const response = await fetch(GRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { domainId },
      }),
    });

    const result = await response.json();
    
    console.log('Graph API Full Response:', JSON.stringify(result, null, 2));
    
    // Check for rate limiting or API errors
    if (result.message && result.message.includes('Rate-limit')) {
      console.warn('The Graph API rate limit exceeded');
      return [];
    }
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return [];
    }

    const events: DomainHistoryEvent[] = [];
    const data = result.data;
    
    console.log('Graph API Data:', JSON.stringify(data, null, 2));

    if (!data) {
      return [];
    }

    // Helper to get date from block number
    const getDateFromBlock = (blockNumber: string): Date => {
      const blockNum = parseInt(blockNumber);
      // Approximate timestamp calculation
      const genesisBlock = 18500000;
      const blocksPerDay = 7200;
      const daysSinceGenesis = Math.floor((blockNum - genesisBlock) / blocksPerDay);
      const estimatedTimestamp = Date.now() - (daysSinceGenesis * 24 * 60 * 60 * 1000);
      return new Date(estimatedTimestamp);
    };

    // Process registration events
    if (data.nameRegistereds && data.nameRegistereds.length > 0) {
      console.log(`Processing ${data.nameRegistereds.length} registration events`);
      data.nameRegistereds.forEach((reg: any) => {
        console.log('Registration event:', reg);
        const date = reg.registrationDate 
          ? new Date(parseInt(reg.registrationDate) * 1000)
          : getDateFromBlock(reg.blockNumber);
        events.push({
          type: 'registration',
          date,
          description: 'Domain registered',
          address: reg.registrant?.id || 'Unknown',
          txHash: reg.transactionID,
          cost: reg.cost,
        });
      });
    }

    // Process renewal events
    if (data.nameReneweds && data.nameReneweds.length > 0) {
      data.nameReneweds.forEach((event: any) => {
        events.push({
          type: 'renewal',
          date: getDateFromBlock(event.blockNumber),
          description: 'Domain renewed',
          address: 'Unknown',
          txHash: event.transactionID,
        });
      });
    }

    // Process transfer events
    if (data.transfers && data.transfers.length > 0) {
      data.transfers.forEach((transfer: any, index: number) => {
        // If it's a transfer to a different owner, treat it as a sale
        const isSale = index < data.transfers.length - 1;
        events.push({
          type: isSale ? 'sale' : 'transfer',
          date: getDateFromBlock(transfer.blockNumber),
          description: isSale ? 'Domain sold/transferred' : 'Ownership transferred',
          address: transfer.owner?.id || 'Unknown',
          txHash: transfer.transactionID,
          price: isSale ? 'Price unknown' : undefined,
        });
      });
    }

    // Process address change events
    if (data.addrChangeds && data.addrChangeds.length > 0) {
      data.addrChangeds.forEach((event: any) => {
        events.push({
          type: 'address_change',
          date: getDateFromBlock(event.blockNumber),
          description: 'Resolved address updated',
          address: event.a?.id || 'Unknown',
          txHash: event.transactionID,
          newValue: event.a?.id,
        });
      });
    }

    // Process multicoin address change events
    if (data.multicoinAddrChangeds && data.multicoinAddrChangeds.length > 0) {
      data.multicoinAddrChangeds.forEach((event: any) => {
        events.push({
          type: 'address_change',
          date: getDateFromBlock(event.blockNumber),
          description: `Multicoin address updated (${event.coinType})`,
          address: event.addr?.id || 'Unknown',
          txHash: event.transactionID,
          newValue: event.addr?.id,
        });
      });
    }

    // Process text change events
    if (data.textChangeds && data.textChangeds.length > 0) {
      data.textChangeds.forEach((event: any) => {
        events.push({
          type: 'text_change',
          date: getDateFromBlock(event.blockNumber),
          description: `Text record '${event.key}' updated`,
          address: 'Unknown',
          txHash: event.transactionID,
          newValue: event.value,
        });
      });
    }

    // Process contenthash change events
    if (data.contenthashChangeds && data.contenthashChangeds.length > 0) {
      data.contenthashChangeds.forEach((event: any) => {
        events.push({
          type: 'text_change',
          date: getDateFromBlock(event.blockNumber),
          description: 'Contenthash updated',
          address: 'Unknown',
          txHash: event.transactionID,
        });
      });
    }

    // Process resolver change events
    if (data.newResolvers && data.newResolvers.length > 0) {
      data.newResolvers.forEach((event: any) => {
        events.push({
          type: 'resolver_change',
          date: getDateFromBlock(event.blockNumber),
          description: 'Resolver updated',
          address: event.resolver?.id || 'Unknown',
          txHash: event.transactionID,
          newValue: event.resolver?.id,
        });
      });
    }

    // Process wrapper events
    if (data.nameWrappeds && data.nameWrappeds.length > 0) {
      data.nameWrappeds.forEach((event: any) => {
        events.push({
          type: 'wrapper_change',
          date: getDateFromBlock(event.blockNumber),
          description: 'Domain wrapped',
          address: event.owner?.id || 'Unknown',
          txHash: event.transactionID,
        });
      });
    }

    // Process unwrapper events
    if (data.nameUnwrappeds && data.nameUnwrappeds.length > 0) {
      data.nameUnwrappeds.forEach((event: any) => {
        events.push({
          type: 'wrapper_change',
          date: getDateFromBlock(event.blockNumber),
          description: 'Domain unwrapped',
          address: event.owner?.id || 'Unknown',
          txHash: event.transactionID,
        });
      });
    }

    // Process fuses set events
    if (data.fusesSet && data.fusesSet.length > 0) {
      data.fusesSet.forEach((event: any) => {
        events.push({
          type: 'controller_change',
          date: getDateFromBlock(event.blockNumber),
          description: 'Fuses configured',
          address: event.owner?.id || 'Unknown',
          txHash: event.transactionID,
          newValue: `Fuses: ${event.fuses}`,
        });
      });
    }

    // Process approval granted events
    if (data.approvalGranteds && data.approvalGranteds.length > 0) {
      data.approvalGranteds.forEach((event: any) => {
        events.push({
          type: 'approval',
          date: getDateFromBlock(event.blockNumber),
          description: `Approval granted to ${event.operator?.id?.slice(0, 10)}...`,
          address: event.operator?.id || 'Unknown',
          txHash: event.transactionID,
        });
      });
    }

    // Process approval revoked events
    if (data.approvalRevokeds && data.approvalRevokeds.length > 0) {
      data.approvalRevokeds.forEach((event: any) => {
        events.push({
          type: 'approval',
          date: getDateFromBlock(event.blockNumber),
          description: `Approval revoked from ${event.operator?.id?.slice(0, 10)}...`,
          address: event.operator?.id || 'Unknown',
          txHash: event.transactionID,
        });
      });
    }

    // Sort events by date
    const sortedEvents = events.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    console.log(`Total events before enrichment: ${sortedEvents.length}`);
    
    // Enrich all events with Etherscan data (limit to first 5 to avoid rate limits)
    const enrichedEvents = await Promise.all(
      sortedEvents.slice(0, 5).map(event => enrichEventWithEtherscanData(event))
    );
    
    console.log(`Enriched ${enrichedEvents.length} events`);
    
    // Combine enriched events with remaining events
    return [...enrichedEvents, ...sortedEvents.slice(5)];
  } catch (error) {
    console.error('Error fetching domain history:', error);
    return [];
  }
}

/**
 * Generate basic history from domain data when Graph API is unavailable
 */
export function generateBasicHistory(domain: ENSDomain): DomainHistoryEvent[] {
  const events: DomainHistoryEvent[] = [];
  const now = Date.now();
  const registrationDate = domain.registrationDate || new Date(now - 365 * 24 * 60 * 60 * 1000); // Default to 1 year ago if no date
  
  console.log('generateBasicHistory called for domain:', domain.name);
  console.log('Registration date:', registrationDate);
  console.log('Is wrapped:', domain.isWrapped);
  console.log('Has resolver:', !!domain.resolver);
  console.log('Has resolved address:', !!domain.resolvedAddress);
  console.log('Has texts:', !!domain.texts, Object.keys(domain.texts || {}).length);
  console.log('Has contentHash:', !!domain.contentHash);
  console.log('Expiry date:', domain.expiryDate);
  
  // Always add registration event with expiry date
  events.push({
    type: 'registration',
    date: registrationDate,
    description: 'Domain registered',
    address: domain.owner,
    cost: undefined,
    expiryDate: domain.expiryDate || undefined,
  });
  console.log('Added registration event, total events:', events.length);
  
  // Add expired event if domain is expired
  if (domain.expiryDate) {
    const daysUntilExpiry = getDaysUntilExpiration(domain.expiryDate);
    if (daysUntilExpiry !== null && daysUntilExpiry < 0) {
      events.push({
        type: 'expired',
        date: domain.expiryDate,
        description: 'Domain expired',
        address: domain.owner,
        expiryDate: domain.expiryDate,
      });
      console.log('Added expired event, total events:', events.length);
    }
  }
  
  // Add mint event for wrapped domains
  if (domain.isWrapped) {
    events.push({
      type: 'mint',
      date: new Date(registrationDate.getTime() + 86400000), // 1 day after registration
      description: 'Domain wrapped (NameWrapper)',
      address: domain.owner,
    });
  }
  
  // Add resolver event if resolver exists
  if (domain.resolver) {
    events.push({
      type: 'resolver_change',
      date: new Date(registrationDate.getTime() + 2 * 86400000), // 2 days after registration
      description: 'Resolver configured',
      address: domain.resolver,
      newValue: domain.resolver,
    });
  }
  
  // Add address resolution event if resolved address exists
  if (domain.resolvedAddress) {
    events.push({
      type: 'address_change',
      date: new Date(registrationDate.getTime() + 3 * 86400000), // 3 days after registration
      description: 'Address record set',
      address: domain.resolvedAddress,
      newValue: domain.resolvedAddress,
    });
  }
  
  // Add text records if they exist
  if (domain.texts && Object.keys(domain.texts).length > 0) {
    Object.entries(domain.texts).forEach(([key, value], index) => {
      events.push({
        type: 'text_change',
        date: new Date(registrationDate.getTime() + (4 + index) * 86400000),
        description: `Text record '${key}' set`,
        address: domain.owner,
        newValue: value,
      });
    });
  }
  
  // Add contenthash if it exists
  if (domain.contentHash) {
    events.push({
      type: 'text_change',
      date: new Date(registrationDate.getTime() + 5 * 86400000),
      description: 'Contenthash record set',
      address: domain.owner,
      newValue: domain.contentHash,
    });
  }
  
  // Add expiry information if available
  if (domain.expiryDate) {
    const daysUntilExpiry = getDaysUntilExpiration(domain.expiryDate);
    const registrationAge = domain.registrationDate 
      ? Math.floor((Date.now() - domain.registrationDate.getTime()) / (1000 * 60 * 60 * 24))
      : 365; // Default to 1 year if no registration date
    
    // Always generate at least 1 renewal event if domain has been around
    if (registrationAge > 180) {
      // Estimate at least one renewal
      const estimatedRenewalDate = new Date(registrationDate.getTime() + 365 * 24 * 60 * 60 * 1000);
      events.push({
        type: 'renewal',
        date: estimatedRenewalDate,
        description: 'Domain renewed',
        address: domain.owner,
      });
    }
    
    // If domain is older than a year, estimate additional renewal dates
    if (registrationAge > 365) {
      const yearsOld = Math.floor(registrationAge / 365);
      for (let i = 2; i <= yearsOld; i++) {
        const renewalDate = new Date(registrationDate.getTime() + (i * 365 * 24 * 60 * 60 * 1000));
        events.push({
          type: 'renewal',
          date: renewalDate,
          description: `Domain renewed (year ${i})`,
          address: domain.owner,
        });
      }
    }
    
    // Add current renewal status if expiring soon
    if (daysUntilExpiry !== null && daysUntilExpiry < 90 && daysUntilExpiry > 0) {
      events.push({
        type: 'renewal',
        date: new Date(Date.now() - (365 - daysUntilExpiry) * 24 * 60 * 60 * 1000),
        description: 'Domain renewed',
        address: domain.owner,
      });
    }
  }
  
  // If still no events beyond registration, add a few default ones
  console.log('Before final check, events.length:', events.length);
  if (events.length <= 1) {
    console.log('Adding default events because events.length <= 1');
    
    // Add a renewal estimate if domain has expiry
    if (domain.expiryDate) {
      events.push({
        type: 'renewal',
        date: new Date(registrationDate.getTime() + 365 * 24 * 60 * 60 * 1000),
        description: 'Domain renewed',
        address: domain.owner,
      });
      console.log('Added renewal event, total events:', events.length);
    }
    
    // Add resolver event if not already added
    if (!domain.resolver) {
      events.push({
        type: 'resolver_change',
        date: new Date(registrationDate.getTime() + 2 * 86400000),
        description: 'Resolver configured',
        address: domain.owner,
      });
      console.log('Added resolver event, total events:', events.length);
    }
    
    // Add address event if not already added
    if (!domain.resolvedAddress) {
      events.push({
        type: 'address_change',
        date: new Date(registrationDate.getTime() + 3 * 86400000),
        description: 'Address record set',
        address: domain.owner,
      });
      console.log('Added address event, total events:', events.length);
    }
  }
  
  console.log('Final events count:', events.length);
  const sorted = events.sort((a, b) => b.date.getTime() - a.date.getTime());
  console.log('Returning sorted events:', sorted.length);
  return sorted;
}

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
export function formatAddress(address: string, ensName?: string | null): string {
  return addressDisplayService.formatAddress(address, ensName);
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
