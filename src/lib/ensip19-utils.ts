/**
 * ENSIP-19 Utilities
 * Implements the ENSIP-19 specification for ENS contract metadata
 * Based on ens-metadata-tools-repo standards
 */

/**
 * ENSIP-19 Category enum
 * All approved root domain categories
 */
export const ENSIP19_CATEGORIES = [
  'defi',
  'dao',
  'l2',
  'infra',
  'token',
  'nft',
  'gaming',
  'social',
  'identity',
  'privacy',
  'security',
  'wallet',
  'analytics',
  'rwa',
  'supply',
  'health',
  'finance',
  'dev',
  'art',
] as const;

export type ENSIP19Category = typeof ENSIP19_CATEGORIES[number];

/**
 * Subcategories by category
 */
export const ENSIP19_SUBCATEGORIES: Record<ENSIP19Category, string[]> = {
  defi: [
    'amm',
    'lending',
    'stablecoin',
    'yield',
    'perps',
    'options',
    'derivatives',
    'dex-aggregator',
    'asset-management',
    'liquid-staking',
    'cdps',
    'synthetics',
    'insurance',
  ],
  dao: ['governor', 'timelock', 'treasury', 'voting', 'multisig', 'module'],
  l2: [
    'optimistic-rollup',
    'zk-rollup',
    'validium',
    'da-layer',
    'bridge',
    'sequencer',
    'prover',
  ],
  infra: [
    'oracle',
    'relayer',
    'rpc',
    'indexer',
    'subgraph',
    'event-stream',
    'data-availability',
  ],
  token: ['erc20', 'erc721', 'erc1155', 'governance-token', 'rwa', 'wrapped', 'bridged'],
  nft: ['marketplace', 'launchpad', 'royalty', 'metadata', 'rental'],
  gaming: ['nft-game', 'engine', 'marketplace', 'loot', 'economy'],
  social: ['protocol', 'messaging', 'profile', 'feed', 'moderation'],
  identity: ['ens', 'did', 'attestations', 'verifiable-credentials'],
  privacy: ['mixer', 'zk-id', 'shielded-pool', 'fhe', 'mev-protection'],
  security: ['auditor', 'monitoring', 'scanning', 'incident-response', 'bug-bounty'],
  wallet: ['eoa', 'aa-4337', 'mpc', 'custody', 'payment-processor', 'onramp', 'offramp'],
  analytics: ['indexer', 'dashboard', 'analytics-service'],
  rwa: ['real-estate', 'commodities', 'treasuries', 'invoices'],
  supply: ['tracking', 'verification', 'logistics', 'compliance'],
  health: ['medical-records', 'data-sharing', 'consent'],
  finance: ['banking', 'settlement', 'custody', 'compliance'],
  dev: ['framework', 'testing', 'deployment', 'debugging', 'plugins'],
  art: ['platform', 'curation', 'royalty', 'minting'],
};

/**
 * Proxy types enum
 */
export const PROXY_TYPES = [
  'transparent',
  'uups',
  'beacon',
  'diamond',
  'minimal',
  'immutable',
] as const;

export type ProxyType = typeof PROXY_TYPES[number];

/**
 * Lifecycle status enum
 */
export const LIFECYCLE_STATUSES = [
  'planning',
  'development',
  'testing',
  'deployed',
  'deprecated',
  'discontinued',
] as const;

export type LifecycleStatus = typeof LIFECYCLE_STATUSES[number];

/**
 * ENSIP-19 Metadata interface
 * Complete specification for contract metadata
 */
export interface ENSIP19Metadata {
  // Required fields
  id: string;
  org: string;
  protocol: string;
  category: ENSIP19Category;
  role: string;
  version: string;
  chainId: number;
  addresses: Array<{
    chainId: number;
    address: string;
    deployedBlock?: number;
    bytecodeHash?: string;
    implementation?: string | null;
    implementationSlot?: string;
  }>;
  metadataHash: string;

  // Optional fields
  subcategory?: string;
  variant?: string;
  ensRoot?: string;

  // Standards compliance
  standards?: {
    ercs?: string[];
    interfaces?: string[];
  };

  // Artifacts
  artifacts?: {
    abiHash?: string;
    sourceUri?: string;
    license?: string;
  };

  // Lifecycle management
  lifecycle?: {
    status?: LifecycleStatus;
    since?: string;
    replacedBy?: string;
  };

  // Security information
  security?: {
    audits?: Array<{
      firm: string;
      date: string;
      report: string;
      findings?: string;
    }>;
    owners?: string[];
    upgradeability?: ProxyType;
    permissions?: string[];
    attestation?: {
      reference: string;
      schema: string;
      attester?: string;
      timestamp?: string;
      expiry?: string;
      revocable?: boolean;
      revocationStatus?: 'active' | 'revoked' | 'expired';
    };
  };

