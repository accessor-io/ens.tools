/**
 * ENS Schema Exporter
 * Export and build custom schemas from domain action profiles
 */

import { DomainActionProfile, exportProfileToSchema, exportProfilesToSchema } from './ens-action-template';
import { ParsedAction, formatAction } from './ens-action-parser';
import { ENS_CONSOLE_SCHEMA } from './ens-console-schema';

export interface ExportOptions {
  format: 'bracket' | 'json' | 'yaml' | 'csv';
  includeMetadata?: boolean;
  includeSchema?: boolean;
  groupByDomain?: boolean;
}

export interface ExportedSchema {
  format: string;
  content: string;
  metadata?: {
    domainCount: number;
    actionCount: number;
    generatedAt: string;
  };
}

/**
 * Export a single profile to custom schema
 */
export function exportProfile(
  profile: DomainActionProfile,
  options: ExportOptions = { format: 'bracket' }
): ExportedSchema {
  const actionCount = profile.actions.length;
  
  switch (options.format) {
    case 'bracket':
      return {
        format: 'bracket',
        content: exportProfileToSchema(profile),
        metadata: {
          domainCount: 1,
          actionCount,
          generatedAt: new Date().toISOString(),
        },
      };
    
    case 'json':
      return {
        format: 'json',
        content: JSON.stringify({
          domain: profile.domain,
          actions: profile.actions.map(a => ({
            action: a.action,
            operator: a.operator,
            parameters: a.parameters,
          })),
          metadata: options.includeMetadata ? profile.metadata : undefined,
        }, null, 2),
        metadata: {
          domainCount: 1,
          actionCount,
          generatedAt: new Date().toISOString(),
        },
      };
    
    case 'yaml':
      return {
        format: 'yaml',
        content: exportToYaml(profile),
        metadata: {
          domainCount: 1,
          actionCount,
          generatedAt: new Date().toISOString(),
        },
      };
    
    case 'csv':
      return {
        format: 'csv',
        content: exportToCsv([profile]),
        metadata: {
          domainCount: 1,
          actionCount,
          generatedAt: new Date().toISOString(),
        },
      };
    
    default:
      throw new Error(`Unsupported format: ${options.format}`);
  }
}

/**
 * Export multiple profiles to custom schema
 */
export function exportProfiles(
  profiles: DomainActionProfile[],
  options: ExportOptions = { format: 'bracket' }
): ExportedSchema {
  const totalActions = profiles.reduce((sum, p) => sum + p.actions.length, 0);
  
  switch (options.format) {
    case 'bracket':
      return {
        format: 'bracket',
        content: exportProfilesToSchema(profiles),
        metadata: {
          domainCount: profiles.length,
          actionCount: totalActions,
          generatedAt: new Date().toISOString(),
        },
      };
    
    case 'json':
      return {
        format: 'json',
        content: JSON.stringify({
          profiles: profiles.map(p => ({
            domain: p.domain,
            actions: p.actions.map(a => ({
              action: a.action,
              operator: a.operator,
              parameters: a.parameters,
            })),
            metadata: options.includeMetadata ? p.metadata : undefined,
          })),
        }, null, 2),
        metadata: {
          domainCount: profiles.length,
          actionCount: totalActions,
          generatedAt: new Date().toISOString(),
        },
      };
    
    case 'yaml':
      return {
        format: 'yaml',
        content: exportToYamlMultiple(profiles),
        metadata: {
          domainCount: profiles.length,
          actionCount: totalActions,
          generatedAt: new Date().toISOString(),
        },
      };
    
    case 'csv':
      return {
        format: 'csv',
        content: exportToCsv(profiles),
        metadata: {
          domainCount: profiles.length,
          actionCount: totalActions,
          generatedAt: new Date().toISOString(),
        },
      };
    
    default:
      throw new Error(`Unsupported format: ${options.format}`);
  }
}

/**
 * Export to YAML format
 */
