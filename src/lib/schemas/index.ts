/**
 * ENS Console Schema System
 * Main entry point for schema definitions, parsing, templates, and exports
 */

// Schema definitions
export {
  ENS_CONSOLE_SCHEMA,
  PERMISSION_KEYS,
  FUSE_CONSTANTS,
  getActionSchema,
  getActionsByCategory,
  getAllActions,
  type ActionSchema,
  type ActionOperator,
  type SchemaField,
} from './ens-console-schema';

// Action parser
export {
  parseAction,
  parseAndValidateAction,
  parseActions,
  parseAndValidateActions,
  formatAction,
  type ParsedAction,
  type ParsedActionWithSchema,
} from './ens-action-parser';

// Templates
export {
  ACTION_TEMPLATES,
  generateProfilesFromTemplate,
  exportProfileToSchema,
  exportProfilesToSchema,
  buildCustomSchema as buildSchemaFromActions,
  importFromCustomSchema,
  createTemplateFromActions,
  getTemplate,
  getTemplatesByCategory,
  EXAMPLE_TEMPLATE,
  type DomainActionProfile,
  type ActionTemplate,
  type ImportTemplate,
} from './ens-action-template';

// Export utilities
export {
  exportProfile,
  exportProfiles,
  buildCustomSchema,
  exportDataPoint,
  buildSchemaFromDataPoints,
  generateImportTemplate,
  type ExportOptions,
  type ExportedSchema,
} from './ens-schema-exporter';

// Action interpreter and batch builder
export {
  interpretAction,
  interpretActions,
  type InterpretedAction,
  type BatchTransaction,
} from './ens-action-interpreter';

export {
  buildBatchTransaction,
  executeBatchTransaction,
  estimateBatchGas,
  findCallDataPosition,
  highlightCallDataForAction,
  type BatchCall,
  type BatchTransactionResult,
} from './ens-batch-builder';

// Action executor
export {
  executeActionsFromString,
  uploadAndExecuteActions,
  getBatchTransactionAuditEntry,
  type ExecuteActionsOptions,
  type ExecuteActionsResult,
} from './ens-action-executor';

/**
 * Quick reference: Common action patterns
 */
export const ACTION_PATTERNS = {
  // Subdomain operations
  createSubdomain: '+mintSubdomain: [{{subname}}]@subname@[{{parent}}]@parent',
  removeSubdomain: '-removeSubdomain: [{{subname}}]@subname@[{{parent}}]@parent',
  transferSubdomain: 'transferSubdomain: [{{subname}}]@subname@[{{parent}}]@parent = [{{to}}]@to',
  
  // Text records
  setText: 'setText: [{{domain}}]@domain@[{{key}}]@key = [{{value}}]@value',
  removeText: '-removeText: [{{domain}}]@domain@[{{key}}]@key',
  
  // Address records
  setAddress: 'setAddr: [{{domain}}]@domain = [{{address}}]@address',
  setMultiChainAddress: 'setAddr: [{{domain}}]@domain = [{{address}}]@address@[{{coinType}}]@coinType',
  
  // Delegation
  addDelegate: '+delegateTo: [{{domain}}]@domain = [{{delegate}}]@delegate@[{{permissions}}]@permissions',
  removeDelegate: '-removeDelegate: [{{domain}}]@domain@[{{delegate}}]@delegate',
  setDelegatePermissions: 'delegateAuthSelect: [{{domain}}]@domain@[{{delegate}}]@delegate = [{{permissionKeys}}]@permissionKeys',
  
  // Wrapper operations
  wrap: '+wrap: [{{domain}}]@domain = [{{owner}}]@owner',
  unwrap: '-unwrap: [{{domain}}]@domain = [{{controller}}]@controller',
  setFuses: 'setFuses: [{{domain}}]@domain = [{{fuses}}]@fuses',
  
  // Domain operations
  transfer: 'transfer: [{{domain}}]@domain = [{{to}}]@to',
  renew: '+renew: [{{domain}}]@domain + [{{duration}}]@duration',
  setResolver: 'setResolver: [{{domain}}]@domain = [{{resolver}}]@resolver',
  
  // Content
  setContentHash: 'setContentHash: [{{domain}}]@domain = [{{contentHash}}]@contentHash',
  setTTL: 'setTTL: [{{domain}}]@domain = [{{ttl}}]@ttl',
  
  // Reverse records
  setReverseRecord: 'setReverseRecord: [{{address}}]@address = [{{name}}]@name',
} as const;

/**
 * Helper function to create an action string from pattern
 */
export function createActionFromPattern(
  pattern: string,
  variables: Record<string, string>
): string {
  let result = pattern;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

