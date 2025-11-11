/**
 * ENS Action Template System
 * Templates for importing custom actions on multiple domains with different combinations
 */

import { ParsedAction, ParsedActionWithSchema, parseAndValidateActions, formatAction, parseAction } from './ens-action-parser';
import { ActionSchema, ENS_CONSOLE_SCHEMA } from './ens-console-schema';

export interface DomainActionProfile {
  domain: string;
  actions: ParsedAction[];
  metadata?: Record<string, any>;
}

export interface ActionTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  actions: string[]; // Action strings in bracket notation
  variables?: Record<string, string>; // Variable placeholders
  examples?: string[];
}

export interface ImportTemplate {
  domains: string[];
  template: ActionTemplate;
  variableMappings?: Record<string, Record<string, string>>; // domain -> variable -> value
}

/**
 * Standard action templates
 */
export const ACTION_TEMPLATES: ActionTemplate[] = [
  {
    id: 'setup-new-domain',
    name: 'Setup New Domain',
    description: 'Complete setup for a new domain with metadata and resolver',
    category: 'domain-setup',
    actions: [
      'setResolver: [{{domain}}]@domain = [0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63]@resolver',
      'setAddr: [{{domain}}]@domain = [{{address}}]@address',
      'setText: [{{domain}}]@domain@[description]@key = [{{description}}]@value',
      'setText: [{{domain}}]@domain@[url]@key = [{{url}}]@value',
      'setText: [{{domain}}]@domain@[avatar]@key = [{{avatar}}]@value',
    ],
    variables: {
      domain: 'example.eth',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      description: 'My awesome domain',
      url: 'https://example.com',
      avatar: 'https://example.com/avatar.png',
    },
    examples: [
      'setup-new-domain: example.eth',
      'setup-new-domain: example.eth address=0x123... description="My domain"',
    ],
  },
  {
    id: 'batch-metadata-update',
    name: 'Batch Metadata Update',
    description: 'Update multiple text records across domains',
    category: 'metadata',
    actions: [
      'setText: [{{domain}}]@domain@[{{key}}]@key = [{{value}}]@value',
    ],
    variables: {
      domain: 'example.eth',
      key: 'description',
      value: 'Updated description',
    },
  },
  {
    id: 'create-subdomain-structure',
    name: 'Create Subdomain Structure',
    description: 'Create multiple subdomains under a parent domain',
    category: 'subdomain',
    actions: [
      '+mintSubdomain: [{{subname}}]@subname@[{{parent}}]@parent = [{{owner}}]@owner',
    ],
    variables: {
      subname: 'app',
      parent: 'example.eth',
      owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    },
  },
  {
    id: 'delegate-permissions',
    name: 'Delegate Permissions',
    description: 'Set up delegation with specific permissions',
    category: 'delegation',
    actions: [
      '+delegateTo: [{{domain}}]@domain = [{{delegate}}]@delegate@[{{permissions}}]@permissions',
    ],
    variables: {
      domain: 'example.eth',
      delegate: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      permissions: '7', // MANAGE_SUBDOMAINS | SET_ADDR_RECORD | SET_TEXT_RECORD
    },
  },
  {
    id: 'wrap-and-configure',
    name: 'Wrap and Configure',
    description: 'Wrap domain and set up fuses',
    category: 'wrapper',
    actions: [
      '+wrap: [{{domain}}]@domain = [{{owner}}]@owner + [{{fuses}}]@fuses',
      'setFuses: [{{domain}}]@domain = [{{fuses}}]@fuses',
    ],
    variables: {
      domain: 'example.eth',
      owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      fuses: '7',
    },
  },
];

/**
 * Generate domain action profiles from template
 */
export function generateProfilesFromTemplate(
  template: ActionTemplate,
  domains: string[],
  variableMappings?: Record<string, Record<string, string>>
): DomainActionProfile[] {
  return domains.map(domain => {
    const domainVars = variableMappings?.[domain] || {};
    const actions = template.actions.map(actionString => {
      // Replace template variables
      let processed = actionString;
      
      // Replace {{domain}} with actual domain
      processed = processed.replace(/\{\{domain\}\}/g, domain);
      
      // Replace other variables from template defaults or domain-specific mappings
      for (const [key, value] of Object.entries(template.variables || {})) {
        const domainValue = domainVars[key] || value;
        processed = processed.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), domainValue);
      }
      
      // Parse the processed action
      return parseAction(processed);
    });
    
    return {
      domain,
      actions,
      metadata: {
        templateId: template.id,
        templateName: template.name,
        ...domainVars,
      },
    };
  });
}