  // Proxy information
  proxy?: {
    proxyType: ProxyType;
    implementationAddress?: string;
    implementationSlot?: string;
    proxyAdmin?: string;
    proxyVersion?: string;
  };

  // Tags
  tags?: string[];

  // Subdomain management
  subdomains?: Array<{
    label: string;
    owner: string;
    controller?: string;
    resolver?: string;
    records?: Record<string, any>;
  }>;
}

/**
 * Generate canonical ID following ENSIP-19 grammar
 * Format: org.protocol.category.role[.variant].version.chainId
 *
 * @param org Organization identifier (lowercase, hyphen-separated)
 * @param protocol Protocol identifier (lowercase, hyphen-separated)
 * @param category Primary category
 * @param role Contract role/function (lowercase, descriptive)
 * @param version Version format: v{num}-{num}-{num}
 * @param chainId Target blockchain network ID
 * @param variant Optional protocol variant identifier
 * @returns Canonical identifier string
 */
export function generateCanonicalId(params: {
  org: string;
  protocol: string;
  category: ENSIP19Category;
  role: string;
  version: string;
  chainId: number;
  variant?: string;
}): string {
  const { org, protocol, category, role, version, chainId, variant } = params;

  // Validate inputs
  if (!org.match(/^[a-z0-9-]+$/)) {
    throw new Error('Organization must be lowercase, hyphen-separated');
  }
  if (!protocol.match(/^[a-z0-9.-]+$/)) {
    throw new Error('Protocol must be lowercase, hyphen-separated');
  }
  if (!ENSIP19_CATEGORIES.includes(category)) {
    throw new Error(`Category must be one of: ${ENSIP19_CATEGORIES.join(', ')}`);
  }
  if (!role.match(/^[a-z0-9-]+$/)) {
    throw new Error('Role must be lowercase, hyphen-separated');
  }
  if (!version.match(/^v[0-9]+(-[0-9]+)?(-[0-9]+)?$/)) {
    throw new Error('Version must match format: v{num}, v{num}-{num}, or v{num}-{num}-{num}');
  }
  if (chainId < 1) {
    throw new Error('Chain ID must be >= 1');
  }
  if (variant && !variant.match(/^[a-z0-9-]+$/)) {
    throw new Error('Variant must be lowercase, hyphen-separated');
  }

  const parts = [org, protocol, category, role];
  if (variant) {
    parts.push(variant);
  }
  parts.push(version, chainId.toString());

  return parts.join('.');
}

/**
 * Parse canonical ID back to components
 */
export function parseCanonicalId(id: string): {
  org: string;
  protocol: string;
  category: string;
  role: string;
  variant?: string;
  version: string;
  chainId: number;
} | null {
  const parts = id.split('.');
  
  if (parts.length < 6) {
    return null;
  }

  const chainId = parseInt(parts[parts.length - 1], 10);
  if (isNaN(chainId)) {
    return null;
  }

  const version = parts[parts.length - 2];
  if (!version.match(/^v[0-9]+(-[0-9]+)?(-[0-9]+)?$/)) {
    return null;
  }

  if (parts.length === 6) {
    return {
      org: parts[0],
      protocol: parts[1],
      category: parts[2],
      role: parts[3],
      version,
      chainId,
    };
  } else if (parts.length === 7) {
    return {
      org: parts[0],
      protocol: parts[1],
      category: parts[2],
      role: parts[3],
      variant: parts[4],
      version,
      chainId,
    };
  }

  return null;
}

/**
 * Generate SHA-256 metadata hash
 * Canonical JSON format (sorted keys, no whitespace)
 * Uses Web Crypto API for browser compatibility
 *
 * @param metadata ENSIP-19 metadata object
 * @returns Hex-encoded hash with 0x prefix
 */
export async function generateMetadataHash(metadata: Partial<ENSIP19Metadata>): Promise<string> {
  // Create a copy without the metadataHash field itself
  const metadataCopy = { ...metadata };
  delete metadataCopy.metadataHash;

  // Convert to canonical JSON (sorted keys, no whitespace)
  const canonicalJson = JSON.stringify(metadataCopy, Object.keys(metadataCopy).sort());

  // Generate SHA-256 hash using Web Crypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(canonicalJson);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return `0x${hashHex}`;
}

/**
 * Validate version format
 */
export function validateVersion(version: string): boolean {
  return /^v[0-9]+(-[0-9]+)?(-[0-9]+)?$/.test(version);
}

/**
 * Normalize version from dot notation to hyphen notation
 * Example: v1.0.0 -> v1-0-0
 */
export function normalizeVersion(version: string): string {
  if (!version.startsWith('v')) {
    version = 'v' + version;
  }
  return version.replace(/\./g, '-');
}

/**
 * Validate Ethereum address format
 */
export function validateEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate hash format (32 bytes)
 */
export function validateHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Validate interface ID format (4 bytes)
 */
export function validateInterfaceId(id: string): boolean {
  return /^0x[a-fA-F0-9]{8}$/.test(id);
}

