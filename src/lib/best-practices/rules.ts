/**
 * Best Practice Rules Definitions
 * These rules define the validation criteria for contract naming and metadata best practices
 */

export type BestPracticeCategory = 'naming' | 'metadata' | 'security' | 'management';
export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface ValidationContext {
  contractType?: string;
  contractAddress?: string;
  isProxy?: boolean;
  implementationAddress?: string;
  parentDomain?: string;
  subdomainLabel?: string;
  fullName?: string;
  metadata?: Record<string, string>;
  step?: string;
  chainId?: number;
  ownerAddress?: string;
  resolverAddress?: string;
}

export interface ValidationResult {
  passed: boolean;
  severity: Severity;
  message: string;
  recommendation: string;
  linkToSection: string;
}

export interface BestPracticeRule {
  id: string;
  category: BestPracticeCategory;
  severity: Severity;
  check: (context: ValidationContext) => ValidationResult;
  recommendation: string;
  linkToSection: string;
}

/**
 * Naming Best Practices
 */
export const namingRules: BestPracticeRule[] = [
  {
    id: 'naming-standard-prefix',
    category: 'naming',
    severity: 'critical',
    recommendation: 'Use standard prefixes like app, dao, vault, registry for main contracts',
    linkToSection: '#naming-subdomain-hierarchy',
    check: (context) => {
      const standardPrefixes = ['app', 'dao', 'vault', 'registry', 'token', 'nft', 'staking', 'oracle'];
      const label = context.subdomainLabel?.toLowerCase() || '';
      
      if (!label) {
        return {
          passed: false,
          severity: 'critical',
          message: 'Subdomain label is required',
          recommendation: 'Use a standard prefix like app, dao, or vault',
          linkToSection: '#naming-subdomain-hierarchy',
        };
      }

      const hasStandardPrefix = standardPrefixes.some(prefix => label === prefix || label.startsWith(prefix + '-'));
      
      if (!hasStandardPrefix && label.length > 0) {
        return {
          passed: false,
          severity: 'high',
          message: `Subdomain "${label}" doesn't follow standard naming conventions`,
          recommendation: 'Consider using a standard prefix: app, dao, vault, registry, token, nft, staking, or oracle',
          linkToSection: '#naming-subdomain-hierarchy',
        };
      }

      return {
        passed: true,
        severity: 'critical',
        message: 'Subdomain follows standard naming conventions',
        recommendation: 'Good naming pattern',
        linkToSection: '#naming-subdomain-hierarchy',
      };
    },
  },
  {
    id: 'naming-env-labels',
    category: 'naming',
    severity: 'high',
    recommendation: 'Use clear environment labels: dev, staging, prod',
    linkToSection: '#naming-subdomain-hierarchy',
    check: (context) => {
      const label = context.subdomainLabel?.toLowerCase() || '';
      const envLabels = ['dev', 'development', 'staging', 'stage', 'prod', 'production', 'test'];
      
      if (envLabels.some(env => label.includes(env))) {
        return {
          passed: true,
          severity: 'high',
          message: 'Environment label detected - good for preventing production accidents',
          recommendation: 'Environment labels help prevent accidental production deployments',
          linkToSection: '#naming-subdomain-hierarchy',
        };
      }

      return {
        passed: true,
        severity: 'low',
        message: 'No environment label detected',
        recommendation: 'For non-production environments, consider adding dev or staging labels',
        linkToSection: '#naming-subdomain-hierarchy',
      };
    },
  },
  {
    id: 'naming-descriptive',
    category: 'naming',
    severity: 'medium',
    recommendation: 'Use descriptive, lowercase, hyphen-separated names',
    linkToSection: '#naming-subdomain-hierarchy',
    check: (context) => {
      const label = context.subdomainLabel || '';
      
      if (label.length < 2) {
        return {
          passed: false,
          severity: 'medium',
          message: 'Subdomain label is too short',
          recommendation: 'Use descriptive names with at least 2-3 characters',
          linkToSection: '#naming-subdomain-hierarchy',
        };
      }

      if (/[A-Z]/.test(label)) {
        return {
          passed: false,
          severity: 'medium',
          message: 'Subdomain contains uppercase letters',
          recommendation: 'Use lowercase letters only (e.g., "app" not "App")',
          linkToSection: '#naming-subdomain-hierarchy',
        };
      }

      if (/\s/.test(label)) {
        return {
          passed: false,
          severity: 'medium',
          message: 'Subdomain contains spaces',
          recommendation: 'Use hyphens instead of spaces (e.g., "main-app" not "main app")',
          linkToSection: '#naming-subdomain-hierarchy',
        };
      }

      return {
        passed: true,
        severity: 'medium',
        message: 'Subdomain follows naming conventions',
        recommendation: 'Good naming format',
        linkToSection: '#naming-subdomain-hierarchy',
      };
    },
  },
];

