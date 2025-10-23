import { ENSDomain } from '../ens/ens-utils';

export interface NameBrowserFilters {
  expiringSoon?: boolean; // Names expiring within 90 days
  gracePeriod?: boolean; // Names expired but within grace period (typically 90 days)
  expired?: boolean; // Names expired beyond grace period
  premium?: boolean; // Names with premium pricing
  minLength?: number;
  maxLength?: number;
  searchTerm?: string;
}

export interface NameBrowserResult {
  domains: ENSDomain[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * Service for browsing ENS names based on expiration status and other filters
 */
export class NameBrowserService {
  private readonly GRAPH_URL = 'https://api.thegraph.com/subgraphs/name/ensdomains/ens';
  private readonly GRACE_PERIOD_DAYS = 90;
  private readonly EXPIRING_SOON_DAYS = 90;

  /**
   * Fetch names by expiration status
   */
  async fetchNamesByStatus(
    status: 'expiring-soon' | 'grace-period' | 'expired' | 'premium',
    limit: number = 50,
    skip: number = 0
  ): Promise<ENSDomain[]> {
    const now = Math.floor(Date.now() / 1000);
    const gracePeriodEnd = now - (this.GRACE_PERIOD_DAYS * 24 * 60 * 60);
    const expiringSoonThreshold = now + (this.EXPIRING_SOON_DAYS * 24 * 60 * 60);

    let query: string;
    let variables: any = { limit, skip };

    switch (status) {
      case 'expiring-soon':
        query = `
          query GetExpiringSoonNames($limit: Int!, $skip: Int!, $now: BigInt!, $threshold: BigInt!) {
            domains(
              first: $limit
              skip: $skip
              orderBy: expiryDate
              orderDirection: asc
              where: {
                expiryDate_gt: $now
                expiryDate_lte: $threshold
              }
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
        variables.now = now.toString();
        variables.threshold = expiringSoonThreshold.toString();
        break;

      case 'grace-period':
        query = `
          query GetGracePeriodNames($limit: Int!, $skip: Int!, $now: BigInt!, $graceEnd: BigInt!) {
            domains(
              first: $limit
              skip: $skip
              orderBy: expiryDate
              orderDirection: asc
              where: {
                expiryDate_lt: $now
                expiryDate_gte: $graceEnd
              }
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
        variables.now = now.toString();
        variables.graceEnd = gracePeriodEnd.toString();
        break;

      case 'expired':
        query = `
          query GetExpiredNames($limit: Int!, $skip: Int!, $graceEnd: BigInt!) {
            domains(
              first: $limit
              skip: $skip
              orderBy: expiryDate
              orderDirection: asc
              where: {
                expiryDate_lt: $graceEnd
              }
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
        variables.graceEnd = gracePeriodEnd.toString();
        break;

      case 'premium':
        // Premium names are typically short names (3-5 characters)
        query = `
          query GetPremiumNames($limit: Int!, $skip: Int!) {
            domains(
              first: $limit
              skip: $skip
              orderBy: createdAt
              orderDirection: desc
              where: {
                labelName_gte: "a"
                labelName_lte: "zzzzz"
              }
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
        break;

      default:
        return [];
    }

    try {
      const response = await fetch(this.GRAPH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      });

      const result = await response.json();

      if (result.errors) {
        console.error('GraphQL errors:', result.errors);
        return [];
      }

      const domains = result.data?.domains || [];

      return domains.map((domain: any) => {
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
      console.error('Error fetching names by status:', error);
      return [];
    }
  }

  /**
   * Filter premium names by length
   */
  private isPremiumName(name: string): boolean {
    if (!name) return false;
    const label = name.split('.')[0];
    return label.length >= 1 && label.length <= 5;
  }

  /**
   * Filter domains based on custom filters
   */
  filterDomains(domains: ENSDomain[], filters: NameBrowserFilters): ENSDomain[] {
    return domains.filter((domain) => {
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        if (!domain.name.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      if (filters.minLength !== undefined || filters.maxLength !== undefined) {
        const labelLength = domain.labelName?.length || domain.name.split('.')[0].length;
        if (filters.minLength !== undefined && labelLength < filters.minLength) {
          return false;
        }
        if (filters.maxLength !== undefined && labelLength > filters.maxLength) {
          return false;
        }
      }

      if (filters.premium && !this.isPremiumName(domain.name)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Calculate days until expiration (can be negative for expired names)
   */
  calculateDaysUntilExpiration(expiryDate: Date | null): number | null {
    if (!expiryDate) return null;
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get expiration status for a domain
   */
  getExpirationStatus(expiryDate: Date | null): 'active' | 'expiring-soon' | 'grace-period' | 'expired' | 'unknown' {
    const days = this.calculateDaysUntilExpiration(expiryDate);
    
    if (days === null) return 'unknown';
    if (days < -this.GRACE_PERIOD_DAYS) return 'expired';
    if (days < 0) return 'grace-period';
    if (days < this.EXPIRING_SOON_DAYS) return 'expiring-soon';
    return 'active';
  }
}

export const nameBrowserService = new NameBrowserService();