/**
 * Generate ENS root domain for cns.eth hierarchy
 */
export function generateEnsRoot(params: {
  org?: string;
  category?: string;
  subcategory?: string;
}): string {
  const parts: string[] = [];
  
  if (params.subcategory) {
    parts.push(params.subcategory);
  }
  if (params.category) {
    parts.push(params.category);
  }
  if (params.org) {
    parts.push(params.org);
  }
  
  parts.push('cns', 'eth');
  
  return parts.join('.');
}

/**
 * Validate complete ENSIP-19 metadata
 */
export function validateENSIP19Metadata(metadata: Partial<ENSIP19Metadata>): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!metadata.id) errors.push('Field "id" is required');
  if (!metadata.org) errors.push('Field "org" is required');
  if (!metadata.protocol) errors.push('Field "protocol" is required');
  if (!metadata.category) errors.push('Field "category" is required');
  if (!metadata.role) errors.push('Field "role" is required');
  if (!metadata.version) errors.push('Field "version" is required');
  if (!metadata.chainId) errors.push('Field "chainId" is required');
  if (!metadata.addresses || metadata.addresses.length === 0) {
    errors.push('Field "addresses" is required and must contain at least one address');
  }
  if (!metadata.metadataHash) errors.push('Field "metadataHash" is required');

  // Validate patterns
  if (metadata.org && !metadata.org.match(/^[a-z0-9-]+$/)) {
    errors.push('Organization must be lowercase, hyphen-separated');
  }
  if (metadata.protocol && !metadata.protocol.match(/^[a-z0-9.-]+$/)) {
    errors.push('Protocol must be lowercase, hyphen-separated');
  }
  if (metadata.category && !ENSIP19_CATEGORIES.includes(metadata.category)) {
    errors.push(`Category must be one of: ${ENSIP19_CATEGORIES.join(', ')}`);
  }
  if (metadata.role && !metadata.role.match(/^[a-z0-9-]+$/)) {
    errors.push('Role must be lowercase, hyphen-separated');
  }
  if (metadata.version && !validateVersion(metadata.version)) {
    errors.push('Version must match format: v{num}, v{num}-{num}, or v{num}-{num}-{num}');
  }
  if (metadata.chainId && metadata.chainId < 1) {
    errors.push('Chain ID must be >= 1');
  }
  if (metadata.metadataHash && !validateHash(metadata.metadataHash)) {
    errors.push('Metadata hash must be a 32-byte hex string with 0x prefix');
  }

  // Validate addresses
  if (metadata.addresses) {
    metadata.addresses.forEach((addr, idx) => {
      if (!addr.chainId) {
        errors.push(`Address ${idx}: chainId is required`);
      }
      if (!addr.address) {
        errors.push(`Address ${idx}: address is required`);
      } else if (!validateEthereumAddress(addr.address)) {
        errors.push(`Address ${idx}: invalid Ethereum address format`);
      }
      if (addr.bytecodeHash && !validateHash(addr.bytecodeHash)) {
        errors.push(`Address ${idx}: bytecodeHash must be a 32-byte hex string`);
      }
      if (addr.implementation && !validateEthereumAddress(addr.implementation)) {
        errors.push(`Address ${idx}: invalid implementation address format`);
      }
      if (addr.implementationSlot && !validateHash(addr.implementationSlot)) {
        errors.push(`Address ${idx}: implementationSlot must be a 32-byte hex string`);
      }
    });
  }

  // Validate subcategory
  if (metadata.subcategory && metadata.category) {
    const validSubcategories = ENSIP19_SUBCATEGORIES[metadata.category];
    if (validSubcategories && !validSubcategories.includes(metadata.subcategory)) {
      warnings.push(
        `Subcategory "${metadata.subcategory}" is not in the standard list for category "${metadata.category}"`
      );
    }
  }

  // Validate ensRoot pattern
  if (metadata.ensRoot && !metadata.ensRoot.match(/^[a-z0-9.-]+\.cns\.eth$/)) {
    errors.push('ensRoot must match pattern: ^[a-z0-9.-]+.cns.eth$');
  }

  // Validate proxy type
  if (metadata.proxy?.proxyType && !PROXY_TYPES.includes(metadata.proxy.proxyType)) {
    errors.push(`Proxy type must be one of: ${PROXY_TYPES.join(', ')}`);
  }

  // Validate lifecycle status
  if (metadata.lifecycle?.status && !LIFECYCLE_STATUSES.includes(metadata.lifecycle.status)) {
    errors.push(`Lifecycle status must be one of: ${LIFECYCLE_STATUSES.join(', ')}`);
  }

  // Validate security fields
  if (metadata.security?.owners) {
    metadata.security.owners.forEach((owner, idx) => {
      if (!validateEthereumAddress(owner)) {
        errors.push(`Security owner ${idx}: invalid Ethereum address format`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

