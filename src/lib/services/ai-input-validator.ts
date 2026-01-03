/**
 * AI Input Validation Service
 * Validates and sanitizes user inputs before sending to AI/LLM services
 * Implements guardrails to prevent prompt injection and ensure ENS protocol compliance
 */

export interface ValidationResult {
  isValid: boolean;
  sanitizedInput: string;
  errors: string[];
  warnings: string[];
}

export class AIInputValidator {
  /**
   * Prompt injection patterns to detect
   */
  private readonly injectionPatterns = [
    /ignore previous instructions/i,
    /system:.*override/i,
    /<script|javascript:/i,
    new RegExp('\\[INST\\]|\\[/INST\\]', 'i'), // Llama format
    /<\|im_start\|>|<\|im_end\|>/i, // ChatML format
    /you are now/i,
    /forget all previous/i,
    /disregard the above/i,
    /new instructions/i,
    /override system/i,
    /bypass safety/i,
    /ignore safety/i,
    /jailbreak/i,
  ];

  /**
   * ENS protocol validation patterns
   */
  private readonly ensPattern = /^[a-z0-9-]+\.eth$/i;
  private readonly subdomainPattern = /^[a-z0-9-]+(\.[a-z0-9-]+)+\.eth$/i;

  /**
   * Validate and sanitize input for AI processing
   */
  validateInput(input: string, context?: 'domain' | 'metadata' | 'query'): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedInput = input.trim();

    // Check for prompt injection
    const hasInjection = this.injectionPatterns.some(pattern => pattern.test(sanitizedInput));
    if (hasInjection) {
      errors.push('Input contains potentially malicious patterns. Please rephrase your request.');
      sanitizedInput = this.sanitizeInput(sanitizedInput);
    }

    // Context-specific validation
    if (context === 'domain') {
      const domainValidation = this.validateDomainInput(sanitizedInput);
      if (!domainValidation.isValid) {
        errors.push(...domainValidation.errors);
        warnings.push(...domainValidation.warnings);
      }
    } else if (context === 'metadata') {
      const metadataValidation = this.validateMetadataInput(sanitizedInput);
      if (!metadataValidation.isValid) {
        errors.push(...metadataValidation.errors);
        warnings.push(...metadataValidation.warnings);
      }
    }

    // Length validation
    if (sanitizedInput.length > 10000) {
      errors.push('Input is too long. Maximum length is 10,000 characters.');
      sanitizedInput = sanitizedInput.substring(0, 10000);
    }

    // Check for empty input after sanitization
    if (sanitizedInput.length === 0 && input.trim().length > 0) {
      errors.push('Input was removed during sanitization. Please provide a valid input.');
    }

    return {
      isValid: errors.length === 0,
      sanitizedInput,
      errors,
      warnings,
    };
  }

  /**
   * Sanitize input by removing dangerous patterns
   */
  private sanitizeInput(input: string): string {
    let sanitized = input;

    // Remove script tags
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');

    // Remove javascript: protocols
    sanitized = sanitized.replace(/javascript:/gi, '');

    // Remove common injection patterns
    this.injectionPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Remove control characters except newlines and tabs
    sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

    return sanitized.trim();
  }

  /**
   * Validate domain-related input
   */
  private validateDomainInput(input: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if input contains ENS domain
    const domainMatch = input.match(/([a-z0-9-]+\.eth)/gi);
    if (domainMatch) {
      domainMatch.forEach(domain => {
        if (!this.ensPattern.test(domain) && !this.subdomainPattern.test(domain)) {
          warnings.push(`Domain "${domain}" may not be valid ENS format`);
        }
      });
    }

    // Check for suspicious domain patterns
    if (input.includes('..') || input.includes('--')) {
      warnings.push('Input contains suspicious domain patterns');
    }

    return {
      isValid: errors.length === 0,
      sanitizedInput: input,
      errors,
      warnings,
    };
  }

  /**
   * Validate metadata-related input
   */
  private validateMetadataInput(input: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for JSON structure if it looks like JSON
    if (input.trim().startsWith('{') || input.trim().startsWith('[')) {
      try {
        JSON.parse(input);
      } catch (e) {
        warnings.push('Input appears to be JSON but is not valid');
      }
    }

    // Check for extremely long strings that might be malicious
    if (input.length > 5000) {
      warnings.push('Metadata input is very long. Consider breaking it into smaller pieces.');
    }

    return {
      isValid: errors.length === 0,
      sanitizedInput: input,
      errors,
      warnings,
    };
  }

  /**
   * Extract ENS domain names from input
   */
  extractDomains(input: string): string[] {
    const domains: string[] = [];
    const domainRegex = /([a-z0-9-]+(\.[a-z0-9-]+)*\.eth)/gi;
    const matches = input.matchAll(domainRegex);
    
    for (const match of matches) {
      if (match[1] && !domains.includes(match[1].toLowerCase())) {
        domains.push(match[1].toLowerCase());
      }
    }

    return domains;
  }

  /**
   * Check if input is safe for AI processing
   */
  isSafeForAI(input: string): boolean {
    const validation = this.validateInput(input);
    return validation.isValid && validation.errors.length === 0;
  }
}

export const aiInputValidator = new AIInputValidator();
