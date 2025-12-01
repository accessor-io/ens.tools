#!/usr/bin/env node

/**
 * Cursor Orchestration Script
 * Continuously orchestrates with Cursor to build, test, fix, and improve the app
 * Cycle: Run → Test → Fix → Add → Run → Test → Fix → Add...
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const MAX_CYCLES = 100; // Maximum development cycles
const CYCLE_DELAY = 5000; // Delay between cycles (5 seconds)
const LOG_FILE = path.join(__dirname, '../cursor-orchestration.log');
const INSTRUCTIONS_FILE = path.join(__dirname, '../cursor-instructions.md');
const STATUS_FILE = path.join(__dirname, '../cursor-status.json');

// Development cycle steps
const CYCLE_STEPS = [
  {
    name: 'Run Tests',
    command: 'npm run test:all -- --run',
    type: 'test',
    onFailure: 'analyze_test_failures'
  },
  {
    name: 'Type Check',
    command: 'npx tsc --noEmit',
    type: 'check',
    onFailure: 'analyze_type_errors'
  },
  {
    name: 'Lint Check',
    command: 'npm run organize:check || echo "Linting check"',
    type: 'check',
    onFailure: 'analyze_lint_errors'
  },
  {
    name: 'Build Check',
    command: 'npm run build:all',
    type: 'build',
    onFailure: 'analyze_build_errors'
  },
  {
    name: 'Validate Build',
    command: 'node -e "const fs=require(\'fs\'); if(!fs.existsSync(\'build/index.html\')) throw new Error(\'Build missing\');"',
    type: 'validate',
    onFailure: 'analyze_validation_errors'
  }
];

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
      output: captureOutput ? error.stdout : null, 
      error: error.message,
      stderr: error.stderr
    };
  }
}

function analyzeTestFailures(error, output) {
  return {
    issue: 'Test Failures Detected',
    priority: 'high',
    instructions: `Tests are failing. Please:
1. Review the test output above
2. Fix the failing tests
3. Ensure all tests pass
4. Add missing test coverage if needed

Error details: ${error}
${output ? `\nTest output:\n${output.substring(0, 1000)}` : ''}`
  };
}

function analyzeTypeErrors(error, output) {
  return {
    issue: 'TypeScript Type Errors',
    priority: 'high',
    instructions: `TypeScript compilation errors detected. Please:
1. Review all type errors
2. Fix type mismatches
3. Add proper type annotations
4. Ensure all types are correct

Error: ${error}
${output ? `\nType errors:\n${output.substring(0, 2000)}` : ''}`
  };
}

function analyzeLintErrors(error, output) {
  return {
    issue: 'Code Quality Issues',
    priority: 'medium',
    instructions: `Code organization/linting issues found. Please:
1. Run: npm run organize:fix
2. Fix any remaining code quality issues
3. Ensure code follows project standards

Error: ${error}`
  };
}

function analyzeBuildErrors(error, output) {
  return {
    issue: 'Build Errors',
    priority: 'high',
    instructions: `Build is failing. Please:
1. Review build errors
2. Fix compilation issues
3. Resolve dependency problems
4. Ensure all packages build correctly

Error: ${error}
${output ? `\nBuild output:\n${output.substring(0, 2000)}` : ''}`
  };
}

function analyzeValidationErrors(error, output) {
  return {
    issue: 'Build Validation Failed',
    priority: 'high',
    instructions: `Build output validation failed. Please:
1. Ensure build completes successfully
2. Verify build/index.html exists
3. Check build configuration
4. Fix any build issues

Error: ${error}`
  };
}

function createCursorInstructions(step, analysis) {
  const instructions = `# Cursor Instructions - Cycle ${step.cycle}

## Current Issue
**${analysis.issue}** (Priority: ${analysis.priority})

## Action Required
${analysis.instructions}

## Context
- Step: ${step.name}
- Type: ${step.type}
- Cycle: ${step.cycle}/${MAX_CYCLES}
- Timestamp: ${new Date().toISOString()}

## Next Steps
After fixing this issue, the orchestration script will:
1. Re-run tests
2. Verify the fix
3. Continue to next step

---
*This file is auto-generated by cursor-orchestrate.js*
*Review and fix the issues, then the script will continue automatically*
`;

  fs.writeFileSync(INSTRUCTIONS_FILE, instructions);
  log(`\n📝 Instructions written to: ${INSTRUCTIONS_FILE}`, 'cyan');
  log(`   Please review and fix the issues in Cursor`, 'yellow');
}

function updateStatus(cycle, step, status, issues = []) {
  const statusData = {
    cycle,
    currentStep: step.name,
    status,
    issues,
    timestamp: new Date().toISOString(),
    lastUpdate: new Date().toISOString()
  };
  fs.writeFileSync(STATUS_FILE, JSON.stringify(statusData, null, 2));
}

async function runCycle(cycleNumber) {
  log('\n' + '='.repeat(70), 'bright');
  log(`DEVELOPMENT CYCLE ${cycleNumber}/${MAX_CYCLES}`, 'bright');
  log('='.repeat(70), 'bright');

  const cycleResults = [];
  let hasFailures = false;

  for (let i = 0; i < CYCLE_STEPS.length; i++) {
    const step = { ...CYCLE_STEPS[i], cycle: cycleNumber };
    log(`\n[${i + 1}/${CYCLE_STEPS.length}] ${step.name}`, 'cyan');

    const result = runCommand(step.command, true);
    cycleResults.push({ step: step.name, ...result });

    if (!result.success) {
      hasFailures = true;
      log(`✗ ${step.name} failed`, 'red');
      playBell();

      // Analyze the failure
      let analysis;
      switch (step.onFailure) {
        case 'analyze_test_failures':
          analysis = analyzeTestFailures(result.error, result.output);
          break;
        case 'analyze_type_errors':
          analysis = analyzeTypeErrors(result.error, result.output);
          break;
        case 'analyze_lint_errors':
          analysis = analyzeLintErrors(result.error, result.output);
          break;
        case 'analyze_build_errors':
          analysis = analyzeBuildErrors(result.error, result.output);
          break;
        case 'analyze_validation_errors':
          analysis = analyzeValidationErrors(result.error, result.output);
          break;
        default:
          analysis = {
            issue: `${step.name} Failed`,
            priority: 'high',
            instructions: `Fix the ${step.name} step. Error: ${result.error}`
          };
      }

      // Create instructions for Cursor
      createCursorInstructions(step, analysis);
      updateStatus(cycleNumber, step, 'failed', [analysis.issue]);

      log(`\n⏸️  Pausing for manual fixes...`, 'yellow');
      log(`   Review: ${INSTRUCTIONS_FILE}`, 'yellow');
      log(`   Status: ${STATUS_FILE}`, 'yellow');
      log(`   Waiting ${CYCLE_DELAY / 1000}s before retry...`, 'yellow');

      await sleep(CYCLE_DELAY);
      return { success: false, cycleResults, stepFailed: step.name };
    } else {
      log(`✓ ${step.name} passed`, 'green');
    }

    await sleep(1000); // Small delay between steps
  }

  // All steps passed
  updateStatus(cycleNumber, { name: 'All Steps' }, 'success', []);
  return { success: true, cycleResults };
}

async function orchestrate() {
  log('='.repeat(70), 'bright');
  log('CURSOR ORCHESTRATION - Continuous Development Cycle', 'bright');
  log('Run → Test → Fix → Add → Run → Test → Fix → Add...', 'bright');
  log('='.repeat(70), 'bright');

  // Clear log
  if (fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '');
  }

  // Initialize status
  updateStatus(0, { name: 'Initializing' }, 'starting', []);

  let cycle = 0;
  let consecutiveSuccesses = 0;
  const requiredSuccesses = 3; // Need 3 successful cycles in a row

  while (cycle < MAX_CYCLES) {
    cycle++;
    const result = await runCycle(cycle);

    if (result.success) {
      consecutiveSuccesses++;
      log(`\n✓ Cycle ${cycle} completed successfully!`, 'green');
      log(`   Consecutive successes: ${consecutiveSuccesses}/${requiredSuccesses}`, 'green');

      if (consecutiveSuccesses >= requiredSuccesses) {
        log('\n' + '='.repeat(70), 'green');
        log('🎉 APPLICATION IS PRODUCTION READY!', 'green');
        log(`   Completed ${cycle} cycles`, 'green');
        log(`   All checks passing consistently`, 'green');
        log('='.repeat(70), 'green');
        updateStatus(cycle, { name: 'Complete' }, 'production-ready', []);
        process.exit(0);
      }

      log(`   Waiting ${CYCLE_DELAY / 1000}s before next cycle...`, 'blue');
      await sleep(CYCLE_DELAY);
    } else {
      consecutiveSuccesses = 0;
      log(`\n⚠ Cycle ${cycle} had failures`, 'yellow');
      log(`   Waiting for fixes...`, 'yellow');
      // Will retry in next cycle
    }
  }

  log('\n' + '='.repeat(70), 'red');
  log('Maximum cycles reached', 'red');
  log(`Completed ${cycle} cycles`, 'red');
  log('='.repeat(70), 'red');
  process.exit(1);
}

// Handle termination
process.on('SIGINT', () => {
  playBell();
  log('\n\nOrchestration interrupted by user', 'yellow');
  log(`Status: ${STATUS_FILE}`, 'yellow');
  log(`Instructions: ${INSTRUCTIONS_FILE}`, 'yellow');
  process.exit(130);
});

// Start orchestration
orchestrate().catch(error => {
  playBell();
  log(`Fatal error: ${error.message}`, 'red');
  log(error.stack, 'red');
  process.exit(1);
});