/**
 * Metadata Best Practices
 */
export const metadataRules: BestPracticeRule[] = [
  {
    id: 'metadata-proxy-address',
    category: 'metadata',
    severity: 'critical',
    recommendation: 'Always use proxy address for upgradeable contracts, not implementation address',
    linkToSection: '#metadata-address-records',
    check: (context) => {
      if (context.isProxy && context.implementationAddress && context.contractAddress) {
        if (context.contractAddress.toLowerCase() === context.implementationAddress.toLowerCase()) {
          return {
            passed: false,
            severity: 'critical',
            message: 'Contract address matches implementation address for proxy contract',
            recommendation: 'Use the proxy address, not the implementation address. Upgrades will fail if you point to implementation.',
            linkToSection: '#metadata-address-records',
          };
        }
      }

      if (context.isProxy && !context.contractAddress) {
        return {
          passed: false,
          severity: 'critical',
          message: 'Proxy contract detected but no contract address provided',
          recommendation: 'Provide the proxy address, not the implementation address',
          linkToSection: '#metadata-address-records',
        };
      }

      return {
        passed: true,
        severity: 'critical',
        message: context.isProxy ? 'Using proxy address correctly' : 'Contract address configured',
        recommendation: context.isProxy ? 'Good - proxy address is being used' : 'Ensure you use proxy address if contract is upgradeable',
        linkToSection: '#metadata-address-records',
      };
    },
  },
  {
    id: 'metadata-description',
    category: 'metadata',
    severity: 'high',
    recommendation: 'Always include a description text record',
    linkToSection: '#metadata-text-records',
    check: (context) => {
      const description = context.metadata?.['description'] || context.metadata?.['eth.contract.description'];
      
      if (!description || description.trim().length === 0) {
        return {
          passed: false,
          severity: 'high',
          message: 'Description text record is missing',
          recommendation: 'Add a description text record to explain the contract purpose',
          linkToSection: '#metadata-text-records',
        };
      }

      if (description.length < 10) {
        return {
          passed: false,
          severity: 'medium',
          message: 'Description is too short',
          recommendation: 'Provide a more detailed description (at least 10 characters)',
          linkToSection: '#metadata-text-records',
        };
      }

      return {
        passed: true,
        severity: 'high',
        message: 'Description provided',
        recommendation: 'Good - description helps users understand the contract',
        linkToSection: '#metadata-text-records',
      };
    },
  },
  {
    id: 'metadata-url',
    category: 'metadata',
    severity: 'medium',
    recommendation: 'Include URL text record pointing to documentation or dApp',
    linkToSection: '#metadata-text-records',
    check: (context) => {
      const url = context.metadata?.['url'] || context.metadata?.['docs.url'];
      
      if (!url || url.trim().length === 0) {
        return {
          passed: false,
          severity: 'medium',
          message: 'URL text record is missing',
          recommendation: 'Add a URL text record pointing to documentation or main dApp page',
          linkToSection: '#metadata-text-records',
        };
      }

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return {
          passed: false,
          severity: 'low',
          message: 'URL should start with http:// or https://',
          recommendation: 'Use a full URL starting with http:// or https://',
          linkToSection: '#metadata-text-records',
        };
      }

      return {
        passed: true,
        severity: 'medium',
        message: 'URL provided',
        recommendation: 'Good - URL helps users find documentation',
        linkToSection: '#metadata-text-records',
      };
    },
  },
  {
    id: 'metadata-contract-type',
    category: 'metadata',
    severity: 'high',
    recommendation: 'Include contract type (ERC20, ERC721, Governor, etc.)',
    linkToSection: '#metadata-text-records',
    check: (context) => {
      const contractType = context.contractType || context.metadata?.['eth.contract.type'];
      
      if (!contractType || contractType.trim().length === 0) {
        return {
          passed: false,
          severity: 'high',
          message: 'Contract type is missing',
          recommendation: 'Add contract type (e.g., ERC20, ERC721, GovernorBravo, etc.)',
          linkToSection: '#metadata-text-records',
        };
      }

      return {
        passed: true,
        severity: 'high',
        message: 'Contract type provided',
        recommendation: 'Good - contract type helps with interoperability',
        linkToSection: '#metadata-text-records',
      };
    },
  },
  {
    id: 'metadata-version',
    category: 'metadata',
    severity: 'medium',
    recommendation: 'Include version information',
    linkToSection: '#metadata-text-records',
    check: (context) => {
      const version = context.metadata?.['eth.contract.version'] || context.metadata?.['project.version'];
      
      if (!version || version.trim().length === 0) {
        return {
          passed: false,
          severity: 'medium',
          message: 'Version information is missing',
          recommendation: 'Add version text record (e.g., v1.0.0)',
          linkToSection: '#metadata-text-records',
        };
      }

      return {
        passed: true,
        severity: 'medium',
        message: 'Version provided',
        recommendation: 'Good - version tracking helps with upgrades and auditing',
        linkToSection: '#metadata-text-records',
      };
    },
  },
  {
    id: 'metadata-multi-chain',
    category: 'metadata',
    severity: 'high',
    recommendation: 'Configure multi-chain addresses if contract exists on multiple chains',
    linkToSection: '#metadata-address-records',
    check: (context) => {
      // This is a placeholder - actual multi-chain check would require more context
      return {
        passed: true,
        severity: 'high',
        message: 'Consider multi-chain addresses',
        recommendation: 'If your contract exists on L2s or other chains, configure Multi-Coin addresses',
        linkToSection: '#metadata-address-records',
      };
    },
  },
];

