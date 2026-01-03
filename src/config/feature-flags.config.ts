/**
 * Feature Flags Configuration
 * 
 * This file controls which features and services are enabled or disabled in the build.
 * Set a feature to `true` to enable it, `false` to disable it.
 * 
 * When a feature is disabled:
 * - Its UI components will not be rendered
 * - Its routes/views will not be accessible
 * - Its services will not be initialized
 * - Navigation items will be hidden
 * 
 * Dependencies are automatically handled - if you enable a feature, its dependencies
 * will also be enabled even if explicitly set to false.
 * 
 * USAGE EXAMPLES:
 * 
 * 1. Enable only marketplace:
 *    - Set marketplace: true
 *    - Set all other features to false (except dependencies)
 *    - Or use the marketplaceOnlyConfig preset below
 * 
 * 2. Enable specific services:
 *    - Set the features you want to true
 *    - Set everything else to false
 *    - Dependencies will be auto-enabled
 */

export interface FeatureConfig {
  // Core Features
  dashboard: boolean;
  consoleMode: boolean;
  
  // Marketplace Features
  marketplace: boolean;
  
  // Domain Management Features
  domainManagement: boolean;
  nameBrowser: boolean;
  
  // Metadata Features
  metadataEditor: boolean;
  metadataTools: boolean;
  
  // Security Features
  securityMonitor: boolean;
  auditLog: boolean;
  dnssec: boolean;
  
  // Governance Features
  governance: boolean;
  
  // Registry Features
  contractRegistry: boolean;
  daoRegistry: boolean;
  integrations: boolean;
  
  // Workflow Features
  contractRegistration: boolean;
  preflightChecker: boolean;
  
  // Tools Features
  namingToolkit: boolean;
  
  // Reference Features
  protocolReference: boolean;
  bestPractices: boolean;
  documentation: boolean;
  
  // Analytics Features
  analytics: boolean;
  
  // Admin Features
  feeManagement: boolean;
  masterDatabase: boolean;
  adminPanel: boolean;
  
  // System Features
  settings: boolean;
  guidedWorkflow: boolean;
  
  // AI Features
  aiTools: boolean;
}

/**
 * Default configuration - all features enabled
 * Modify this to enable/disable specific features
 */
const defaultConfig: FeatureConfig = {
  // Core Features
  dashboard: true,
  consoleMode: false,
  
  // Marketplace Features
  marketplace: true,
  
  // Domain Management Features
  domainManagement: true,
  nameBrowser: true,
  
  // Metadata Features
  metadataEditor: true,
  metadataTools: true,
  
  // Security Features
  securityMonitor: true,
  auditLog: true,
  dnssec: true,
  
  // Governance Features
  governance: true,
  
  // Registry Features
  contractRegistry: true,
  daoRegistry: true,
  integrations: true,
  
  // Workflow Features
  contractRegistration: true,
  preflightChecker: true,
  
  // Tools Features
  namingToolkit: true,
  
  // Reference Features
  protocolReference: true,
  bestPractices: true,
  documentation: true,
  
  // Analytics Features
  analytics: true,
  
  // Admin Features
  feeManagement: true,
  masterDatabase: true,
  adminPanel: true,
  
  // System Features
  settings: true,
  guidedWorkflow: true,
  
  // AI Features
  aiTools: true,
};

/**
 * Marketplace-only configuration preset
 * 
 * To use this preset, change getActiveConfig() to return resolveDependencies(marketplaceOnlyConfig)
 */
const marketplaceOnlyConfig: FeatureConfig = {
  // Core Features
  dashboard: true,
  consoleMode: false,
  
  // Marketplace Features
  marketplace: true,
  
  // Domain Management Features (required for marketplace)
  domainManagement: true,
  nameBrowser: true,
  
  // Metadata Features
  metadataEditor: false,
  metadataTools: false,
  
  // Security Features
  securityMonitor: false,
  auditLog: false,
  dnssec: false,
  
  // Governance Features
  governance: false,
  
  // Registry Features
  contractRegistry: false,
  daoRegistry: false,
  integrations: false,
  
  // Workflow Features
  contractRegistration: false,
  preflightChecker: false,
  
  // Tools Features
  namingToolkit: false,
  
  // Reference Features
  protocolReference: false,
  bestPractices: false,
  documentation: true, // Keep documentation available
  
  // Analytics Features
  analytics: true, // Keep analytics for marketplace stats
  
  // Admin Features
  feeManagement: false,
  masterDatabase: false,
  adminPanel: false,
  
  // System Features
  settings: true, // Keep settings for user preferences
  guidedWorkflow: false,
};

