/**
 * Feature Flags Utility
 * 
 * This utility provides functions for services and components to check
 * if features are enabled based on the build configuration.
 */

import { buildConfig, isFeatureEnabled, isViewEnabled   } from '../../config/feature-flags.config';

/**
 * Re-export build config functions for convenience
 */
export { buildConfig, isFeatureEnabled, isViewEnabled };

/**
 * Check if marketplace features are enabled
 */
export function isMarketplaceEnabled(): boolean {
  return isFeatureEnabled('marketplace');
}

/**
 * Check if domain management features are enabled
 */
export function isDomainManagementEnabled(): boolean {
  return isFeatureEnabled('domainManagement');
}

/**
 * Check if metadata features are enabled
 */
export function isMetadataEnabled(): boolean {
  return isFeatureEnabled('metadataEditor') || isFeatureEnabled('metadataTools');
}

/**
 * Check if security features are enabled
 */
export function isSecurityEnabled(): boolean {
  return isFeatureEnabled('securityMonitor') || isFeatureEnabled('auditLog');
}

/**
 * Check if analytics features are enabled
 */
export function isAnalyticsEnabled(): boolean {
  return isFeatureEnabled('analytics');
}

/**
 * Check if admin features are enabled
 */
export function isAdminEnabled(): boolean {
  return isFeatureEnabled('adminPanel') || isFeatureEnabled('feeManagement') || isFeatureEnabled('masterDatabase');
}

/**
 * Get all enabled features as an array
 */
export function getEnabledFeatures(): string[] {
  return Object.entries(buildConfig)
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature);
}

/**
 * Get all disabled features as an array
 */
export function getDisabledFeatures(): string[] {
  return Object.entries(buildConfig)
    .filter(([_, enabled]) => !enabled)
    .map(([feature]) => feature);
}