/**
 * Export profile to custom schema format
 */
export function exportProfileToSchema(profile: DomainActionProfile): string {
  const lines: string[] = [];
  
  lines.push(`# Domain: ${profile.domain}`);
  if (profile.metadata) {
    lines.push(`# Metadata: ${JSON.stringify(profile.metadata)}`);
  }
  lines.push('');
  
  for (const action of profile.actions) {
    lines.push(formatAction(action));
  }
  
  return lines.join('\n');
}

/**
 * Export multiple profiles to schema
 */
export function exportProfilesToSchema(profiles: DomainActionProfile[]): string {
  return profiles.map(profile => exportProfileToSchema(profile)).join('\n\n');
}

/**
 * Build custom schema from actions
 */
export function buildCustomSchema(actions: ParsedAction[]): {
  schema: string;
  json: any;
} {
  const json = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    actions: actions.map(action => ({
      action: action.action,
      operator: action.operator,
      parameters: action.parameters,
    })),
  };
  
  const schema = JSON.stringify(json, null, 2);
  
  return { schema, json };
}

/**
 * Import actions from custom schema
 */
export function importFromCustomSchema(schemaString: string): ParsedAction[] {
  try {
    const json = JSON.parse(schemaString);
    
    if (!json.actions || !Array.isArray(json.actions)) {
      throw new Error('Invalid schema: missing actions array');
    }
    
    return json.actions.map((actionData: any) => ({
      action: actionData.action,
      operator: actionData.operator || '=',
      parameters: actionData.parameters || {},
      raw: formatAction({
        action: actionData.action,
        operator: actionData.operator || '=',
        parameters: actionData.parameters || {},
      }),
    }));
  } catch (error) {
    // Try parsing as bracket notation string
    return parseAndValidateActions(schemaString);
  }
}

/**
 * Create template from existing actions
 */
export function createTemplateFromActions(
  id: string,
  name: string,
  description: string,
  category: string,
  actions: ParsedAction[]
): ActionTemplate {
  // Convert actions to template format with variables
  const templateActions = actions.map(action => {
    let actionString = formatAction(action);
    
    // Replace values with variable placeholders
    for (const [key, value] of Object.entries(action.parameters)) {
      const placeholder = `{{${key}}}`;
      actionString = actionString.replace(`[${value}]`, `[${placeholder}]`);
    }
    
    return actionString;
  });
  
  // Extract default variables from first action's parameters
  const variables: Record<string, string> = {};
  if (actions.length > 0) {
    for (const [key, value] of Object.entries(actions[0].parameters)) {
      variables[key] = String(value);
    }
  }
  
  return {
    id,
    name,
    description,
    category,
    actions: templateActions,
    variables,
  };
}

/**
 * Get template by ID
 */
export function getTemplate(templateId: string): ActionTemplate | undefined {
  return ACTION_TEMPLATES.find(t => t.id === templateId);
}

/**
 * Get all templates by category
 */
export function getTemplatesByCategory(category: string): ActionTemplate[] {
  return ACTION_TEMPLATES.filter(t => t.category === category);
}

/**
 * Example usage template for documentation
 */
export const EXAMPLE_TEMPLATE = `
# ENS Action Template Example

## Single Domain Actions
+mintSubdomain: [app]@subname@[example.eth]@parent
setText: [example.eth]@domain@[description]@key = [My awesome domain]@value
+delegateTo: [example.eth]@domain = [0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@delegate@[7]@permissions

## Multiple Domains with Same Actions
# Domain 1
+mintSubdomain: [app]@subname@[example1.eth]@parent
setText: [example1.eth]@domain@[description]@key = [Domain 1]@value

# Domain 2
+mintSubdomain: [app]@subname@[example2.eth]@parent
setText: [example2.eth]@domain@[description]@key = [Domain 2]@value

## Batch Operations
setText: [example.eth]@domain@[url]@key = [https://example.com]@value
setText: [example.eth]@domain@[avatar]@key = [https://example.com/avatar.png]@value
setText: [example.eth]@domain@[com.twitter]@key = [@example]@value
`;

