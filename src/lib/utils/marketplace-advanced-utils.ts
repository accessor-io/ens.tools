/**
 * Advanced Marketplace Utilities
 * Enhanced filtering, search, and domain analysis features
 */

import { parseEther } from 'viem';

export interface AdvancedFilters {
  // Domain characteristics
  length?: { min?: number; max?: number };
  pattern?: 'numbers' | 'letters' | 'alphanumeric' | 'emoji' | 'mixed';
  characterType?: 'letters-only' | 'numbers-only' | 'alphanumeric' | 'special' | 'emoji';
  
  // Domain status
  expiryRange?: { from?: Date; to?: Date };
  registrationRange?: { from?: Date; to?: Date };
  hasSubdomains?: boolean;
  hasAvatar?: boolean;
  hasResolver?: boolean;
  isWrapped?: boolean;
  
  // Market filters
  priceRange?: { min?: string; max?: string };
  listedOnly?: boolean;
  hasOffers?: boolean;
  lastSaleRange?: { from?: Date; to?: Date };
  
  // Categories
  category?: DomainCategory[];
  premium?: boolean;
}

export type DomainCategory = 
  | 'premium'      // High-value domains
  | '3-letter'     // 3 character domains
  | '4-letter'     // 4 character domains
  | '5-letter'     // 5 character domains
  | 'numeric'      // Numbers only
  | 'brandable'    // Good for brands
  | 'generic'      // Common words
  | 'geographic'   // Location names
  | 'emoji'        // Contains emoji
  | 'subdomain';   // Is a subdomain

export interface EnhancedDomainInfo {
  // Basic info
  name: string;
  namehash: string;
  tokenId: string;
  
  // Enhanced characteristics
  characterLength: number;
  hasNumbers: boolean;
  hasLetters: boolean;
  hasEmoji: boolean;
  hasSpecialChars: boolean;
  isSubdomain: boolean;
  parentDomain?: string;
  
  // Categories
  categories: DomainCategory[];
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  
  // Market data
  lastSalePrice?: string;
  lastSaleDate?: Date;
  priceHistory?: PricePoint[];
  views: number;
  watchlistCount: number;
  offerCount: number;
  
  // ENS specific
  registrationDate?: Date;
  expiryDate?: Date;
  isWrapped: boolean;
  resolver?: string;
  records?: Record<string, string>;
  subdomainCount: number;
}

export interface PricePoint {
  date: Date;
  price: string;
  type: 'listing' | 'sale' | 'offer';
}

/**
 * Analyze domain characteristics
 */
