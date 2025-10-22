/**
 * Metadata Schemas for ENS Contract Names
 * Based on accessor-io/naming-convention-toolkit standards
 */

export interface MetadataField {
  key: string;
  label: string;
  type: 'text' | 'url' | 'address' | 'contenthash' | 'json';
  required: boolean;
  description: string;
  placeholder?: string;
  validation?: (value: string) => boolean;
}

export interface MetadataSchema {
  id: string;
  name: string;
  description: string;
  category: 'contract' | 'dao' | 'infrastructure' | 'application' | 'custom';
  fields: MetadataField[];
  applicableTo: string[]; // subdomain patterns like 'app.*', 'dao.*', etc.
}

// Standard text record keys
export const STANDARD_KEYS = {
  // Identity
  AVATAR: 'avatar',
  DESCRIPTION: 'description',
  DISPLAY: 'display',
  EMAIL: 'email',
  KEYWORDS: 'keywords',
  NAME: 'name',
  
  // Contract-specific
  CONTRACT_ADDRESS: 'eth.contract.address',
  CONTRACT_ABI: 'eth.contract.abi',
  CONTRACT_VERSION: 'eth.contract.version',
  CONTRACT_TYPE: 'eth.contract.type',
  IMPLEMENTATION: 'eth.contract.implementation',
  PROXY_TYPE: 'eth.contract.proxy.type',
  
  // Links
  URL: 'url',
  NOTICE: 'notice',
  
  // Social
  GITHUB: 'com.github',
  TWITTER: 'com.twitter',
  DISCORD: 'com.discord',
  TELEGRAM: 'org.telegram',
  
  // Documentation
  DOCS_URL: 'docs.url',
  API_URL: 'api.url',
  CHANGELOG: 'changelog.url',
  
  // DAO/Governance
  GOVERNANCE_TYPE: 'dao.governance.type',
  VOTING_POWER: 'dao.voting.power',
  PROPOSAL_THRESHOLD: 'dao.proposal.threshold',
  SNAPSHOT_SPACE: 'dao.snapshot.space',
  
  // Security
  AUDIT_URL: 'security.audit.url',
  BUG_BOUNTY: 'security.bounty.url',
  MULTISIG_ADDRESS: 'security.multisig.address',
  
  // Deployment
  DEPLOYED_AT: 'deployment.timestamp',
  DEPLOYER: 'deployment.deployer',
  CHAIN_ID: 'deployment.chainId',
  NETWORK: 'deployment.network',
};

export const CONTRACT_SCHEMA: MetadataSchema = {
  id: 'contract-standard',
  name: 'Smart Contract Standard',
  description: 'Standard metadata for smart contract names',
  category: 'contract',
  applicableTo: ['*.eth'],
  fields: [
    {
      key: STANDARD_KEYS.CONTRACT_ADDRESS,
      label: 'Contract Address',
      type: 'address',
      required: true,
      description: 'The deployed contract address (use proxy address for upgradeable contracts)',
      placeholder: '0x...',
    },
    {
      key: STANDARD_KEYS.DESCRIPTION,
      label: 'Description',
      type: 'text',
      required: true,
      description: 'Brief description of the contract purpose',
      placeholder: 'Main governance contract for...',
    },
    {
      key: STANDARD_KEYS.CONTRACT_TYPE,
      label: 'Contract Type',
      type: 'text',
      required: false,
      description: 'Type of contract (ERC20, ERC721, Governor, etc.)',
      placeholder: 'GovernorBravo',
    },
    {
      key: STANDARD_KEYS.CONTRACT_VERSION,
      label: 'Version',
      type: 'text',
      required: false,
      description: 'Contract version',
      placeholder: 'v1.0.0',
    },
    {
      key: STANDARD_KEYS.IMPLEMENTATION,
      label: 'Implementation Address',
      type: 'address',
      required: false,
      description: 'For proxy contracts, the implementation address',
      placeholder: '0x...',
    },
    {
      key: STANDARD_KEYS.DOCS_URL,
      label: 'Documentation URL',
      type: 'url',
      required: false,
      description: 'Link to contract documentation',
      placeholder: 'https://docs.example.com/contracts/...',
    },
    {
      key: STANDARD_KEYS.GITHUB,
      label: 'GitHub Repository',
      type: 'text',
      required: false,
      description: 'GitHub organization/repo',
      placeholder: 'org-name/repo-name',
    },
    {
      key: STANDARD_KEYS.AUDIT_URL,
      label: 'Audit Report',
      type: 'url',
      required: false,
      description: 'Link to security audit report',
      placeholder: 'https://...',
    },
  ],
};