/**
 * Security Best Practices
 */
export const securityRules: BestPracticeRule[] = [
  {
    id: 'security-multisig-owner',
    category: 'security',
    severity: 'critical',
    recommendation: 'Critical contracts should have multisig or governance contract as owner',
    linkToSection: '#management-separation-of-duties',
    check: (context) => {
      // This would need to check if owner is a multisig or governance contract
      // For now, we'll just provide a recommendation
      const criticalLabels = ['dao', 'vault', 'governance', 'treasury'];
      const label = context.subdomainLabel?.toLowerCase() || '';
      const isCritical = criticalLabels.some(crit => label.includes(crit));

      if (isCritical) {
        return {
          passed: true,
          severity: 'critical',
          message: 'Critical contract detected',
          recommendation: 'Ensure this contract is owned by a multisig wallet or governance contract, not a single EOA',
          linkToSection: '#management-separation-of-duties',
        };
      }

      return {
        passed: true,
        severity: 'low',
        message: 'Standard contract',
        recommendation: 'For critical contracts (DAO, vault, treasury), use multisig ownership',
        linkToSection: '#management-separation-of-duties',
      };
    },
  },
  {
    id: 'security-fuses',
    category: 'security',
    severity: 'critical',
    recommendation: 'Burn fuses for critical contracts: CANNOT_SET_RESOLVER, CANNOT_TRANSFER, CANNOT_UNWRAP',
    linkToSection: '#naming-immutability-and-security',
    check: (context) => {
      const criticalLabels = ['dao', 'vault', 'governance', 'treasury'];
      const label = context.subdomainLabel?.toLowerCase() || '';
      const isCritical = criticalLabels.some(crit => label.includes(crit));

      if (isCritical) {
        return {
          passed: true,
          severity: 'critical',
          message: 'Critical contract - consider burning fuses',
          recommendation: 'After setting resolver and owner, burn CANNOT_SET_RESOLVER, CANNOT_TRANSFER, and CANNOT_UNWRAP fuses',
          linkToSection: '#naming-immutability-and-security',
        };
      }

      return {
        passed: true,
        severity: 'medium',
        message: 'Consider fuse configuration',
        recommendation: 'For critical contracts, burn fuses to prevent accidental changes',
        linkToSection: '#naming-immutability-and-security',
      };
    },
  },
  {
    id: 'security-audit-info',
    category: 'security',
    severity: 'high',
    recommendation: 'Include audit information in metadata',
    linkToSection: '#metadata-text-records',
    check: (context) => {
      const auditUrl = context.metadata?.['security.audit.url'] || context.metadata?.['org.auditor'];
      
      if (!auditUrl || auditUrl.trim().length === 0) {
        return {
          passed: false,
          severity: 'high',
          message: 'Audit information is missing',
          recommendation: 'Add security.audit.url or org.auditor text record with audit firm name and report link',
          linkToSection: '#metadata-text-records',
        };
      }

      return {
        passed: true,
        severity: 'high',
        message: 'Audit information provided',
        recommendation: 'Good - audit information builds trust',
        linkToSection: '#metadata-text-records',
      };
    },
  },
];

