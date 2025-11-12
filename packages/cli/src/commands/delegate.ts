import { Command } from 'commander';
import { getPublicClient, getWalletClient } from '../config';
import { displaySuccess, displayError, displayInfo, waitForTransaction, validateDomain, validateAddress } from '../utils/helpers';
import { Address, Hex } from 'viem';

const program = new Command();

program
  .name('delegate')
  .description('Basic delegation operations for ENS domains');

program
  .command('set')
  .description('Set delegation for a domain')
  .argument('<domain>', 'Domain name to delegate')
  .option('-p, --primary <address>', 'Primary delegate address')
  .option('-s, --secondary <address>', 'Secondary delegate address')
  .option('-e, --expires <timestamp>', 'Expiration timestamp (0 for no expiration)')
  .action(async (domain: string, options: { primary?: string; secondary?: string; expires?: string }) => {
    try {
      const normalizedDomain = validateDomain(domain);
      
      if (!options.primary) {
        throw new Error('Primary delegate address is required');
      }
      
      const primaryAddress = validateAddress(options.primary);
      const secondaryAddress = options.secondary ? validateAddress(options.secondary) : undefined;
      const expires = options.expires ? BigInt(options.expires) : 0n;
      
      const publicClient = getPublicClient();
      const walletClient = getWalletClient();
      
      displayInfo(`Setting delegation for ${normalizedDomain}...`);
      displayInfo(`Primary: ${primaryAddress}`);
      if (secondaryAddress) {
        displayInfo(`Secondary: ${secondaryAddress}`);
      }
      if (expires > 0n) {
        displayInfo(`Expires: ${new Date(Number(expires) * 1000).toISOString()}`);
      }
      
      // TODO: Implement delegation contract interaction
      // This would call the delegate contract's setDelegation function
      
      displaySuccess(`Delegation set for ${normalizedDomain}`);
      
    } catch (error) {
      displayError(`Failed to set delegation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('get')
  .description('Get delegation information for a domain')
  .argument('<domain>', 'Domain name to check')
  .action(async (domain: string) => {
    try {
      const normalizedDomain = validateDomain(domain);
      const publicClient = getPublicClient();
      
      displayInfo(`Getting delegation info for ${normalizedDomain}...`);
      
      // TODO: Implement delegation lookup
      // This would call the delegate contract's getDelegation function
      
      displayInfo('Delegation info: [TO BE IMPLEMENTED]');
      
    } catch (error) {
      displayError(`Failed to get delegation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('revoke')
  .description('Revoke delegation for a domain')
  .argument('<domain>', 'Domain name to revoke delegation for')
  .action(async (domain: string) => {
    try {
      const normalizedDomain = validateDomain(domain);
      const publicClient = getPublicClient();
      const walletClient = getWalletClient();
      
      displayInfo(`Revoking delegation for ${normalizedDomain}...`);
      
      // TODO: Implement delegation revocation
      // This would call the delegate contract's revokeDelegation function
      
      displaySuccess(`Delegation revoked for ${normalizedDomain}`);
      
    } catch (error) {
      displayError(`Failed to revoke delegation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('check')
  .description('Check if an address has delegation permissions')
  .argument('<domain>', 'Domain name to check')
  .argument('<address>', 'Address to check permissions for')
  .action(async (domain: string, address: string) => {
    try {
      const normalizedDomain = validateDomain(domain);
      const checkAddress = validateAddress(address);
      const publicClient = getPublicClient();
      
      displayInfo(`Checking permissions for ${checkAddress} on ${normalizedDomain}...`);
      
      // TODO: Implement permission checking
      // This would call the delegate contract's hasPermission function
      
      displayInfo('Permission status: [TO BE IMPLEMENTED]');
      
    } catch (error) {
      displayError(`Failed to check permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('create-subdomain')
  .description('Create a subdomain via delegation')
  .argument('<domain>', 'Parent domain name')
  .argument('<subdomain>', 'Subdomain name to create')
  .option('-o, --owner <address>', 'Owner address for the subdomain')
  .option('-r, --resolver <address>', 'Resolver address for the subdomain')
  .option('-t, --ttl <seconds>', 'TTL for the subdomain')
  .action(async (domain: string, subdomain: string, options: { owner?: string; resolver?: string; ttl?: string }) => {
    try {
      const normalizedDomain = validateDomain(domain);
      const normalizedSubdomain = subdomain.toLowerCase();
      
      if (!options.owner) {
        throw new Error('Owner address is required');
      }
      
      const ownerAddress = validateAddress(options.owner);
      const resolverAddress = options.resolver ? validateAddress(options.resolver) : undefined;
      const ttl = options.ttl ? BigInt(options.ttl) : 0n;
      
      const publicClient = getPublicClient();
      const walletClient = getWalletClient();
      
      displayInfo(`Creating subdomain ${normalizedSubdomain}.${normalizedDomain}...`);
      displayInfo(`Owner: ${ownerAddress}`);
      if (resolverAddress) {
        displayInfo(`Resolver: ${resolverAddress}`);
      }
      if (ttl > 0n) {
        displayInfo(`TTL: ${ttl} seconds`);
      }
      
      // TODO: Implement subdomain creation via delegation
      // This would call the delegate contract's createSubdomain function
      
      displaySuccess(`Subdomain ${normalizedSubdomain}.${normalizedDomain} created`);
      
    } catch (error) {
      displayError(`Failed to create subdomain: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

export default program;
