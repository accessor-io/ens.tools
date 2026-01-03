#!/usr/bin/env node

/**
 * Continuous Production Build Script
 * Continuously runs production build until all steps succeed
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const MAX_RETRIES = process.env.MAX_RETRIES ? parseInt(process.env.MAX_RETRIES) : 50;
const RETRY_DELAY = process.env.RETRY_DELAY ? parseInt(process.env.RETRY_DELAY) : 10000; // 10 seconds
const PRODUCTION_BUILD_SCRIPT = path.join(__dirname, 'production-build.js');
const LOG_FILE = path.join(__dirname, '../production-build-continuous.log');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(`${colors[color]}${logMessage}${colors.reset}`);
  
  // Also write to log file
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

function playBell() {
  process.stdout.write('\x07');
  process.stdout.write('\a');
  
  if (process.platform === 'darwin') {
    try {
      execSync('afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || true', { stdio: 'ignore' });
    } catch (e) {
      // Ignore errors
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function runProductionBuild() {
  try {
    log(`Running production build script...`, 'cyan');
    execSync(`node ${PRODUCTION_BUILD_SCRIPT}`, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function continuousProductionBuild() {
  log('='.repeat(70), 'bright');
  log('CONTINUOUS PRODUCTION BUILD', 'bright');
  log('Upgrading application to production standards until complete', 'bright');
  log('='.repeat(70), 'bright');
  log(`Max Retries: ${MAX_RETRIES}`, 'blue');
  log(`Retry Delay: ${RETRY_DELAY / 1000}s`, 'blue');
  log('='.repeat(70), 'bright');
  
  // Clear previous log file
  if (fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '');
  }
  
  let attempt = 0;
  let lastError = null;
  
  while (attempt < MAX_RETRIES) {
    attempt++;
    log(`\n--- Production Build Attempt ${attempt}/${MAX_RETRIES} ---`, 'yellow');
    
    const result = runProductionBuild();
    
    if (result.success) {
      log('\n' + '='.repeat(70), 'green');
      log('PRODUCTION BUILD SUCCESSFUL!', 'green');
      log('Application is now at production standards!', 'green');
      log(`Completed in ${attempt} attempt(s)`, 'green');
      log('='.repeat(70), 'green');
      process.exit(0);
    } else {
      lastError = result.error;
      log(`Production build failed on attempt ${attempt}`, 'red');
      playBell(); // Ding on error!
      
      if (attempt < MAX_RETRIES) {
        log(`Waiting ${RETRY_DELAY / 1000} seconds before retry...`, 'yellow');
        await sleep(RETRY_DELAY);
      }
    }
  }
  
  // If we get here, all retries failed
  playBell();
  playBell(); // Double ding for emphasis
  await sleep(100);
  log('\n' + '='.repeat(70), 'red');
  log('PRODUCTION BUILD FAILED AFTER ALL RETRIES', 'red');
  log(`Attempted ${MAX_RETRIES} times`, 'red');
  if (lastError) {
    log(`Last Error: ${lastError}`, 'red');
  }
  log('='.repeat(70), 'red');
  log(`Full log saved to: ${LOG_FILE}`, 'yellow');
  process.exit(1);
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n\nProduction build interrupted by user', 'yellow');
  log(`Log file: ${LOG_FILE}`, 'yellow');
  process.exit(130);
});

process.on('SIGTERM', () => {
  log('\n\nProduction build terminated', 'yellow');
  log(`Log file: ${LOG_FILE}`, 'yellow');
  process.exit(143);
});

// Start the continuous production build
continuousProductionBuild().catch(error => {
  playBell();
  log(`Fatal error: ${error.message}`, 'red');
  log(error.stack, 'red');
  process.exit(1);
});










