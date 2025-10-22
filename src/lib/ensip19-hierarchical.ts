/**
 * ENSIP-19 Hierarchical Schema System
 * Implements 5-level domain hierarchy with cns.eth root
 */

import { ENSIP19Category, ENSIP19_SUBCATEGORIES } from './ensip19-utils';

/**
 * Domain hierarchy levels
 */
export type HierarchyLevel = 0 | 1 | 2 | 3 | 4;

/**
 * Domain hierarchy node
 */
export interface HierarchyNode {
  level: HierarchyLevel;
  name: string;
  pattern: RegExp;
  description: string;
  parent: string | null;
  inheritsFrom: string[];
  requiredFields: string[];
  optionalFields: string[];
}

/**
 * Hierarchical schema configuration
 */
export const HIERARCHY_CONFIG: Record<HierarchyLevel, HierarchyNode> = {
  0: {
    level: 0,
    name: 'CNS Root',
    pattern: /^cns\.eth$/,
    description: 'Root domain for all ENS metadata',
    parent: null,
    inheritsFrom: [],
    requiredFields: ['ensRoot'],
    optionalFields: ['tags'],
  },
  1: {
    level: 1,
    name: 'Project',
    pattern: /^[a-z0-9-]+\.cns\.eth$/,
    description: 'Project-specific root domain',
    parent: 'cns.eth',
    inheritsFrom: ['cns.eth'],
    requiredFields: ['projectRoot', 'org'],
    optionalFields: ['protocol'],
  },
  2: {
    level: 2,
    name: 'Category',
    pattern: /^[a-z0-9-]+\.[a-z0-9-]+\.cns\.eth$/,
    description: 'Category-specific domain within a project',
    parent: '{project}.cns.eth',
    inheritsFrom: ['{project}.cns.eth', 'cns.eth'],
    requiredFields: ['categoryRoot', 'category'],
    optionalFields: [],
  },
  3: {
    level: 3,
    name: 'Subcategory',
    pattern: /^[a-z0-9-]+\.[a-z0-9-]+\.[a-z0-9-]+\.cns\.eth$/,
    description: 'Subcategory-specific domain within a category',
    parent: '{project}.{category}.cns.eth',
    inheritsFrom: ['{project}.{category}.cns.eth', '{project}.cns.eth', 'cns.eth'],
    requiredFields: ['subcategoryRoot', 'subcategory'],
    optionalFields: [],
  },
  4: {
    level: 4,
    name: 'Contract',
    pattern: /^[a-z0-9-]+\.[a-z0-9-]+\.[a-z0-9-]+\.[a-z0-9-]+\.cns\.eth$/,
    description: 'Individual contract domain',
    parent: '{project}.{category}.{subcategory}.cns.eth',
    inheritsFrom: [
      '{project}.{category}.{subcategory}.cns.eth',
      '{project}.{category}.cns.eth',
      '{project}.cns.eth',
      'cns.eth',
    ],
    requiredFields: ['contractRoot', 'role', 'addresses'],
    optionalFields: ['variant', 'version'],
  },
};

/**
 * Detect hierarchy level from domain name
 */
export function detectHierarchyLevel(domain: string): HierarchyLevel | null {
  for (const [level, config] of Object.entries(HIERARCHY_CONFIG)) {
    if (config.pattern.test(domain)) {
      return parseInt(level) as HierarchyLevel;
    }
  }
  return null;
}

/**
 * Parse hierarchical domain structure
 */
export function parseHierarchicalDomain(domain: string): {
  level: HierarchyLevel;
  org?: string;
  category?: string;
  subcategory?: string;
  contract?: string;
  parent: string | null;
} | null {
  const level = detectHierarchyLevel(domain);
  if (level === null) return null;

  const parts = domain.replace('.cns.eth', '').split('.');

  switch (level) {
    case 0:
      return { level, parent: null };
    case 1:
      return { level, org: parts[0], parent: 'cns.eth' };
    case 2:
      return {
        level,
        org: parts[1],
        category: parts[0],
        parent: `${parts[1]}.cns.eth`,
      };
    case 3:
      return {
        level,
        org: parts[2],
        category: parts[1],
        subcategory: parts[0],
        parent: `${parts[1]}.${parts[2]}.cns.eth`,
      };
    case 4:
      return {
        level,
        org: parts[3],
        category: parts[2],
        subcategory: parts[1],
        contract: parts[0],
        parent: `${parts[1]}.${parts[2]}.${parts[3]}.cns.eth`,
      };
    default:
      return null;
  }
}

/**
 * Generate hierarchical domain structure
 */