export function analyzeDomain(name: string): Partial<EnhancedDomainInfo> {
  const cleanName = name.toLowerCase().replace('.eth', '');
  const isSubdomain = name.split('.').length > 2;
  const parentDomain = isSubdomain ? name.split('.').slice(1).join('.') : undefined;
  
  const hasNumbers = /\d/.test(cleanName);
  const hasLetters = /[a-z]/i.test(cleanName);
  const hasEmoji = /[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(cleanName);
  const hasSpecialChars = /[^a-z0-9]/i.test(cleanName) && !hasEmoji;
  
  const categories = determineCategories(cleanName, {
    hasNumbers,
    hasLetters,
    hasEmoji,
    hasSpecialChars,
    isSubdomain,
  });
  
  const rarity = determineRarity(cleanName.length, categories);
  
  return {
    name,
    characterLength: cleanName.length,
    hasNumbers,
    hasLetters,
    hasEmoji,
    hasSpecialChars,
    isSubdomain,
    parentDomain,
    categories,
    rarity,
  };
}

/**
 * Determine domain categories
 */
function determineCategories(
  name: string,
  characteristics: {
    hasNumbers: boolean;
    hasLetters: boolean;
    hasEmoji: boolean;
    hasSpecialChars: boolean;
    isSubdomain: boolean;
  }
): DomainCategory[] {
  const categories: DomainCategory[] = [];
  
  // Length-based categories
  if (name.length === 3) categories.push('3-letter');
  if (name.length === 4) categories.push('4-letter');
  if (name.length === 5) categories.push('5-letter');
  
  // Pattern-based categories
  if (!characteristics.hasLetters && characteristics.hasNumbers) {
    categories.push('numeric');
  }
  
  if (characteristics.hasEmoji) {
    categories.push('emoji');
  }
  
  if (characteristics.isSubdomain) {
    categories.push('subdomain');
  }
  
  // Premium detection (simple heuristic)
  if (name.length <= 3 || isPremiumWord(name)) {
    categories.push('premium');
  }
  
  // Brandable detection
  if (isBrandable(name)) {
    categories.push('brandable');
  }
  
  // Geographic detection
  if (isGeographic(name)) {
    categories.push('geographic');
  }
  
  return categories;
}

/**
 * Determine domain rarity
 */
function determineRarity(length: number, categories: DomainCategory[]): 'common' | 'uncommon' | 'rare' | 'legendary' {
  if (length === 1) return 'legendary';
  if (length === 2) return 'legendary';
  if (length === 3) return 'rare';
  if (categories.includes('premium')) return 'rare';
  if (length === 4 && categories.includes('numeric')) return 'rare';
  if (length === 4) return 'uncommon';
  if (length <= 6) return 'uncommon';
  return 'common';
}

/**
 * Check if name is a premium word
 */
function isPremiumWord(name: string): boolean {
  const premiumWords = [
    'eth', 'ethereum', 'crypto', 'defi', 'nft', 'dao', 'web3',
    'money', 'cash', 'gold', 'silver', 'diamond', 'luxury',
    'meta', 'verse', 'digital', 'virtual', 'cyber',
    'king', 'queen', 'royal', 'elite', 'premium',
    'bank', 'finance', 'trade', 'exchange', 'market',
    'tech', 'labs', 'studio', 'agency', 'company',
  ];
  
  return premiumWords.includes(name.toLowerCase());
}

/**
 * Check if name is brandable
 */
function isBrandable(name: string): boolean {
  // Simple heuristic: 4-8 letters, pronounceable, no numbers
  if (name.length < 4 || name.length > 8) return false;
  if (/\d/.test(name)) return false;
  if (!/^[a-z]+$/i.test(name)) return false;
  
  // Check for vowels (basic pronounceability check)
  const vowelCount = (name.match(/[aeiou]/gi) || []).length;
  const consonantCount = name.length - vowelCount;
  
  // Should have reasonable vowel/consonant ratio
  return vowelCount >= 1 && consonantCount >= 1;
}

/**
 * Check if name is geographic
 */
function isGeographic(name: string): boolean {
  const geoTerms = [
    'usa', 'uk', 'eu', 'asia', 'africa', 'america', 'europe',
    'london', 'paris', 'tokyo', 'newyork', 'sf', 'la', 'miami',
    'singapore', 'dubai', 'moscow', 'beijing', 'shanghai',
    'global', 'world', 'international', 'national',
  ];
  
  return geoTerms.some(term => name.toLowerCase().includes(term));
}

/**
 * Apply advanced filters to domain list
 */
export function applyAdvancedFilters<T extends { name: string; price?: string; expiryDate?: Date | null }>(
  domains: T[],
  filters: AdvancedFilters
): T[] {
  return domains.filter(domain => {
    const analysis = analyzeDomain(domain.name);
    
    // Length filter
    if (filters.length) {
      if (filters.length.min && analysis.characterLength! < filters.length.min) return false;
      if (filters.length.max && analysis.characterLength! > filters.length.max) return false;
    }
    
    // Pattern filter
    if (filters.pattern) {
      switch (filters.pattern) {
        case 'numbers':
          if (!analysis.hasNumbers || analysis.hasLetters) return false;
          break;
        case 'letters':
          if (analysis.hasNumbers || !analysis.hasLetters) return false;
          break;
        case 'alphanumeric':
          if (!analysis.hasNumbers || !analysis.hasLetters) return false;
          break;
        case 'emoji':
          if (!analysis.hasEmoji) return false;
          break;
        case 'mixed':
          if (!analysis.hasSpecialChars && !analysis.hasEmoji) return false;
          break;
      }
    }
    
    // Category filter
    if (filters.category && filters.category.length > 0) {
      const hasMatchingCategory = filters.category.some(cat => 
        analysis.categories?.includes(cat)
      );
      if (!hasMatchingCategory) return false;
    }
    
    // Price range filter
    if (filters.priceRange && domain.price) {
      const price = parseFloat(domain.price);
      if (filters.priceRange.min && price < parseFloat(filters.priceRange.min)) return false;
      if (filters.priceRange.max && price > parseFloat(filters.priceRange.max)) return false;
    }
    
    // Expiry date filter
    if (filters.expiryRange && domain.expiryDate) {
      const expiryDate = domain.expiryDate instanceof Date ? domain.expiryDate : new Date(domain.expiryDate);
      if (filters.expiryRange.from && expiryDate < filters.expiryRange.from) return false;
      if (filters.expiryRange.to && expiryDate > filters.expiryRange.to) return false;
    }
    
    // Subdomain filter
    if (filters.hasSubdomains !== undefined) {
      if (filters.hasSubdomains !== analysis.isSubdomain) return false;
    }
    
    return true;
  });
}

/**
 * Sort domains by relevance score
 */
export function sortByRelevance<T extends { name: string }>(
  domains: T[],
  searchQuery: string
): T[] {
  if (!searchQuery) return domains;
  
  const query = searchQuery.toLowerCase();
  
  return [...domains].sort((a, b) => {
    const scoreA = calculateRelevanceScore(a.name, query);
    const scoreB = calculateRelevanceScore(b.name, query);
    return scoreB - scoreA;
  });
}

/**
 * Calculate relevance score for search
 */
function calculateRelevanceScore(name: string, query: string): number {
  const cleanName = name.toLowerCase().replace('.eth', '');
  let score = 0;
  
  // Exact match
  if (cleanName === query) score += 100;
  
  // Starts with query
  if (cleanName.startsWith(query)) score += 50;
  
  // Contains query
  if (cleanName.includes(query)) score += 25;
  
  // Length similarity
  const lengthDiff = Math.abs(cleanName.length - query.length);
  score += Math.max(0, 10 - lengthDiff);
  
  // Character match percentage
  const matchCount = query.split('').filter(char => cleanName.includes(char)).length;
  score += (matchCount / query.length) * 20;
  
  return score;
}

/**
 * Get suggested filters based on current results
 */
export function getSuggestedFilters<T extends { name: string }>(
  domains: T[]
): Partial<AdvancedFilters> {
  const analyses = domains.map(d => analyzeDomain(d.name));
  
  // Find common patterns
  const lengths = analyses.map(a => a.characterLength!);
  const minLength = Math.min(...lengths);
  const maxLength = Math.max(...lengths);
  
  const categories = new Set<DomainCategory>();
  analyses.forEach(a => a.categories?.forEach(c => categories.add(c)));
  
  return {
    length: { min: minLength, max: maxLength },
    category: Array.from(categories).slice(0, 5), // Top 5 categories
  };
}

/**
 * Domain price estimation based on characteristics
 */
export function estimateDomainValue(name: string): {
  estimatedPrice: string;
  priceRange: { min: string; max: string };
  factors: string[];
} {
  const analysis = analyzeDomain(name);
  let basePrice = 0.01; // Base price in ETH
  const factors: string[] = [];
  
  // Length-based pricing
  if (analysis.characterLength === 3) {
    basePrice *= 100;
    factors.push('3-character premium');
  } else if (analysis.characterLength === 4) {
    basePrice *= 10;
    factors.push('4-character value');
  } else if (analysis.characterLength === 5) {
    basePrice *= 2;
    factors.push('5-character name');
  }
  
  // Category multipliers
  if (analysis.categories?.includes('premium')) {
    basePrice *= 5;
    factors.push('Premium word');
  }
  
  if (analysis.categories?.includes('numeric')) {
    basePrice *= 1.5;
    factors.push('Numeric domain');
  }
  
  if (analysis.categories?.includes('brandable')) {
    basePrice *= 1.2;
    factors.push('Brandable name');
  }
  
  // Rarity multiplier
  switch (analysis.rarity) {
    case 'legendary':
      basePrice *= 10;
      factors.push('Legendary rarity');
      break;
    case 'rare':
      basePrice *= 3;
      factors.push('Rare domain');
      break;
    case 'uncommon':
      basePrice *= 1.5;
      factors.push('Uncommon domain');
      break;
  }
  
  // Calculate range (±30%)
  const minPrice = basePrice * 0.7;
  const maxPrice = basePrice * 1.3;
  
  return {
    estimatedPrice: basePrice.toFixed(4),
    priceRange: {
      min: minPrice.toFixed(4),
      max: maxPrice.toFixed(4),
    },
    factors,
  };
}






