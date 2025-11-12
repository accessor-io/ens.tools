/**
 * Marketplace utility functions
 * Price formatting, sorting, filtering, and other marketplace helpers
 */

import { formatUnits, parseUnits } from 'viem';

export type SortOption = 'price-asc' | 'price-desc' | 'date-asc' | 'date-desc' | 'name-asc' | 'name-desc';
export type FilterOption = {
  minPrice?: string;
  maxPrice?: string;
  status?: string[];
  currency?: string;
};

/**
 * Format price with proper decimals and currency symbol
 */
export function formatPrice(price: string | number, currency: string = 'ETH', decimals: number = 4): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (isNaN(numPrice) || numPrice === 0) {
    return `0 ${currency}`;
  }

  if (numPrice < 0.0001) {
    return `<0.0001 ${currency}`;
  }

  const formatted = numPrice.toFixed(decimals);
  // Remove trailing zeros
  const trimmed = formatted.replace(/\.?0+$/, '');
  
  return `${trimmed} ${currency}`;
}

/**
 * Format price in USD (if conversion rate available)
 */
export function formatPriceUSD(price: string | number, ethPrice: number | null = null): string {
  if (!ethPrice) return '';
  
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  const usdPrice = numPrice * ethPrice;
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usdPrice);
}

/**
 * Parse price string to number
 */
export function parsePrice(price: string): number {
  const cleaned = price.replace(/[^\d.]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Sort listings by various criteria
 */
export function sortListings<T extends { price: string; listingDate?: string; name?: string; tokenName?: string }>(
  listings: T[],
  sortBy: SortOption
): T[] {
  const sorted = [...listings];

  switch (sortBy) {
    case 'price-asc':
      return sorted.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    case 'price-desc':
      return sorted.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    case 'date-asc':
      return sorted.sort((a, b) => {
        const dateA = a.listingDate ? new Date(a.listingDate).getTime() : 0;
        const dateB = b.listingDate ? new Date(b.listingDate).getTime() : 0;
        return dateA - dateB;
      });
    case 'date-desc':
      return sorted.sort((a, b) => {
        const dateA = a.listingDate ? new Date(a.listingDate).getTime() : 0;
        const dateB = b.listingDate ? new Date(b.listingDate).getTime() : 0;
        return dateB - dateA;
      });
    case 'name-asc':
      return sorted.sort((a, b) => {
        const nameA = (a.name || a.tokenName || '').toLowerCase();
        const nameB = (b.name || b.tokenName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    case 'name-desc':
      return sorted.sort((a, b) => {
        const nameA = (a.name || a.tokenName || '').toLowerCase();
        const nameB = (b.name || b.tokenName || '').toLowerCase();
        return nameB.localeCompare(nameA);
      });
    default:
      return sorted;
  }
}

/**
 * Filter listings by various criteria
 */
export function filterListings<T extends { price: string; currency?: string; status?: string }>(
  listings: T[],
  filters: FilterOption
): T[] {
  return listings.filter((listing) => {
    // Price filter
    if (filters.minPrice !== undefined) {
      const price = parsePrice(listing.price);
      if (price < parsePrice(filters.minPrice)) return false;
    }
    if (filters.maxPrice !== undefined) {
      const price = parsePrice(listing.price);
      if (price > parsePrice(filters.maxPrice)) return false;
    }

    // Currency filter
    if (filters.currency && listing.currency !== filters.currency) {
      return false;
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      if (!listing.status || !filters.status.includes(listing.status)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Truncate address for display
 */
export function truncateAddress(address: string, start: number = 6, end: number = 4): string {
  if (!address || address.length < start + end) {
    return address;
  }
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

/**
 * Calculate time until expiry
 */
export function getTimeUntilExpiry(expiryDate: Date | string | null | undefined): string {
  if (!expiryDate) return 'N/A';
  
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();

  if (diff < 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Paginate array
 */
export function paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; totalPages: number; totalItems: number } {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedItems = items.slice(start, end);
  const totalPages = Math.ceil(items.length / pageSize);

  return {
    items: paginatedItems,
    totalPages,
    totalItems: items.length,
  };
}

/**
 * Validate ENS name
 */
export function isValidENSName(name: string): boolean {
  if (!name) return false;
  const ensRegex = /^[a-z0-9-]+\.eth$/i;
  return ensRegex.test(name) || name.includes('.');
}

/**
 * Normalize ENS name
 */
export function normalizeENSName(name: string): string {
  return name.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
}