function exportToYaml(profile: DomainActionProfile): string {
  const lines: string[] = [];
  
  lines.push(`domain: ${profile.domain}`);
  
  if (profile.metadata) {
    lines.push('metadata:');
    for (const [key, value] of Object.entries(profile.metadata)) {
      lines.push(`  ${key}: ${typeof value === 'string' ? `"${value}"` : value}`);
    }
  }
  
  lines.push('actions:');
  for (const action of profile.actions) {
    lines.push(`  - action: ${action.action}`);
    lines.push(`    operator: ${action.operator}`);
    lines.push('    parameters:');
    for (const [key, value] of Object.entries(action.parameters)) {
      const formattedValue = typeof value === 'string' ? `"${value}"` : value;
      lines.push(`      ${key}: ${formattedValue}`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Export multiple profiles to YAML
 */
function exportToYamlMultiple(profiles: DomainActionProfile[]): string {
  const lines: string[] = [];
  lines.push('profiles:');
  
  for (const profile of profiles) {
    lines.push(`  - domain: ${profile.domain}`);
    
    if (profile.metadata) {
      lines.push('    metadata:');
      for (const [key, value] of Object.entries(profile.metadata)) {
        lines.push(`      ${key}: ${typeof value === 'string' ? `"${value}"` : value}`);
      }
    }
    
    lines.push('    actions:');
    for (const action of profile.actions) {
      lines.push(`      - action: ${action.action}`);
      lines.push(`        operator: ${action.operator}`);
      lines.push('        parameters:');
      for (const [key, value] of Object.entries(action.parameters)) {
        const formattedValue = typeof value === 'string' ? `"${value}"` : value;
        lines.push(`          ${key}: ${formattedValue}`);
      }
    }
  }
  
  return lines.join('\n');
}

/**
 * Export to CSV format
 */
function exportToCsv(profiles: DomainActionProfile[]): string {
  const lines: string[] = [];
  
  // Header
  lines.push('domain,action,operator,parameters');
  
  // Data rows
  for (const profile of profiles) {
    for (const action of profile.actions) {
      const paramsJson = JSON.stringify(action.parameters).replace(/"/g, '""');
      lines.push(`"${profile.domain}","${action.action}","${action.operator}","${paramsJson}"`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Build custom schema from actions with full schema definition
 */
export function buildCustomSchema(
  actions: ParsedAction[],
  includeSchemaDefinitions: boolean = false
): {
  schema: string;
  json: any;
} {
  const json: any = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    actions: actions.map(action => ({
      action: action.action,
      operator: action.operator,
      parameters: action.parameters,
    })),
  };
  
  if (includeSchemaDefinitions) {
    // Include schema definitions for each action
    json.schemas = actions.map(action => {
      const schema = ENS_CONSOLE_SCHEMA.find(s => s.action === action.action);
      return schema ? {
        action: schema.action,
        label: schema.label,
        description: schema.description,
        category: schema.category,
        parameters: schema.parameters,
      } : null;
    }).filter(Boolean);
  }
  
  const schema = JSON.stringify(json, null, 2);
  
  return { schema, json };
}

/**
 * Export profile data point to custom schema
 */
export function exportDataPoint(
  domain: string,
  action: string,
  parameters: Record<string, any>,
  operator: '+' | '-' | '=' = '='
): string {
  const actionString = formatAction({
    action,
    operator,
    parameters,
    raw: '',
  });
  
  return `# Domain: ${domain}\n${actionString}`;
}

/**
 * Build schema from data points
 */
export function buildSchemaFromDataPoints(
  dataPoints: Array<{
    domain: string;
    action: string;
    parameters: Record<string, any>;
    operator?: '+' | '-' | '=';
  }>
): ExportedSchema {
  const profiles: DomainActionProfile[] = [];
  const domainMap = new Map<string, ParsedAction[]>();
  
  // Group by domain
  for (const point of dataPoints) {
    if (!domainMap.has(point.domain)) {
      domainMap.set(point.domain, []);
    }
    
    domainMap.get(point.domain)!.push({
      action: point.action,
      operator: point.operator || '=',
      parameters: point.parameters,
      raw: '',
    });
  }
  
  // Create profiles
  for (const [domain, actions] of domainMap.entries()) {
    profiles.push({
      domain,
      actions,
    });
  }
  
  return exportProfiles(profiles, { format: 'bracket' });
}

/**
 * Generate import template from schema
 */
export function generateImportTemplate(schema: ExportedSchema): string {
  const lines: string[] = [];
  
  lines.push('# ENS Action Import Template');
  lines.push(`# Generated: ${schema.metadata?.generatedAt}`);
  lines.push(`# Domains: ${schema.metadata?.domainCount}`);
  lines.push(`# Actions: ${schema.metadata?.actionCount}`);
  lines.push('');
  lines.push('# Instructions:');
  lines.push('# 1. Replace {{domain}} with your domain name');
  lines.push('# 2. Replace other {{variable}} placeholders with your values');
  lines.push('# 3. Import using the template system');
  lines.push('');
  lines.push(schema.content);
  
  return lines.join('\n');
}

