#!/usr/bin/env node

/**
 * AI-Powered Orchestration Script
 * Automatically evaluates the application, creates plans, and builds them
 * until it becomes a comprehensive ENS marketplace and management system
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Simple file pattern matching (glob alternative)
function findFiles(pattern, cwd) {
  try {
    const result = execSync(`find ${cwd} -name "${pattern.replace('**/', '')}" -type f 2>/dev/null | head -5`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return result.trim().split('\n').filter(f => f.length > 0);
  } catch (e) {
    return [];
  }
}

// Configuration
const MAX_CYCLES = 200;
const CYCLE_DELAY = 8000; // 8 seconds between cycles
const EVALUATION_DELAY = 3000; // 3 seconds after evaluation
const LOG_FILE = path.join(__dirname, '../ai-orchestration.log');
const PLANS_FILE = path.join(__dirname, '../development-plans.md');
const EVALUATION_FILE = path.join(__dirname, '../application-evaluation.json');
const STATUS_FILE = path.join(__dirname, '../orchestration-status.json');
const INSTRUCTIONS_FILE = path.join(__dirname, '../cursor-instructions.md');

// Comprehensive ENS Marketplace & Management System Requirements
const REQUIRED_FEATURES = {
  'Domain Management': {
    priority: 'critical',
    checks: [
      { type: 'component', path: 'src/components/domains/DomainManagement.tsx' },
      { type: 'service', path: 'src/lib/services/ens-*.ts' },
      { type: 'feature', name: 'Domain registration', test: 'domain registration functionality' },
      { type: 'feature', name: 'Domain transfer', test: 'domain transfer functionality' },
      { type: 'feature', name: 'Domain renewal', test: 'domain renewal functionality' },
      { type: 'feature', name: 'Subdomain management', test: 'subdomain creation/management' }
    ]
  },
  'Marketplace': {
    priority: 'critical',
    checks: [
      { type: 'component', path: 'src/components/marketplace/KamikoMarketplace.tsx' },
      { type: 'service', path: 'src/lib/services/ens-marketplace-service.ts' },
      { type: 'service', path: 'src/lib/services/seaport-*.ts' },
      { type: 'feature', name: 'Domain listings', test: 'list domains for sale' },
      { type: 'feature', name: 'Domain purchases', test: 'buy domains from marketplace' },
      { type: 'feature', name: 'Offers system', test: 'make and manage offers' },
      { type: 'feature', name: 'Seaport integration', test: 'Seaport 1.6 orderbook' }
    ]
  },
  'Metadata Management': {
    priority: 'high',
    checks: [
      { type: 'component', path: 'src/components/metadata/MetadataEditor.tsx' },
      { type: 'service', path: 'src/lib/metadata/*.ts' },
      { type: 'feature', name: 'ENSIP-19 support', test: 'ENSIP-19 metadata schema' },
      { type: 'feature', name: 'Metadata editor', test: 'visual metadata editor' },
      { type: 'feature', name: 'Schema validation', test: 'metadata schema validation' }
    ]
  },
  'Security & Monitoring': {
    priority: 'high',
    checks: [
      { type: 'component', path: 'src/components/security/SecurityMonitor.tsx' },
      { type: 'component', path: 'src/components/security/AuditLog.tsx' },
      { type: 'feature', name: 'Audit logging', test: 'transaction audit logs' },
      { type: 'feature', name: 'Security monitoring', test: 'security threat detection' }
    ]
  },
  'Name Browser': {
    priority: 'high',
    checks: [
      { type: 'component', path: 'src/components/domains/NameBrowser.tsx' },
      { type: 'feature', name: 'Domain search', test: 'search ENS domains' },
      { type: 'feature', name: 'Domain availability', test: 'check domain availability' }
    ]
  },
  'Governance': {
    priority: 'medium',
    checks: [
      { type: 'component', path: 'src/components/governance/GovernancePanel.tsx' },
      { type: 'feature', name: 'Governance proposals', test: 'view ENS governance' },
      { type: 'feature', name: 'DAO registry', test: 'DAO contract registry' }
    ]
  },
  'Analytics': {
    priority: 'medium',
    checks: [
      { type: 'component', path: 'src/components/AnalyticsDashboard.tsx' },
      { type: 'component', path: 'src/components/marketplace/MarketplaceAnalytics.tsx' },
      { type: 'feature', name: 'Marketplace analytics', test: 'trading analytics' },
      { type: 'feature', name: 'Domain analytics', test: 'domain performance metrics' }
    ]
  },
  'Delegation System': {
    priority: 'high',
    checks: [
      { type: 'component', path: 'src/components/delegation/GranularPermissions.tsx' },
      { type: 'service', path: 'src/lib/delegation/*.ts' },
      { type: 'feature', name: 'Granular permissions', test: 'permission-based delegation' },
      { type: 'feature', name: 'Delegate management', test: 'assign/remove delegates' }
    ]
  },
  'Transaction Management': {
    priority: 'critical',
    checks: [
      { type: 'component', path: 'src/components/TransactionStatusPanel.tsx' },
      { type: 'service', path: 'src/lib/hooks/useTransactionManager.ts' },
      { type: 'feature', name: 'Transaction building', test: 'build transactions' },
      { type: 'feature', name: 'Transaction tracking', test: 'track transaction status' },
      { type: 'feature', name: 'Batch transactions', test: 'batch operation support' }
    ]
  },
  'Contract Registry': {
    priority: 'medium',
    checks: [
      { type: 'component', path: 'src/components/registry/ContractRegistry.tsx' },
      { type: 'component', path: 'src/components/workflows/ContractRegistration.tsx' },
      { type: 'feature', name: 'Contract registration', test: 'register ENS contracts' },
      { type: 'feature', name: 'Preflight checker', test: 'contract deployment checks' }
    ]
  },
  'Testing': {
    priority: 'critical',
    checks: [
      { type: 'test', path: 'src/**/*.test.ts' },
      { type: 'test', path: 'src/**/*.test.tsx' },
      { type: 'coverage', name: 'Test coverage', threshold: 60 }
    ]
  },
  'Documentation': {
    priority: 'medium',
    checks: [
      { type: 'docs', path: 'docs/**/*.md' },
      { type: 'docs', path: 'README.md' },
      { type: 'feature', name: 'API documentation', test: 'API reference docs' }
    ]
  },
  'Production Readiness': {
    priority: 'critical',
    checks: [
      { type: 'build', name: 'Type checking', command: 'npx tsc --noEmit' },
      { type: 'build', name: 'Build success', command: 'npm run build:all' },
      { type: 'build', name: 'Tests pass', command: 'npm run test:all -- --run' }
    ]
  }
};

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(`${colors[color]}${logMessage}${colors.reset}`);
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