export function generateHierarchicalDomain(params: {
  org: string;
  category?: ENSIP19Category;
  subcategory?: string;
  contract?: string;
}): string {
  const parts: string[] = [];

  if (params.contract) {
    parts.push(params.contract);
  }
  if (params.subcategory) {
    parts.push(params.subcategory);
  }
  if (params.category) {
    parts.push(params.category);
  }
  parts.push(params.org);
  parts.push('cns', 'eth');

  return parts.join('.');
}

/**
 * Get inheritance chain for a domain
 */
export function getInheritanceChain(domain: string): string[] {
  const parsed = parseHierarchicalDomain(domain);
  if (!parsed) return [];

  const chain: string[] = [domain];
  let current = parsed.parent;

  while (current) {
    chain.push(current);
    const parentParsed = parseHierarchicalDomain(current);
    current = parentParsed?.parent || null;
  }

  return chain;
}

/**
 * Validate subcategory for category
 */
export function validateSubcategoryForCategory(
  category: ENSIP19Category,
  subcategory: string
): boolean {
  const validSubcategories = ENSIP19_SUBCATEGORIES[category];
  return validSubcategories ? validSubcategories.includes(subcategory) : false;
}

/**
 * Get recommended subcategories for category
 */
export function getRecommendedSubcategories(category: ENSIP19Category): string[] {
  return ENSIP19_SUBCATEGORIES[category] || [];
}

/**
 * Hierarchical metadata template
 */
export interface HierarchicalMetadata {
  ensRoot: string;
  projectRoot?: string;
  categoryRoot?: string;
  subcategoryRoot?: string;
  contractRoot?: string;
  domainHierarchy: {
    level: HierarchyLevel;
    parent: string | null;
    children?: string[];
  };
  traits?: {
    inheritedFrom: string[];
    deduplication?: {
      inherited?: string[];
      overridden?: string[];
      merged?: string[];
      replaced?: string[];
    };
  };
}

/**
 * Generate hierarchical metadata for a domain
 */
export function generateHierarchicalMetadata(domain: string): HierarchicalMetadata | null {
  const parsed = parseHierarchicalDomain(domain);
  if (!parsed) return null;

  const metadata: HierarchicalMetadata = {
    ensRoot: 'cns.eth',
    domainHierarchy: {
      level: parsed.level,
      parent: parsed.parent,
    },
    traits: {
      inheritedFrom: getInheritanceChain(domain).slice(1),
    },
  };

  // Add level-specific roots
  if (parsed.level >= 1 && parsed.org) {
    metadata.projectRoot = `${parsed.org}.cns.eth`;
  }
  if (parsed.level >= 2 && parsed.category && parsed.org) {
    metadata.categoryRoot = `${parsed.category}.${parsed.org}.cns.eth`;
  }
  if (parsed.level >= 3 && parsed.subcategory && parsed.category && parsed.org) {
    metadata.subcategoryRoot = `${parsed.subcategory}.${parsed.category}.${parsed.org}.cns.eth`;
  }
  if (parsed.level >= 4 && parsed.contract && parsed.subcategory && parsed.category && parsed.org) {
    metadata.contractRoot = `${parsed.contract}.${parsed.subcategory}.${parsed.category}.${parsed.org}.cns.eth`;
  }

  return metadata;
}

/**
 * Validate hierarchical domain structure
 */
export function validateHierarchicalDomain(domain: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const parsed = parseHierarchicalDomain(domain);
  if (!parsed) {
    errors.push('Invalid hierarchical domain structure');
    return { valid: false, errors, warnings };
  }

  // Validate category if present
  if (parsed.category) {
    const validCategories = [
      'defi', 'dao', 'l2', 'infra', 'token', 'nft', 'gaming', 'social',
      'identity', 'privacy', 'security', 'wallet', 'analytics', 'rwa',
      'supply', 'health', 'finance', 'dev', 'art'
    ];
    
    if (!validCategories.includes(parsed.category)) {
      errors.push(`Invalid category: ${parsed.category}. Must be one of: ${validCategories.join(', ')}`);
    }
  }

  // Validate subcategory if present
  if (parsed.subcategory && parsed.category) {
    const isValid = validateSubcategoryForCategory(
      parsed.category as ENSIP19Category,
      parsed.subcategory
    );
    if (!isValid) {
      warnings.push(
        `Subcategory "${parsed.subcategory}" is not in the recommended list for category "${parsed.category}"`
      );
    }
  }

  // Validate naming conventions
  const parts = domain.replace('.cns.eth', '').split('.');
  parts.forEach((part, idx) => {
    if (!/^[a-z0-9-]+$/.test(part)) {
      errors.push(`Part "${part}" contains invalid characters. Use only lowercase letters, numbers, and hyphens.`);
    }
    if (part.startsWith('-') || part.endsWith('-')) {
      errors.push(`Part "${part}" cannot start or end with a hyphen.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

