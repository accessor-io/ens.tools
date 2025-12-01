#!/usr/bin/env node

/**
 * Continuous Build Script
 * Keeps building the app until it succeeds or max retries reached
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const MAX_RETRIES = 100; // Maximum number of build attempts
const RETRY_DELAY = 5000; // Delay between retries in milliseconds (5 seconds)
const BUILD_COMMAND = process.argv[2] || 'npm run build'; // Default to 'npm run build'
const LOG_FILE = path.join(__dirname, '../build.log');

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
  // Play bell sound - works on Unix systems (macOS, Linux)
  process.stdout.write('\x07'); // Bell character
  // Also try system bell
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

function runBuild() {
  try {
    log(`Starting build: ${BUILD_COMMAND}`, 'cyan');
    execSync(BUILD_COMMAND, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function continuousBuild() {
  log('='.repeat(60), 'bright');
  log('Continuous Build Script Started', 'bright');
  log(`Build Command: ${BUILD_COMMAND}`, 'blue');
  log(`Max Retries: ${MAX_RETRIES}`, 'blue');
  log(`Retry Delay: ${RETRY_DELAY}ms`, 'blue');
  log('='.repeat(60), 'bright');
  
  // Clear previous log file
  if (fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '');
  }
  
  let attempt = 0;
  let lastError = null;
  
  while (attempt < MAX_RETRIES) {
    attempt++;
    log(`\n--- Build Attempt ${attempt}/${MAX_RETRIES} ---`, 'yellow');
    
    const result = runBuild();
    
    if (result.success) {
      log('\n' + '='.repeat(60), 'green');
      log('BUILD SUCCESSFUL!', 'green');
      log(`Completed in ${attempt} attempt(s)`, 'green');
      log('='.repeat(60), 'green');
      process.exit(0);
    } else {
      lastError = result.error;
      log(`Build failed on attempt ${attempt}`, 'red');
      playBell(); // Ding on error!
      
      if (attempt < MAX_RETRIES) {
        log(`Waiting ${RETRY_DELAY / 1000} seconds before retry...`, 'yellow');
        await sleep(RETRY_DELAY);
      }
    }
  }
  
  // If we get here, all retries failed
  playBell(); // Ding on final failure!
  playBell(); // Double ding for emphasis
  await sleep(100); // Small delay for sound
  log('\n' + '='.repeat(60), 'red');
  log('BUILD FAILED AFTER ALL RETRIES', 'red');
  log(`Attempted ${MAX_RETRIES} times`, 'red');
  if (lastError) {
    log(`Last Error: ${lastError}`, 'red');
  }
  log('='.repeat(60), 'red');
  log(`Full log saved to: ${LOG_FILE}`, 'yellow');
  process.exit(1);
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n\nBuild interrupted by user', 'yellow');
  log(`Log file: ${LOG_FILE}`, 'yellow');
  process.exit(130);
});

process.on('SIGTERM', () => {
  log('\n\nBuild terminated', 'yellow');
  log(`Log file: ${LOG_FILE}`, 'yellow');
  process.exit(143);
});

// Start the continuous build
continuousBuild().catch(error => {
  playBell(); // Ding on fatal error!
  log(`Fatal error: ${error.message}`, 'red');
  log(error.stack, 'red');
  process.exit(1);
});