export const DAO_SCHEMA: MetadataSchema = {
  id: 'dao-governance',
  name: 'DAO Governance',
  description: 'Metadata for DAO governance contracts',
  category: 'dao',
  applicableTo: ['dao.*', 'gov.*', 'governance.*'],
  fields: [
    {
      key: STANDARD_KEYS.CONTRACT_ADDRESS,
      label: 'Governor Contract Address',
      type: 'address',
      required: true,
      description: 'The DAO governor contract address',
      placeholder: '0x...',
    },
    {
      key: STANDARD_KEYS.DESCRIPTION,
      label: 'DAO Description',
      type: 'text',
      required: true,
      description: 'Description of the DAO',
      placeholder: 'Decentralized governance for...',
    },
    {
      key: STANDARD_KEYS.GOVERNANCE_TYPE,
      label: 'Governance Type',
      type: 'text',
      required: false,
      description: 'Type of governance mechanism',
      placeholder: 'Token-weighted voting',
    },
    {
      key: STANDARD_KEYS.SNAPSHOT_SPACE,
      label: 'Snapshot Space',
      type: 'text',
      required: false,
      description: 'Snapshot.org space name',
      placeholder: 'example.eth',
    },
    {
      key: STANDARD_KEYS.PROPOSAL_THRESHOLD,
      label: 'Proposal Threshold',
      type: 'text',
      required: false,
      description: 'Minimum tokens required to create proposal',
      placeholder: '100000',
    },
    {
      key: STANDARD_KEYS.MULTISIG_ADDRESS,
      label: 'Multisig Address',
      type: 'address',
      required: false,
      description: 'Associated multisig/timelock address',
      placeholder: '0x...',
    },
    {
      key: STANDARD_KEYS.DISCORD,
      label: 'Discord Server',
      type: 'text',
      required: false,
      description: 'Discord community server',
      placeholder: 'discord.gg/...',
    },
  ],
};

export const INFRASTRUCTURE_SCHEMA: MetadataSchema = {
  id: 'infrastructure',
  name: 'Infrastructure Services',
  description: 'Metadata for infrastructure and service contracts',
  category: 'infrastructure',
  applicableTo: ['api.*', 'rpc.*', 'oracle.*', 'registry.*'],
  fields: [
    {
      key: STANDARD_KEYS.CONTRACT_ADDRESS,
      label: 'Service Contract Address',
      type: 'address',
      required: true,
      description: 'The service contract address',
      placeholder: '0x...',
    },
    {
      key: STANDARD_KEYS.DESCRIPTION,
      label: 'Service Description',
      type: 'text',
      required: true,
      description: 'What this service provides',
      placeholder: 'Price oracle for...',
    },
    {
      key: STANDARD_KEYS.API_URL,
      label: 'API Endpoint',
      type: 'url',
      required: false,
      description: 'API endpoint URL',
      placeholder: 'https://api.example.com',
    },
    {
      key: STANDARD_KEYS.DOCS_URL,
      label: 'Documentation',
      type: 'url',
      required: false,
      description: 'Service documentation',
      placeholder: 'https://docs.example.com',
    },
    {
      key: STANDARD_KEYS.NOTICE,
      label: 'Important Notice',
      type: 'text',
      required: false,
      description: 'Critical information about the service',
      placeholder: 'Rate limits: 100 requests/min',
    },
  ],
};

export const APPLICATION_SCHEMA: MetadataSchema = {
  id: 'application',
  name: 'Application Contract',
  description: 'Metadata for application and dApp contracts',
  category: 'application',
  applicableTo: ['app.*', 'dapp.*'],
  fields: [
    {
      key: STANDARD_KEYS.CONTRACT_ADDRESS,
      label: 'Application Contract',
      type: 'address',
      required: true,
      description: 'Main application contract address',
      placeholder: '0x...',
    },
    {
      key: STANDARD_KEYS.DESCRIPTION,
      label: 'Application Description',
      type: 'text',
      required: true,
      description: 'What the application does',
      placeholder: 'Decentralized exchange for...',
    },
    {
      key: STANDARD_KEYS.URL,
      label: 'Application URL',
      type: 'url',
      required: false,
      description: 'Web interface URL',
      placeholder: 'https://app.example.com',
    },
    {
      key: STANDARD_KEYS.AVATAR,
      label: 'Logo/Avatar',
      type: 'url',
      required: false,
      description: 'Application logo (IPFS or HTTP)',
      placeholder: 'ipfs://...',
    },
    {
      key: STANDARD_KEYS.TWITTER,
      label: 'Twitter Handle',
      type: 'text',
      required: false,
      description: 'Twitter account',
      placeholder: '@example',
    },
    {
      key: STANDARD_KEYS.DISCORD,
      label: 'Discord',
      type: 'text',
      required: false,
      description: 'Discord community',
      placeholder: 'discord.gg/...',
    },
  ],
};

export const ALL_SCHEMAS: MetadataSchema[] = [
  CONTRACT_SCHEMA,
  DAO_SCHEMA,
  INFRASTRUCTURE_SCHEMA,
  APPLICATION_SCHEMA,
];

/**
 * Get recommended schema based on subdomain pattern
 */
export function getRecommendedSchema(domainName: string): MetadataSchema | null {
  const label = domainName.split('.')[0].toLowerCase();
  
  // DAO patterns
  if (['dao', 'gov', 'governance', 'governor'].includes(label)) {
    return DAO_SCHEMA;
  }
  
  // Infrastructure patterns
  if (['api', 'rpc', 'oracle', 'registry', 'vault', 'treasury'].includes(label)) {
    return INFRASTRUCTURE_SCHEMA;
  }
  
  // Application patterns
  if (['app', 'dapp', 'swap', 'exchange'].includes(label)) {
    return APPLICATION_SCHEMA;
  }
  
  // Default to contract schema
  return CONTRACT_SCHEMA;
}

/**
 * Validate metadata against schema
 */
export function validateMetadata(
  metadata: Record<string, string>,
  schema: MetadataSchema
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check required fields
  schema.fields.forEach(field => {
    if (field.required && !metadata[field.key]) {
      errors.push(`${field.label} is required`);
    }
    
    // Validate field if present and has validation
    if (metadata[field.key] && field.validation) {
      if (!field.validation(metadata[field.key])) {
        errors.push(`${field.label} is invalid`);
      }
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
