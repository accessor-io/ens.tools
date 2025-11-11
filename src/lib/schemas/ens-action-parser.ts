/**
 * ENS Action Parser
 * Parses bracket notation syntax: [value]@parameter with +/- operators
 * 
 * Syntax Rules:
 * - + prefix: Add/create operation
 * - - prefix: Remove/delete operation
 * - = or no prefix: Set/update operation
 * - [value]@parameter: Value wrapped in brackets, parameter name after @
 * - Multiple parameters: [value1]@param1@[value2]@param2
 */

import { ActionSchema, ActionOperator, ENS_CONSOLE_SCHEMA, getActionSchema } from './ens-console-schema';

export interface ParsedAction {
  action: string;
  operator: ActionOperator;
  parameters: Record<string, any>;
  raw: string;
}

export interface ParsedActionWithSchema extends ParsedAction {
  schema: ActionSchema;
}

/**
 * Parse a single action string into structured data
 * 
 * Examples:
 * - "+mintSubdomain: [app]@subname@[example.eth]@parent"
 * - "setText: [example.eth]@domain@[description]@key = [My domain]@value"
 * - "-removeDelegate: [example.eth]@domain@[0x742d...]@delegate"
 */
export function parseAction(actionString: string): ParsedAction {
  const trimmed = actionString.trim();
  
  // Extract operator and action name
  let operator: ActionOperator = '=';
  let actionPart: string;
  
  if (trimmed.startsWith('+')) {
    operator = '+';
    actionPart = trimmed.slice(1);
  } else if (trimmed.startsWith('-')) {
    operator = '-';
    actionPart = trimmed.slice(1);
  } else {
    operator = '=';
    actionPart = trimmed;
  }
  
  // Split action name and parameters
  const colonIndex = actionPart.indexOf(':');
  if (colonIndex === -1) {
    throw new Error(`Invalid action format: missing colon separator in "${actionString}"`);
  }
  
  const action = actionPart.slice(0, colonIndex).trim();
  const paramsString = actionPart.slice(colonIndex + 1).trim();
  
  // Parse parameters using bracket notation
  const parameters = parseParameters(paramsString);
  
  return {
    action,
    operator,
    parameters,
    raw: actionString,
  };
}

/**
 * Parse parameter string with bracket notation
 * Format: [value1]@param1@[value2]@param2 or [value1]@param1 = [value2]@param2
 */
function parseParameters(paramsString: string): Record<string, any> {
  const parameters: Record<string, any> = {};
  
  // Handle assignment operator (=) if present
  const parts = paramsString.split('=').map(p => p.trim());
  
  // Parse all parts
  const allParts = parts.join('@').split('@').map(p => p.trim()).filter(p => p);
  
  let i = 0;
  while (i < allParts.length) {
    const part = allParts[i];
    
    // Check if this is a bracketed value
    if (part.startsWith('[') && part.endsWith(']')) {
      const value = part.slice(1, -1);
      
      // Next part should be parameter name
      if (i + 1 < allParts.length) {
        const paramName = allParts[i + 1];
        
        // Convert value based on common patterns
        const convertedValue = convertValue(value);
        parameters[paramName] = convertedValue;
        
        i += 2;
      } else {
        throw new Error(`Parameter value "${part}" is missing parameter name`);
      }
    } else {
      // This might be a parameter name without explicit brackets
      // Check if next part is a value
      if (i + 1 < allParts.length && allParts[i + 1].startsWith('[')) {
        // Current is param name, next is value
        const paramName = part;
        const valuePart = allParts[i + 1];
        const value = valuePart.slice(1, -1);
        parameters[paramName] = convertValue(value);
        i += 2;
      } else {
        // Standalone parameter name (boolean flag or default value)
        parameters[part] = true;
        i += 1;
      }
    }
  }
  
  return parameters;
}

/**
 * Convert string value to appropriate type
 */
function convertValue(value: string): any {
  // Try to detect type and convert
  if (value === 'true') return true;
  if (value === 'false') return false;
  
  // Try number
  if (/^-?\d+$/.test(value)) {
    return parseInt(value, 10);
  }
  
  // Try bigint (large numbers)
  if (/^-?\d+n$/.test(value)) {
    return BigInt(value.slice(0, -1));
  }
  
  // Try hex
  if (/^0x[a-fA-F0-9]+$/.test(value)) {
    return value;
  }
  
  // Try array (comma-separated)
  if (value.includes(',') && !value.includes(' ')) {
    return value.split(',').map(v => v.trim()).filter(v => v);
  }
  
  // Default to string
  return value;
}

/**
 * Parse action and validate against schema
 */
export function parseAndValidateAction(actionString: string): ParsedActionWithSchema {
  const parsed = parseAction(actionString);
  const schema = getActionSchema(parsed.action);
  
  if (!schema) {
    throw new Error(`Unknown action: "${parsed.action}"`);
  }
  
  // Validate operator matches schema
  if (schema.operator && schema.operator !== parsed.operator) {
    // Allow override but warn
    console.warn(`Action "${parsed.action}" typically uses operator "${schema.operator}" but got "${parsed.operator}"`);
  }
  
  // Validate required parameters
  for (const param of schema.parameters) {
    if (param.required && !(param.key in parsed.parameters)) {
      throw new Error(`Missing required parameter "${param.key}" for action "${parsed.action}"`);
    }
  }
  
  // Type conversion based on schema
  for (const param of schema.parameters) {
    if (param.key in parsed.parameters) {
      const value = parsed.parameters[param.key];
      parsed.parameters[param.key] = convertValueToType(value, param.type);
    }
  }
  
  return {
    ...parsed,
    schema,
  };
}

/**
 * Convert value to specified type
 */
function convertValueToType(value: any, type: string): any {
  switch (type) {
    case 'number':
      return typeof value === 'number' ? value : parseInt(String(value), 10);
    case 'bigint':
      return typeof value === 'bigint' ? value : BigInt(String(value));
    case 'boolean':
      return typeof value === 'boolean' ? value : value === 'true' || value === true;
    case 'array':
      return Array.isArray(value) ? value : [value];
    case 'object':
      return typeof value === 'object' ? value : JSON.parse(String(value));
    case 'hex':
      return String(value);
    case 'timestamp':
      return typeof value === 'number' ? value : parseInt(String(value), 10);
    default:
      return String(value);
  }
}

/**
 * Format action back to bracket notation string
 */
export function formatAction(parsed: ParsedAction): string {
  const operatorPrefix = parsed.operator === '+' ? '+' : parsed.operator === '-' ? '-' : '';
  const parts: string[] = [];
  
  for (const [key, value] of Object.entries(parsed.parameters)) {
    const formattedValue = formatValue(value);
    parts.push(`[${formattedValue}]@${key}`);
  }
  
  return `${operatorPrefix}${parsed.action}: ${parts.join('@')}`;
}

/**
 * Format value for bracket notation
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'boolean') {
    return String(value);
  }
  
  if (typeof value === 'bigint') {
    return `${value}n`;
  }
  
  if (Array.isArray(value)) {
    return value.join(',');
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return String(value);
}

/**
 * Parse multiple actions from a string (one per line)
 */
export function parseActions(actionStrings: string): ParsedAction[] {
  const lines = actionStrings
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && !line.startsWith('//'));
  
  return lines.map(line => parseAction(line));
}

/**
 * Parse and validate multiple actions
 */
export function parseAndValidateActions(actionStrings: string): ParsedActionWithSchema[] {
  const lines = actionStrings
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && !line.startsWith('//'));
  
  return lines.map(line => parseAndValidateAction(line));
}