/**
 * Feature dependency map
 * Defines which features depend on others
 */
const featureDependencies: Record<keyof FeatureConfig, (keyof FeatureConfig)[]> = {
  dashboard: [],
  consoleMode: [],
  marketplace: ['domainManagement', 'nameBrowser'],
  domainManagement: [],
  nameBrowser: [],
  metadataEditor: [],
  metadataTools: [],
  securityMonitor: [],
  auditLog: [],
  dnssec: [],
  governance: [],
  contractRegistry: [],
  daoRegistry: [],
  integrations: [],
  contractRegistration: [],
  preflightChecker: [],
  namingToolkit: [],
  protocolReference: [],
  bestPractices: [],
  documentation: [],
  analytics: [],
  feeManagement: [],
  masterDatabase: [],
  adminPanel: [],
  settings: [],
  guidedWorkflow: [],
  aiTools: [],
};

/**
 * Resolve dependencies - if a feature is enabled, ensure its dependencies are also enabled
 */
function resolveDependencies(config: FeatureConfig): FeatureConfig {
  const resolved = { ...config };
  let changed = true;
  
  while (changed) {
    changed = false;
    for (const [feature, enabled] of Object.entries(resolved) as [keyof FeatureConfig, boolean][]) {
      if (enabled) {
        const deps = featureDependencies[feature];
        if (deps && Array.isArray(deps)) {
          for (const dep of deps) {
            if (!resolved[dep]) {
              resolved[dep] = true;
              changed = true;
            }
          }
        }
      }
    }
  }
  
  return resolved;
}

/**
 * Get the active configuration
 * 
 * MODIFY THIS FUNCTION to change which preset is used:
 * - return resolveDependencies(defaultConfig) - all features enabled
 * - return resolveDependencies(marketplaceOnlyConfig) - marketplace only
 * - return resolveDependencies(yourCustomConfig) - your custom preset
 */
function getActiveConfig(): FeatureConfig {
  // Use default config - change this to use marketplaceOnlyConfig or create your own
  return resolveDependencies(defaultConfig);
  
  // Uncomment to use marketplace-only mode:
  // return resolveDependencies(marketplaceOnlyConfig);
  
  // Reference marketplaceOnlyConfig to avoid unused variable warning
  // (it's available for use by uncommenting the line above)
  void marketplaceOnlyConfig;
}

/**
 * Export the resolved configuration
 */
export const buildConfig = getActiveConfig();

/**
 * Helper function to check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureConfig): boolean {
  return buildConfig[feature] ?? false;
}

/**
 * View type to feature mapping
 * Maps each view to its corresponding feature flag
 */
export const viewToFeatureMap: Record<string, keyof FeatureConfig> = {
  dashboard: 'dashboard',
  domains: 'domainManagement',
  'name-browser': 'nameBrowser',
  metadata: 'metadataEditor',
  security: 'securityMonitor',
  governance: 'governance',
  audit: 'auditLog',
  naming: 'namingToolkit',
  protocol: 'protocolReference',
  'best-practices': 'bestPractices',
  documentation: 'documentation',
  settings: 'settings',
  'dao-registry': 'daoRegistry',
  integrations: 'integrations',
  'metadata-tools': 'metadataTools',
  contracts: 'contractRegistry',
  'contract-registration': 'contractRegistration',
  analytics: 'analytics',
  'preflight-checker': 'preflightChecker',
  marketplace: 'marketplace',
  dnssec: 'dnssec',
  'fee-management': 'feeManagement',
  'master-database': 'masterDatabase',
  'admin-panel': 'adminPanel',
  'guided-workflow': 'guidedWorkflow',
  'ai-tools': 'aiTools',
};

/**
 * Check if a view is enabled
 */
export function isViewEnabled(view: string): boolean {
  const feature = viewToFeatureMap[view];
  if (!feature) {
    // Unknown views are disabled by default
    return false;
  }
  return isFeatureEnabled(feature);
}