/**
 * Management Best Practices
 */
export const managementRules: BestPracticeRule[] = [
  {
    id: 'management-public-resolver',
    category: 'management',
    severity: 'high',
    recommendation: 'Use ENS Public Resolver unless you need CCIP-Read for dynamic data',
    linkToSection: '#management-resolver-selection',
    check: (context) => {
      // This would check if resolver is the public resolver
      return {
        passed: true,
        severity: 'high',
        message: 'Resolver configuration',
        recommendation: 'Use ENS Public Resolver unless you need custom CCIP-Read functionality',
        linkToSection: '#management-resolver-selection',
      };
    },
  },
  {
    id: 'management-ttl',
    category: 'management',
    severity: 'medium',
    recommendation: 'Set reasonable TTL (600 seconds recommended)',
    linkToSection: '#management-change-control-and-auditing',
    check: (context) => {
      return {
        passed: true,
        severity: 'medium',
        message: 'TTL configuration',
        recommendation: 'Set TTL to 600 seconds (10 minutes) for reasonable caching with quick correction capability',
        linkToSection: '#management-change-control-and-auditing',
      };
    },
  },
];

/**
 * All rules combined
 */
export const allRules: BestPracticeRule[] = [
  ...namingRules,
  ...metadataRules,
  ...securityRules,
  ...managementRules,
];

/**
 * Get rules by category
 */
export function getRulesByCategory(category: BestPracticeCategory): BestPracticeRule[] {
  return allRules.filter(rule => rule.category === category);
}

/**
 * Get rules by severity
 */
export function getRulesBySeverity(severity: Severity): BestPracticeRule[] {
  return allRules.filter(rule => rule.severity === severity);
}

/**
 * Get rules relevant to current context
 */
export function getRelevantRules(context: ValidationContext): BestPracticeRule[] {
  return allRules.filter(rule => {
    const result = rule.check(context);
    return !result.passed || result.severity === 'critical' || result.severity === 'high';
  });
}


