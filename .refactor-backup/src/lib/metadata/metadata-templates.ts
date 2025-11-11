export interface MetadataTemplate {
  name: string;
  description: string;
  records: Record<string, string>;
  recommendedKeys: string[];
}

export const METADATA_TEMPLATES: Record<string, MetadataTemplate> = {
  'dao': {
    name: 'DAO',
    description: 'Decentralized Autonomous Organization',
    records: {
      'description': 'A decentralized autonomous organization',
      'url': 'https://example.org',
      'email': 'contact@example.org',
      'com.github': 'example/dao',
      'com.twitter': '@example',
      'com.discord': 'https://discord.gg/example',
      'dao.governance.type': 'snapshot',
      'dao.voting.power': 'token-based',
      'dao.proposal.threshold': '1%',
      'dao.snapshot.space': 'example.eth',
      'security.multisig.address': '0x0000000000000000000000000000000000000000',
      'security.multisig.threshold': '3',
    },
    recommendedKeys: [
      'description',
      'url',
      'email',
      'com.github',
      'com.twitter',
      'com.discord',
      'dao.governance.type',
      'dao.voting.power',
      'security.multisig.address',
    ],
  },
  'defi-protocol': {
    name: 'DeFi Protocol',
    description: 'Decentralized Finance Protocol',
    records: {
      'description': 'DeFi protocol',
      'url': 'https://example.org',
      'email': 'security@example.org',
      'com.github': 'example/defi',
      'com.twitter': '@example',
      'com.discord': 'https://discord.gg/example',
      'security.audit.url': 'https://example.org/audit.pdf',
      'security.bounty.url': 'https://example.org/bounty',
      'security.multisig.address': '0x0000000000000000000000000000000000000000',
      'defi.protocol.type': 'lending',
      'defi.total.value.locked': '0',
      'defi.supported.tokens': 'ETH, USDC, DAI',
    },
    recommendedKeys: [
      'description',
      'url',
      'email',
      'com.github',
      'security.audit.url',
      'security.multisig.address',
      'defi.protocol.type',
    ],
  },
  'nft-collection': {
    name: 'NFT Collection',
    description: 'Non-Fungible Token Collection',
    records: {
      'description': 'NFT collection',
      'url': 'https://example.org',
      'email': 'support@example.org',
      'com.github': 'example/nft',
      'com.twitter': '@example',
      'com.discord': 'https://discord.gg/example',
      'nft.standard': 'ERC-721',
      'nft.total.supply': '10000',
      'nft.mint.price': '0.1 ETH',
      'nft.opensea.collection': 'example',
    },
    recommendedKeys: [
      'description',
      'url',
      'com.twitter',
      'com.discord',
      'nft.standard',
      'nft.total.supply',
    ],
  },
  'governance-token': {
    name: 'Governance Token',
    description: 'Token for protocol governance',
    records: {
      'description': 'Governance token',
      'url': 'https://example.org',
      'email': 'governance@example.org',
      'com.github': 'example/token',
      'com.twitter': '@example',
      'token.standard': 'ERC-20',
      'token.total.supply': '1000000000',
      'token.decimals': '18',
      'governance.proposal.threshold': '1%',
      'governance.voting.period': '7 days',
    },
    recommendedKeys: [
      'description',
      'url',
      'com.github',
      'token.standard',
      'token.total.supply',
      'governance.proposal.threshold',
    ],
  },
  'bridge': {
    name: 'Bridge',
    description: 'Cross-chain bridge protocol',
    records: {
      'description': 'Cross-chain bridge',
      'url': 'https://example.org',
      'email': 'security@example.org',
      'com.github': 'example/bridge',
      'com.twitter': '@example',
      'security.audit.url': 'https://example.org/audit.pdf',
      'security.multisig.address': '0x0000000000000000000000000000000000000000',
      'bridge.supported.chains': 'Ethereum, Polygon, Arbitrum',
      'bridge.total.value.locked': '0',
    },
    recommendedKeys: [
      'description',
      'url',
      'email',
      'security.audit.url',
      'security.multisig.address',
      'bridge.supported.chains',
    ],
  },
  'exchange': {
    name: 'DEX',
    description: 'Decentralized Exchange',
    records: {
      'description': 'Decentralized exchange',
      'url': 'https://example.org',
      'email': 'support@example.org',
      'com.github': 'example/dex',
      'com.twitter': '@example',
      'com.discord': 'https://discord.gg/example',
      'security.audit.url': 'https://example.org/audit.pdf',
      'security.multisig.address': '0x0000000000000000000000000000000000000000',
      'dex.pool.standard': 'Uniswap V3',
      'dex.total.liquidity': '0',
    },
    recommendedKeys: [
      'description',
      'url',
      'com.github',
      'security.audit.url',
      'security.multisig.address',
      'dex.pool.standard',
    ],
  },
};

export function getTemplateForType(type: string): MetadataTemplate | null {
  return METADATA_TEMPLATES[type.toLowerCase()] || null;
}

export function getAllTemplates(): MetadataTemplate[] {
  return Object.values(METADATA_TEMPLATES);
}

export function getRecommendedKeys(type: string): string[] {
  const template = getTemplateForType(type);
  return template?.recommendedKeys || [];
}

export function fillTemplate(type: string, customValues: Record<string, string> = {}): Record<string, string> {
  const template = getTemplateForType(type);
  if (!template) {
    return customValues;
  }

  return {
    ...template.records,
    ...customValues,
  };
}

export function validateTemplateCompleteness(
  records: Record<string, string>,
  type: string
): { complete: boolean; missing: string[] } {
  const template = getTemplateForType(type);
  if (!template) {
    return { complete: true, missing: [] };
  }

  const missing = template.recommendedKeys.filter(key => !records[key]);

  return {
    complete: missing.length === 0,
    missing,
  };
}

