#!/usr/bin/env node

import { Command } from 'commander';
import { displayError, displayInfo } from './utils/helpers';
import factoryCommand from './commands/factory';
import delegateCommand from './commands/delegate';
import granularCommand from './commands/granular';
import approveCommand from './commands/approve';
import utilsCommand from './commands/utils';

const program = new Command();

program
  .name('ens-delegate')
  .description('ENS Granular Delegation CLI Toolkit')
  .version('1.0.0');

// Add command groups
program.addCommand(factoryCommand);
program.addCommand(delegateCommand);
program.addCommand(granularCommand);
program.addCommand(approveCommand);
program.addCommand(utilsCommand);

// Global error handling
program.exitOverride();

try {
  program.parse();
} catch (error) {
  if (error instanceof Error) {
    displayError(`Command failed: ${error.message}`);
  } else {
    displayError('An unknown error occurred');
  }
  process.exit(1);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  displayError(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  displayError(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});
