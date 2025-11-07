/**
 * Input sanitization utilities
 */

/**
 * Sanitize string input by removing potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove null bytes and control characters except newlines and tabs
  return input
    .replace(/\0/g, '')
    .replace(/[\x01-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHTML(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize SQL identifier (table/column names)
 */
export function sanitizeSQLIdentifier(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Only allow alphanumeric and underscores
  return input.replace(/[^a-zA-Z0-9_]/g, '');
}

/**
 * Validate and sanitize Ethereum address
 */
export function sanitizeAddress(address: string): string | null {
  if (typeof address !== 'string') {
    return null;
  }
  
  const sanitized = address.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(sanitized)) {
    return null;
  }
  
  return sanitized.toLowerCase();
}

/**
 * Sanitize domain name
 */
export function sanitizeDomain(domain: string): string {
  if (typeof domain !== 'string') {
    return '';
  }
  
  // Remove any characters that aren't valid in domain names
  return domain
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.|\.$/g, '');
}

/**
 * Sanitize JSON input
 */
export function sanitizeJSON(input: any): any {
  if (input === null || input === undefined) {
    return input;
  }
  
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      return sanitizeJSON(parsed);
    } catch {
      return sanitizeString(input);
    }
  }
  
  if (Array.isArray(input)) {
    return input.map(item => sanitizeJSON(item));
  }
  
  if (typeof input === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeJSON(value);
    }
    return sanitized;
  }
  
  if (typeof input === 'string') {
    return sanitizeString(input);
  }
  
  return input;
}

