/**
 * ENSIP-19 Validator
 * JSON Schema validation using AJV
 */

import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import ensip19Schema from './ensip19-schema.json';
import { ENSIP19Metadata, validateENSIP19Metadata } from './ensip19-utils';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  schemaErrors?: any[];
}

/**
 * AJV Schema Validator instance
 */
let ajvValidator: ValidateFunction | null = null;

/**
 * Initialize AJV validator
 */
function getValidator(): ValidateFunction {
  if (!ajvValidator) {
    const ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
    });
    
    addFormats(ajv);
    ajvValidator = ajv.compile(ensip19Schema);
  }
  
  return ajvValidator;
}

/**
 * Validate ENSIP-19 metadata against JSON Schema
 */
export function validateWithSchema(metadata: Partial<ENSIP19Metadata>): ValidationResult {
  const validator = getValidator();
  const valid = validator(metadata);
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!valid && validator.errors) {
    validator.errors.forEach((error) => {
      const field = error.instancePath.replace(/^\//, '').replace(/\//g, '.');
      const message = error.message || 'Validation failed';
      
      if (error.keyword === 'required') {
        errors.push(`Field "${error.params.missingProperty}" is required`);
      } else if (field) {
        errors.push(`Field "${field}": ${message}`);
      } else {
        errors.push(message);
      }
    });
  }
  
  return {
    valid,
    errors,
    warnings,
    schemaErrors: validator.errors || undefined,
  };
}

/**
 * Full ENSIP-19 validation combining schema and custom validation
 */
export function validateENSIP19Full(metadata: Partial<ENSIP19Metadata>): ValidationResult {
  // Run schema validation
  const schemaResult = validateWithSchema(metadata);
  
  // Run custom validation
  const customResult = validateENSIP19Metadata(metadata);
  
  // Combine results
  return {
    valid: schemaResult.valid && customResult.valid,
    errors: [...schemaResult.errors, ...customResult.errors],
    warnings: [...schemaResult.warnings, ...customResult.warnings],
    schemaErrors: schemaResult.schemaErrors,
  };
}

/**
 * QA Standards Validator
 * Implements the 15 QA standards from qa-validation-rules.json
 */
export class QAValidator {
  /**
   * Standard 1: Metadata Schema Validation
   */
  static validateStandard1(metadata: Partial<ENSIP19Metadata>): ValidationResult {
    return validateWithSchema(metadata);
  }

  /**
   * Standard 2: Canonical ID Grammar
   */
  static validateStandard2(metadata: Partial<ENSIP19Metadata>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!metadata.id) {
      errors.push('Canonical ID is required');
      return { valid: false, errors, warnings };
    }

    // Validate ID grammar
    const pattern = /^([a-z0-9-]+)\.([a-z0-9.-]+)\.(defi|dao|l2|infra|token|nft|gaming|social|identity|privacy|security|wallet|analytics|rwa|supply|health|finance|dev|art)\.([a-z0-9-]+)(?:\.([a-z0-9-]+))?\.v([0-9]+(-[0-9]+)?(-[0-9]+)?)\.([0-9]+)$/;
    