function playBell() {
  process.stdout.write('\x07\a');
  if (process.platform === 'darwin') {
    try {
      execSync('afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || true', { stdio: 'ignore' });
    } catch (e) {}
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fileExists(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  return fs.existsSync(fullPath);
}

function checkFiles(pattern) {
  try {
    const files = findFiles(pattern, path.join(__dirname, '..'));
    return files.length > 0;
  } catch (e) {
    return false;
  }
}

function runCommand(command, captureOutput = false) {
  try {
    const output = execSync(command, {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      stdio: captureOutput ? 'pipe' : 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    return { success: true, output: captureOutput ? output : null, error: null };
  } catch (error) {
    return { 
      success: false, 
      output: captureOutput ? (error.stdout || '') : null, 
      error: error.message,
      stderr: error.stderr || ''
    };
  }
}

async function evaluateApplication() {
  log('\n' + '='.repeat(70), 'bright');
  log('EVALUATING APPLICATION', 'bright');
  log('='.repeat(70), 'bright');

  const evaluation = {
    timestamp: new Date().toISOString(),
    features: {},
    overallScore: 0,
    missingFeatures: [],
    recommendations: []
  };

  let totalChecks = 0;
  let passedChecks = 0;

  for (const [featureName, featureConfig] of Object.entries(REQUIRED_FEATURES)) {
    log(`\nEvaluating: ${featureName} (${featureConfig.priority})`, 'cyan');
    const featureEval = {
      name: featureName,
      priority: featureConfig.priority,
      checks: [],
      score: 0,
      status: 'unknown'
    };

    for (const check of featureConfig.checks) {
      totalChecks++;
      let passed = false;
      let details = '';

      if (check.type === 'component' || check.type === 'service' || check.type === 'test' || check.type === 'docs') {
        passed = fileExists(check.path);
        details = passed ? 'File exists' : 'File missing';
      } else if (check.type === 'feature') {
        // Check if feature is implemented by searching codebase
        const searchResult = runCommand(`grep -r "${check.test}" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | head -1`, true);
        passed = searchResult.success && searchResult.output && searchResult.output.trim().length > 0;
        details = passed ? 'Feature found in codebase' : 'Feature not found';
      } else if (check.type === 'build') {
        const result = runCommand(check.command, true);
        passed = result.success;
        details = passed ? 'Check passed' : `Check failed: ${result.error}`;
      } else if (check.type === 'coverage') {
        // Check test coverage (simplified)
        const testFiles = checkFiles('*.test.ts') || checkFiles('*.test.tsx');
        passed = testFiles;
        details = passed ? 'Test files exist' : 'Test coverage insufficient';
      }

      featureEval.checks.push({
        check: check.name || check.path || check.test,
        passed,
        details
      });

      if (passed) {
        passedChecks++;
        featureEval.score++;
      }
    }

    featureEval.score = (featureEval.score / featureConfig.checks.length) * 100;
    
    if (featureEval.score === 100) {
      featureEval.status = 'complete';
    } else if (featureEval.score >= 70) {
      featureEval.status = 'mostly-complete';
    } else if (featureEval.score >= 40) {
      featureEval.status = 'in-progress';
    } else {
      featureEval.status = 'missing';
      evaluation.missingFeatures.push(featureName);
    }

    evaluation.features[featureName] = featureEval;
    log(`  Score: ${featureEval.score.toFixed(1)}% - ${featureEval.status}`, 
        featureEval.status === 'complete' ? 'green' : 
        featureEval.status === 'mostly-complete' ? 'yellow' : 'red');
  }

  evaluation.overallScore = (passedChecks / totalChecks) * 100;
  
  log('\n' + '='.repeat(70), 'bright');
  log(`OVERALL SCORE: ${evaluation.overallScore.toFixed(1)}%`, 
      evaluation.overallScore >= 90 ? 'green' : 
      evaluation.overallScore >= 70 ? 'yellow' : 'red');
  log(`Passed: ${passedChecks}/${totalChecks} checks`, 'blue');
  log(`Missing Features: ${evaluation.missingFeatures.length}`, 
      evaluation.missingFeatures.length === 0 ? 'green' : 'red');
  log('='.repeat(70), 'bright');

  // Save evaluation
  fs.writeFileSync(EVALUATION_FILE, JSON.stringify(evaluation, null, 2));
  return evaluation;
}

function createDevelopmentPlans(evaluation) {
  log('\n' + '='.repeat(70), 'bright');
  log('CREATING DEVELOPMENT PLANS', 'bright');
  log('='.repeat(70), 'bright');

  const plans = [];
  const priorities = { critical: 1, high: 2, medium: 3, low: 4 };

  // Sort features by priority and completeness
  const featuresToFix = Object.entries(evaluation.features)
    .filter(([_, feature]) => feature.status !== 'complete')
    .sort((a, b) => {
      const priorityDiff = priorities[a[1].priority] - priorities[b[1].priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a[1].score - b[1].score; // Lower score first
    });

  for (const [featureName, feature] of featuresToFix) {
    const failedChecks = feature.checks.filter(c => !c.passed);
    
    if (failedChecks.length === 0) continue;

    const plan = {
      id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      feature: featureName,
      priority: feature.priority,
      status: 'pending',
      tasks: [],
      estimatedTime: 'unknown'
    };

    for (const check of failedChecks) {
      let task = {
        action: '',
        description: '',
        files: [],
        code: ''
      };

      if (check.check.includes('.tsx') || check.check.includes('.ts')) {
        // Component or service file missing
        task.action = 'create_file';
        task.description = `Create ${check.check}`;
        task.files = [check.check];
        task.code = `// TODO: Implement ${featureName} - ${check.check}`;
      } else if (check.check.includes('test')) {
        // Test file missing
        task.action = 'create_tests';
        task.description = `Add tests for ${featureName}`;
        task.files = [`src/**/*.test.ts`];
      } else if (check.check.includes('command')) {
        // Build/check command failed
        task.action = 'fix_build';
        task.description = `Fix: ${check.check}`;
        task.files = [];
      } else {
        // Feature missing
        task.action = 'implement_feature';
        task.description = `Implement: ${check.check}`;
        task.files = [];
      }

      plan.tasks.push(task);
    }

    plans.push(plan);
    log(`\nPlan created: ${featureName}`, 'cyan');
    log(`  Priority: ${feature.priority}`, 'blue');
    log(`  Tasks: ${plan.tasks.length}`, 'blue');
  }

  // Generate markdown plan document
  let planDoc = `# Development Plans - ${new Date().toISOString()}\n\n`;
  planDoc += `## Overall Status\n\n`;
  planDoc += `- **Score**: ${evaluation.overallScore.toFixed(1)}%\n`;
  planDoc += `- **Missing Features**: ${evaluation.missingFeatures.length}\n`;
  planDoc += `- **Total Plans**: ${plans.length}\n\n`;
  planDoc += `---\n\n`;

  for (const plan of plans) {
    planDoc += `## ${plan.feature} (${plan.priority} priority)\n\n`;
    planDoc += `**Status**: ${plan.status}\n\n`;
    planDoc += `### Tasks\n\n`;
    
    plan.tasks.forEach((task, idx) => {
      planDoc += `${idx + 1}. **${task.action}**: ${task.description}\n`;
      if (task.files.length > 0) {
        planDoc += `   - Files: ${task.files.join(', ')}\n`;
      }
      planDoc += `\n`;
    });
    
    planDoc += `---\n\n`;
  }

  fs.writeFileSync(PLANS_FILE, planDoc);
  log(`\n✓ Development plans saved to: ${PLANS_FILE}`, 'green');
  
  return plans;
}

function createCursorInstructions(plan) {
  const instructions = `# Cursor Instructions - ${plan.feature}

## Priority: ${plan.priority.toUpperCase()}

## Feature: ${plan.feature}

## Tasks to Complete

${plan.tasks.map((task, idx) => `
### Task ${idx + 1}: ${task.action}

**Description**: ${task.description}

${task.files.length > 0 ? `**Files to create/modify**:\n${task.files.map(f => `- ${f}`).join('\n')}` : ''}

${task.code ? `**Code template**:\n\`\`\`typescript\n${task.code}\n\`\`\`` : ''}

**Action Required**: ${task.action === 'create_file' ? 'Create the missing file with proper implementation' :
                      task.action === 'create_tests' ? 'Add comprehensive tests' :
                      task.action === 'fix_build' ? 'Fix the build/check errors' :
                      task.action === 'implement_feature' ? 'Implement the missing feature' : 'Complete this task'}

`).join('\n')}

## Next Steps

1. Review the tasks above
2. Implement each task using Cursor's AI assistance
3. Test your changes
4. The orchestration script will verify completion

---
*Auto-generated by AI Orchestration Script*
*Cycle: ${new Date().toISOString()}*
`;

  fs.writeFileSync(INSTRUCTIONS_FILE, instructions);
  return instructions;
}

async function executePlan(plan, cycleNumber) {
  log('\n' + '='.repeat(70), 'bright');
  log(`EXECUTING PLAN: ${plan.feature}`, 'bright');
  log('='.repeat(70), 'bright');

  // Create instructions for Cursor
  const instructions = createCursorInstructions(plan);
  log(`\n📝 Instructions created for Cursor`, 'cyan');
  log(`   File: ${INSTRUCTIONS_FILE}`, 'blue');
  
  // Update plan status
  plan.status = 'in-progress';
  plan.startedAt = new Date().toISOString();

  // Wait for implementation (user fixes in Cursor)
  log(`\n⏸️  Waiting for implementation...`, 'yellow');
  log(`   Please review ${INSTRUCTIONS_FILE} and implement using Cursor`, 'yellow');
  log(`   The script will verify after ${CYCLE_DELAY / 1000}s`, 'yellow');
  
  await sleep(CYCLE_DELAY);

  // Re-evaluate to check if plan is complete
  log(`\n🔍 Verifying implementation...`, 'cyan');
  const newEvaluation = await evaluateApplication();
  const featureEval = newEvaluation.features[plan.feature];

  if (featureEval && featureEval.status === 'complete') {
    plan.status = 'complete';
    plan.completedAt = new Date().toISOString();
    log(`\n✓ Plan completed: ${plan.feature}`, 'green');
    return { success: true, plan };
  } else {
    log(`\n⚠ Plan still in progress: ${plan.feature}`, 'yellow');
    log(`   Current score: ${featureEval ? featureEval.score.toFixed(1) : 0}%`, 'yellow');
    return { success: false, plan, progress: featureEval ? featureEval.score : 0 };
  }
}

function updateStatus(cycle, evaluation, currentPlan, overallStatus) {
  const status = {
    cycle,
    timestamp: new Date().toISOString(),
    overallScore: evaluation.overallScore,
    currentPlan: currentPlan ? {
      feature: currentPlan.feature,
      priority: currentPlan.priority,
      status: currentPlan.status
    } : null,
    overallStatus,
    featuresComplete: Object.values(evaluation.features).filter(f => f.status === 'complete').length,
    featuresTotal: Object.keys(evaluation.features).length,
    missingFeatures: evaluation.missingFeatures.length
  };
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
}

async function orchestrate() {
  log('='.repeat(70), 'bright');
  log('AI-POWERED ORCHESTRATION', 'bright');
  log('Building Comprehensive ENS Marketplace & Management System', 'bright');
  log('='.repeat(70), 'bright');

  // Clear log
  if (fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '');
  }

  let cycle = 0;
  let consecutiveCompletions = 0;
  const requiredCompletions = 3;

  while (cycle < MAX_CYCLES) {
    cycle++;
    log(`\n\n${'='.repeat(70)}`, 'bright');
    log(`CYCLE ${cycle}/${MAX_CYCLES}`, 'bright');
    log('='.repeat(70), 'bright');

    // Step 1: Evaluate
    const evaluation = await evaluateApplication();
    updateStatus(cycle, evaluation, null, 'evaluating');

    // Check if complete
    if (evaluation.overallScore >= 95 && evaluation.missingFeatures.length === 0) {
      consecutiveCompletions++;
      log(`\n✓ High score achieved! (${consecutiveCompletions}/${requiredCompletions})`, 'green');
      
      if (consecutiveCompletions >= requiredCompletions) {
        log('\n' + '='.repeat(70), 'green');
        log('🎉 APPLICATION IS COMPLETE!', 'green');
        log('Comprehensive ENS Marketplace & Management System Ready!', 'green');
        log(`Final Score: ${evaluation.overallScore.toFixed(1)}%`, 'green');
        log('='.repeat(70), 'green');
        updateStatus(cycle, evaluation, null, 'complete');
        process.exit(0);
      }
    } else {
      consecutiveCompletions = 0;
    }

    // Step 2: Create Plans
    const plans = createDevelopmentPlans(evaluation);
    
    if (plans.length === 0) {
      log('\n✓ No plans needed - all features complete!', 'green');
      await sleep(CYCLE_DELAY);
      continue;
    }

    // Step 3: Execute highest priority plan
    const nextPlan = plans[0];
    updateStatus(cycle, evaluation, nextPlan, 'executing');
    
    const result = await executePlan(nextPlan, cycle);
    
    if (result.success) {
      log(`\n✓ Plan completed successfully!`, 'green');
    } else {
      log(`\n⚠ Plan needs more work`, 'yellow');
    }

    await sleep(EVALUATION_DELAY);
  }

  log('\n' + '='.repeat(70), 'red');
  log('Maximum cycles reached', 'red');
  log('='.repeat(70), 'red');
  process.exit(1);
}

// Handle termination
process.on('SIGINT', () => {
  playBell();
  log('\n\nOrchestration interrupted', 'yellow');
  log(`Status: ${STATUS_FILE}`, 'yellow');
  log(`Plans: ${PLANS_FILE}`, 'yellow');
  process.exit(130);
});

// Start
orchestrate().catch(error => {
  playBell();
  log(`Fatal error: ${error.message}`, 'red');
  log(error.stack, 'red');
  process.exit(1);
});

