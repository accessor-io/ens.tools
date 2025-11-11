/**
 * Best Practices Validator Service
 * Validates contract naming and metadata against best practices
 */

import { 
  allRules, 
  getRulesByCategory, 
  getRulesBySeverity, 
  getRelevantRules,
  type ValidationContext,
  type ValidationResult,
  type BestPracticeCategory,
  type Severity,
  type BestPracticeRule,
} from './rules';

export interface ValidationReport {
  passed: number;
  failed: number;
  warnings: number;
  total: number;
  score: number;
  results: Array<{
    rule: BestPracticeRule;
    result: ValidationResult;
  }>;
  criticalIssues: Array<{
    rule: BestPracticeRule;
    result: ValidationResult;
  }>;
  recommendations: Array<{
    rule: BestPracticeRule;
    result: ValidationResult;
  }>;
}

/**
 * Validate context against all best practices
 */
export function validateBestPractices(context: ValidationContext): ValidationReport {
  const results: Array<{ rule: BestPracticeRule; result: ValidationResult }> = [];
  
  for (const rule of allRules) {
    const result = rule.check(context);
    results.push({ rule, result });
  }

  const passed = results.filter(r => r.result.passed).length;
  const failed = results.filter(r => !r.result.passed).length;
  const warnings = results.filter(r => !r.result.passed && r.result.severity !== 'critical').length;
  const total = results.length;

  // Calculate score (weighted by severity)
  const severityWeights = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  let totalWeight = 0;
  let passedWeight = 0;

  for (const { result } of results) {
    const weight = severityWeights[result.severity];
    totalWeight += weight;
    if (result.passed) {
      passedWeight += weight;
    }
  }

  const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;

  const criticalIssues = results.filter(r => !r.result.passed && r.result.severity === 'critical');
  const recommendations = results.filter(r => !r.result.passed);

  return {
    passed,
    failed,
    warnings,
    total,
    score,
    results,
    criticalIssues,
    recommendations,
  };
}

/**
 * Validate specific category
 */
export function validateCategory(
  context: ValidationContext,
  category: BestPracticeCategory
): ValidationReport {
  const rules = getRulesByCategory(category);
  const results: Array<{ rule: BestPracticeRule; result: ValidationResult }> = [];
  
  for (const rule of rules) {
    const result = rule.check(context);
    results.push({ rule, result });
  }

  const passed = results.filter(r => r.result.passed).length;
  const failed = results.filter(r => !r.result.passed).length;
  const warnings = results.filter(r => !r.result.passed && r.result.severity !== 'critical').length;
  const total = results.length;

  const severityWeights = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  let totalWeight = 0;
  let passedWeight = 0;

  for (const { result } of results) {
    const weight = severityWeights[result.severity];
    totalWeight += weight;
    if (result.passed) {
      passedWeight += weight;
    }
  }

  const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;

  const criticalIssues = results.filter(r => !r.result.passed && r.result.severity === 'critical');
  const recommendations = results.filter(r => !r.result.passed);

  return {
    passed,
    failed,
    warnings,
    total,
    score,
    results,
    criticalIssues,
    recommendations,
  };
}

/**
 * Get recommendations for current context
 */
export function getRecommendations(context: ValidationContext): Array<{
  rule: BestPracticeRule;
  result: ValidationResult;
}> {
  const relevantRules = getRelevantRules(context);
  return relevantRules.map(rule => ({
    rule,
    result: rule.check(context),
  }));
}

/**
 * Get critical issues for current context
 */
export function getCriticalIssues(context: ValidationContext): Array<{
  rule: BestPracticeRule;
  result: ValidationResult;
}> {
  const report = validateBestPractices(context);
  return report.criticalIssues;
}

/**
 * Check if context passes critical validations
 */
export function passesCriticalValidations(context: ValidationContext): boolean {
  const criticalIssues = getCriticalIssues(context);
  return criticalIssues.length === 0;
}

/**
 * Get validation summary for display
 */
export function getValidationSummary(context: ValidationContext): {
  score: number;
  level: 'excellent' | 'good' | 'acceptable' | 'poor' | 'critical';
  message: string;
  criticalCount: number;
  totalIssues: number;
} {
  const report = validateBestPractices(context);
  const criticalCount = report.criticalIssues.length;
  const totalIssues = report.failed;

  let level: 'excellent' | 'good' | 'acceptable' | 'poor' | 'critical';
  let message: string;

  if (criticalCount > 0) {
    level = 'critical';
    message = `${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} must be resolved`;
  } else if (report.score >= 90) {
    level = 'excellent';
    message = 'All best practices followed';
  } else if (report.score >= 80) {
    level = 'good';
    message = 'Most best practices followed';
  } else if (report.score >= 70) {
    level = 'acceptable';
    message = 'Some improvements recommended';
  } else {
    level = 'poor';
    message = 'Multiple best practices not followed';
  }

  return {
    score: report.score,
    level,
    message,
    criticalCount,
    totalIssues,
  };
}