    if (!pattern.test(metadata.id)) {
      errors.push('Canonical ID does not match ENSIP-19 grammar: org.protocol.category.role[.variant].version.chainId');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Standard 3: Root Domain Categorization
   */
  static validateStandard3(metadata: Partial<ENSIP19Metadata>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const approvedCategories = [
      'defi', 'dao', 'l2', 'infra', 'token', 'nft', 'gaming', 'social',
      'identity', 'privacy', 'security', 'wallet', 'analytics', 'rwa',
      'supply', 'health', 'finance', 'dev', 'art'
    ];

    if (!metadata.category) {
      errors.push('Category is required');
    } else if (!approvedCategories.includes(metadata.category)) {
      errors.push(`Category must be one of: ${approvedCategories.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Standard 5: Security Standards
   */
  static validateStandard5(metadata: Partial<ENSIP19Metadata>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!metadata.security) {
      warnings.push('Security information is recommended');
      return { valid: true, errors, warnings };
    }

    if (!metadata.security.audits || metadata.security.audits.length === 0) {
      warnings.push('At least one security audit is recommended for production contracts');
    }

    if (!metadata.security.owners || metadata.security.owners.length === 0) {
      warnings.push('Contract owners should be specified');
    }

    if (!metadata.security.upgradeability) {
      warnings.push('Upgradeability type should be specified');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Standard 6: Lifecycle Management
   */
  static validateStandard6(metadata: Partial<ENSIP19Metadata>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!metadata.lifecycle) {
      warnings.push('Lifecycle information is recommended');
      return { valid: true, errors, warnings };
    }

    const validStatuses = ['planning', 'development', 'testing', 'deployed', 'deprecated', 'discontinued'];
    
    if (metadata.lifecycle.status && !validStatuses.includes(metadata.lifecycle.status)) {
      errors.push(`Lifecycle status must be one of: ${validStatuses.join(', ')}`);
    }

    if (metadata.lifecycle.status === 'deprecated' && !metadata.lifecycle.replacedBy) {
      warnings.push('Deprecated contracts should specify replacement in "replacedBy" field');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Standard 10: Version and Compatibility
   */
  static validateStandard10(metadata: Partial<ENSIP19Metadata>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!metadata.version) {
      errors.push('Version is required');
      return { valid: false, errors, warnings };
    }

    const versionPattern = /^v[0-9]+(-[0-9]+)?(-[0-9]+)?$/;
    if (!versionPattern.test(metadata.version)) {
      errors.push('Version must match format: v{num}, v{num}-{num}, or v{num}-{num}-{num} (hyphen-separated)');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Run all QA standards validation
   */
  static validateAll(metadata: Partial<ENSIP19Metadata>): ValidationResult {
    const results = [
      this.validateStandard1(metadata),
      this.validateStandard2(metadata),
      this.validateStandard3(metadata),
      this.validateStandard5(metadata),
      this.validateStandard6(metadata),
      this.validateStandard10(metadata),
    ];

    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    results.forEach((result) => {
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    });

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  /**
   * Calculate compliance score
   */
  static calculateComplianceScore(metadata: Partial<ENSIP19Metadata>): {
    score: number;
    level: 'excellent' | 'good' | 'acceptable' | 'poor' | 'non-compliant';
    breakdown: Record<string, { passed: boolean; weight: number }>;
  } {
    const standards = {
      'Schema Validation': { result: this.validateStandard1(metadata), weight: 20 },
      'Canonical ID': { result: this.validateStandard2(metadata), weight: 20 },
      'Category Classification': { result: this.validateStandard3(metadata), weight: 15 },
      'Security Standards': { result: this.validateStandard5(metadata), weight: 15 },
      'Lifecycle Management': { result: this.validateStandard6(metadata), weight: 10 },
      'Version Format': { result: this.validateStandard10(metadata), weight: 10 },
    };

    let totalScore = 0;
    const breakdown: Record<string, { passed: boolean; weight: number }> = {};

    Object.entries(standards).forEach(([name, { result, weight }]) => {
      const passed = result.valid;
      breakdown[name] = { passed, weight };
      if (passed) {
        totalScore += weight;
      }
    });

    // Normalize to 100
    const maxScore = Object.values(standards).reduce((sum, s) => sum + s.weight, 0);
    const normalizedScore = (totalScore / maxScore) * 100;

    let level: 'excellent' | 'good' | 'acceptable' | 'poor' | 'non-compliant';
    if (normalizedScore >= 90) level = 'excellent';
    else if (normalizedScore >= 80) level = 'good';
    else if (normalizedScore >= 70) level = 'acceptable';
    else if (normalizedScore >= 60) level = 'poor';
    else level = 'non-compliant';

    return {
      score: Math.round(normalizedScore),
      level,
      breakdown,
    };
  }
}

