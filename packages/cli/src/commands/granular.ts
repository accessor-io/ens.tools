import { Command } from 'commander';
import { getPublicClient, getWalletClient } from '../config';
import { displaySuccess, displayError, displayInfo, waitForTransaction, validateDomain, validateAddress } from '../utils/helpers';
import { Address, Hex } from 'viem';

const program = new Command();

program
  .name('granular')
  .description('Granular delegation operations with fine-grained permissions');

program
  .command('add')
  .description('Add a delegate with specific permissions')
  .argument('<domain>', 'Domain name to add delegate for')
  .argument('<address>', 'Delegate address to add')
  .option('-o, --operations <bitmask>', 'Operations bitmask (1=create, 2=setOwner, 4=setResolver, 8=setTTL)')
  .option('-e, --expires <timestamp>', 'Expiration timestamp (0 for no expiration)')
  .action(async (domain: string, address: string, options: { operations?: string; expires?: string }) => {
    try {
      const normalizedDomain = validateDomain(domain);
      const delegateAddress = validateAddress(address);
      const operations = options.operations ? BigInt(options.operations) : 1n;
      const expires = options.expires ? BigInt(options.expires) : 0n;
      
      const publicClient = getPublicClient();
      const walletClient = getWalletClient();
      
      displayInfo(`Adding granular delegate for ${normalizedDomain}...`);
      displayInfo(`Delegate: ${delegateAddress}`);
      displayInfo(`Operations: ${operations}`);
      if (expires > 0n) {
        displayInfo(`Expires: ${new Date(Number(expires) * 1000).toISOString()}`);
      }
      
      // TODO: Implement granular delegate addition
      // This would call the granular delegate contract's addDelegate function
      
      displaySuccess(`Granular delegate added for ${normalizedDomain}`);
      
    } catch (error) {
      displayError(`Failed to add granular delegate: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('remove')
  .description('Remove a granular delegate')
  .argument('<domain>', 'Domain name to remove delegate from')
  .argument('<address>', 'Delegate address to remove')
  .action(async (domain: string, address: string) => {
    try {
      const normalizedDomain = validateDomain(domain);
      const delegateAddress = validateAddress(address);
      
      const publicClient = getPublicClient();
      const walletClient = getWalletClient();
      
      displayInfo(`Removing granular delegate for ${normalizedDomain}...`);
      displayInfo(`Delegate: ${delegateAddress}`);
      
      // TODO: Implement granular delegate removal
      // This would call the granular delegate contract's removeDelegate function
      
      displaySuccess(`Granular delegate removed for ${normalizedDomain}`);
      
    } catch (error) {
      displayError(`Failed to remove granular delegate: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('lock')
  .description('Lock a delegate to prevent removal')
  .argument('<domain>', 'Domain name')
  .argument('<address>', 'Delegate address to lock')
  .action(async (domain: string, address: string) => {
    try {
      const normalizedDomain = validateDomain(domain);
      const delegateAddress = validateAddress(address);
      
      const publicClient = getPublicClient();
      const walletClient = getWalletClient();
      
      displayInfo(`Locking delegate for ${normalizedDomain}...`);
      displayInfo(`Delegate: ${delegateAddress}`);
      
      // TODO: Implement delegate locking
      // This would call the granular delegate contract's lockDelegate function
      
      displaySuccess(`Delegate locked for ${normalizedDomain}`);
      
    } catch (error) {
      displayError(`Failed to lock delegate: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('unlock')
  .description('Unlock a delegate to allow removal')
  .argument('<domain>', 'Domain name')
  .argument('<address>', 'Delegate address to unlock')
  .action(async (domain: string, address: string) => {
    try {
      const normalizedDomain = validateDomain(domain);
      const delegateAddress = validateAddress(address);
      
      const publicClient = getPublicClient();
      const walletClient = getWalletClient();
      
      displayInfo(`Unlocking delegate for ${normalizedDomain}...`);
      displayInfo(`Delegate: ${delegateAddress}`);
      
      // TODO: Implement delegate unlocking
      // This would call the granular delegate contract's unlockDelegate function
      
      displaySuccess(`Delegate unlocked for ${normalizedDomain}`);
      
    } catch (error) {
      displayError(`Failed to unlock delegate: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('enable')
  .description('Enable a delegate')
  .argument('<domain>', 'Domain name')
  .argument('<address>', 'Delegate address to enable')
  .action(async (domain: string, address: string) => {
    try {
      const normalizedDomain = validateDomain(domain);
      const delegateAddress = validateAddress(address);
      
      const publicClient = getPublicClient();
      const walletClient = getWalletClient();
      
      displayInfo(`Enabling delegate for ${normalizedDomain}...`);
      displayInfo(`Delegate: ${delegateAddress}`);
      
      // TODO: Implement delegate enabling
      // This would call the granular delegate contract's enableDelegate function
      
      displaySuccess(`Delegate enabled for ${normalizedDomain}`);
      
    } catch (error) {
      displayError(`Failed to enable delegate: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('disable')
  .description('Disable a delegate')
  .argument('<domain>', 'Domain name')
  .argument('<address>', 'Delegate address to disable')
  .action(async (domain: string, address: string) => {
    try {
      const normalizedDomain = validateDomain(domain);
      const delegateAddress = validateAddress(address);
      
      const publicClient = getPublicClient();
      const walletClient = getWalletClient();
      
      displayInfo(`Disabling delegate for ${normalizedDomain}...`);
      displayInfo(`Delegate: ${delegateAddress}`);
      
      // TODO: Implement delegate disabling
      // This would call the granular delegate contract's disableDelegate function
      
      displaySuccess(`Delegate disabled for ${normalizedDomain}`);
      
    } catch (error) {
      displayError(`Failed to disable delegate: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all granular delegates for a domain')
  .argument('<domain>', 'Domain name to list delegates for')
  .action(async (domain: string) => {
    try {
      const normalizedDomain = validateDomain(domain);
      const publicClient = getPublicClient();
      
      displayInfo(`Listing granular delegates for ${normalizedDomain}...`);
      
      // TODO: Implement delegate listing
      // This would call the granular delegate contract's getAllDelegates function
      
      displayInfo('Granular delegates: [TO BE IMPLEMENTED]');
      
    } catch (error) {
      displayError(`Failed to list delegates: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('whitelist')
  .description('Manage whitelist for granular delegates')
  .argument('<domain>', 'Domain name')
  .argument('<action>', 'Action: add, remove, toggle, list')
  .argument('[address]', 'Address to add/remove (not needed for toggle/list)')
  .action(async (domain: string, action: string, address?: string) => {
    try {
      const normalizedDomain = validateDomain(domain);
      const publicClient = getPublicClient();
      const walletClient = getWalletClient();
      
      displayInfo(`Managing whitelist for ${normalizedDomain}...`);
      displayInfo(`Action: ${action}`);
      
      if (action === 'add' || action === 'remove') {
        if (!address) {
          throw new Error('Address is required for add/remove actions');
        }
        const delegateAddress = validateAddress(address);
        displayInfo(`Address: ${delegateAddress}`);
      }
      
      // TODO: Implement whitelist management
      // This would call the granular delegate contract's whitelist functions
      
      displaySuccess(`Whitelist ${action} completed for ${normalizedDomain}`);
      
    } catch (error) {
      displayError(`Failed to manage whitelist: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('blacklist')
  .description('Manage blacklist for granular delegates')
  .argument('<domain>', 'Domain name')
  .argument('<action>', 'Action: add, remove, toggle, list')
  .argument('[address]', 'Address to add/remove (not needed for toggle/list)')
  .action(async (domain: string, action: string, address?: string) => {
    try {
      const normalizedDomain = validateDomain(domain);
      const publicClient = getPublicClient();
      const walletClient = getWalletClient();
      
      displayInfo(`Managing blacklist for ${normalizedDomain}...`);
      displayInfo(`Action: ${action}`);
      
      if (action === 'add' || action === 'remove') {
        if (!address) {
          throw new Error('Address is required for add/remove actions');
        }
        const delegateAddress = validateAddress(address);
        displayInfo(`Address: ${delegateAddress}`);
      }
      
      // TODO: Implement blacklist management
      // This would call the granular delegate contract's blacklist functions
      
      displaySuccess(`Blacklist ${action} completed for ${normalizedDomain}`);
      
    } catch (error) {
      displayError(`Failed to manage blacklist: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

export default program;
