#!/usr/bin/env node

/**
 * Production Build Script
 * Upgrades application to complete production standards
 * Runs all quality checks, tests, builds, and optimizations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const MAX_RETRIES = 50; // Maximum retries for the entire production build
const RETRY_DELAY = 10000; // 10 seconds between retries
const LOG_FILE = path.join(__dirname, '../production-build.log');

// Production build steps in order
const PRODUCTION_STEPS = [
  {
    name: 'Code Organization & Quality',
    command: 'npm run organize:fix',
    required: false, // Not required, but recommended
    description: 'Organize and fix code structure issues'
  },
  {
    name: 'Type Checking',
    command: 'npx tsc --noEmit',
    required: true,
    description: 'Check TypeScript types'
  },
  {
    name: 'Contract Tests',
    command: 'npm run contracts:test',
    required: false,
    description: 'Run smart contract tests'
  },
  {
    name: 'Contract Build',
    command: 'npm run contracts:build',
    required: true,
    description: 'Compile smart contracts'
  },
  {
    name: 'CLI Build',
    command: 'npm run cli:build',
    required: false,
    description: 'Build CLI package'
  },
  {
    name: 'Application Tests',
    command: 'npm run test:all -- --run',
    required: true,
    description: 'Run all application tests'
  },
  {
    name: 'Build All Packages',
    command: 'npm run build:all',
    required: true,
    description: 'Build all workspace packages'
  },
  {
    name: 'Documentation Build',
    command: 'npm run docs:build',
    required: false,
    description: 'Build documentation site'
  },
  {
    name: 'Build Validation',
    command: 'node -e "const fs=require(\'fs\'); if(!fs.existsSync(\'build/index.html\')) throw new Error(\'Build output missing\'); console.log(\'Build validated\')"',
    required: true,
    description: 'Validate build output exists'
  }
];

// Colors for terminal output
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
  
  // Also write to log file
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

function playBell() {
  // Play bell sound - works on Unix systems (macOS, Linux)
  process.stdout.write('\x07'); // Bell character
  process.stdout.write('\a');
  
  // On macOS, also try system sound
  if (process.platform === 'darwin') {
    try {
      execSync('afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || true', { stdio: 'ignore' });
    } catch (e) {
      // Ignore errors if sound file doesn't exist
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function runStep(step, stepNumber, totalSteps) {
  try {
    log(`\n[${stepNumber}/${totalSteps}] ${step.name}`, 'cyan');
    log(`  ${step.description}`, 'blue');
    log(`  Running: ${step.command}`, 'blue');
    
    execSync(step.command, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    
    log(`  ✓ ${step.name} completed successfully`, 'green');
    return { success: true, error: null };
  } catch (error) {
    const errorMsg = error.message || 'Unknown error';
    log(`  ✗ ${step.name} failed`, 'red');
    log(`  Error: ${errorMsg}`, 'red');
    
    if (step.required) {
      return { success: false, error: errorMsg, required: true };
    } else {
      log(`  ⚠ ${step.name} is optional, continuing...`, 'yellow');
      return { success: false, error: errorMsg, required: false };
    }
  }
}

async function runProductionBuild() {
  log('='.repeat(70), 'bright');
  log('PRODUCTION BUILD - Upgrading to Production Standards', 'bright');
  log('='.repeat(70), 'bright');
  log(`Total Steps: ${PRODUCTION_STEPS.length}`, 'blue');
  log(`Required Steps: ${PRODUCTION_STEPS.filter(s => s.required).length}`, 'blue');
  log(`Optional Steps: ${PRODUCTION_STEPS.filter(s => !s.required).length}`, 'blue');
  log('='.repeat(70), 'bright');
  
  // Clear previous log file
  if (fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '');
  }
  
  const startTime = Date.now();
  const results = [];
  
  for (let i = 0; i < PRODUCTION_STEPS.length; i++) {
    const step = PRODUCTION_STEPS[i];
    const result = runStep(step, i + 1, PRODUCTION_STEPS.length);
    results.push({ step: step.name, ...result });
    
    if (!result.success && result.required) {
      playBell(); // Ding on required step failure
      log('\n' + '='.repeat(70), 'red');
      log('PRODUCTION BUILD FAILED', 'red');
      log(`Required step "${step.name}" failed`, 'red');
      log('='.repeat(70), 'red');
      log(`Full log saved to: ${LOG_FILE}`, 'yellow');
      process.exit(1);
    }
    
    // Small delay between steps
    if (i < PRODUCTION_STEPS.length - 1) {
      await sleep(500);
    }
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const requiredFailed = results.filter(r => !r.success && r.required).length;
  
  log('\n' + '='.repeat(70), 'green');
  log('PRODUCTION BUILD COMPLETE!', 'green');
  log('='.repeat(70), 'green');
  log(`Duration: ${duration} seconds`, 'green');
  log(`Steps Completed: ${successful}/${PRODUCTION_STEPS.length}`, 'green');
  
  if (failed > 0) {
    log(`Optional Steps Failed: ${failed}`, 'yellow');
    results.filter(r => !r.success).forEach(r => {
      log(`  - ${r.step}`, 'yellow');
    });
  }
  
  if (requiredFailed === 0) {
    log('\n✓ All required steps passed - Application is production ready!', 'green');
    log('='.repeat(70), 'green');
    process.exit(0);
  } else {
    log('\n✗ Some required steps failed', 'red');
    log('='.repeat(70), 'red');
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  playBell();
  log('\n\nProduction build interrupted by user', 'yellow');
  log(`Log file: ${LOG_FILE}`, 'yellow');
  process.exit(130);
});

process.on('SIGTERM', () => {
  playBell();
  log('\n\nProduction build terminated', 'yellow');
  log(`Log file: ${LOG_FILE}`, 'yellow');
  process.exit(143);
});

// Start the production build
runProductionBuild().catch(error => {
  playBell();
  log(`Fatal error: ${error.message}`, 'red');
  log(error.stack, 'red');
  process.exit(1);
});





