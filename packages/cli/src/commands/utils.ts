import { Command } from 'commander';
import { displayInfo, displayError, validateDomain } from '../utils/helpers';
import { namehash, normalize } from 'viem/ens';

const program = new Command();

program
  .name('utils')
  .description('Utility functions for ENS operations');

program
  .command('namehash')
  .description('Calculate namehash for a domain name')
  .argument('<domain>', 'Domain name to calculate namehash for')
  .action(async (domain: string) => {
    try {
      const normalizedDomain = validateDomain(domain);
      const hash = namehash(normalizedDomain);
      
      displayInfo(`Domain: ${normalizedDomain}`);
      displayInfo(`Namehash: ${hash}`);
      
    } catch (error) {
      displayError(`Failed to calculate namehash: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('normalize')
  .description('Normalize a domain name according to ENS standards')
  .argument('<domain>', 'Domain name to normalize')
  .action(async (domain: string) => {
    try {
      const normalizedDomain = normalize(domain);
      
      displayInfo(`Original: ${domain}`);
      displayInfo(`Normalized: ${normalizedDomain}`);
      
    } catch (error) {
      displayError(`Failed to normalize domain: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('operations')
  .description('Show available operation bitmasks and their meanings')
  .action(async () => {
    try {
      displayInfo('Available Operations:');
      displayInfo('');
      displayInfo('OP_CREATE_SUBDOMAIN = 1 (0x1)');
      displayInfo('  - Create and manage subdomains');
      displayInfo('  - Set subdomain owner, resolver, TTL');
      displayInfo('  - Configure fuses for wrapped subdomains');
      displayInfo('');
      displayInfo('OP_SET_RECORDS = 2 (0x2)');
      displayInfo('  - Set resolver records (address, text, contenthash)');
      displayInfo('  - Update existing records');
      displayInfo('  - Cannot change parent domain resolver');
      displayInfo('');
      displayInfo('OP_TRANSFER = 4 (0x4)');
      displayInfo('  - Transfer subdomain ownership');
      displayInfo('  - Cannot transfer parent domain ownership');
      displayInfo('');
      displayInfo('OP_SET_FUSES = 8 (0x8)');
      displayInfo('  - Configure NameWrapper fuses');
      displayInfo('  - Set subdomain-specific fuses');
      displayInfo('  - Cannot modify parent domain fuses');
      displayInfo('');
      displayInfo('Combined Operations:');
      displayInfo('  - Use bitwise OR to combine operations');
      displayInfo('  - Example: 3 (0x3) = CREATE_SUBDOMAIN + SET_RECORDS');
      displayInfo('  - Example: 7 (0x7) = CREATE_SUBDOMAIN + SET_RECORDS + TRANSFER');
      displayInfo('  - Example: 15 (0xF) = All operations');
      
    } catch (error) {
      displayError(`Failed to show operations: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate a domain name format')
  .argument('<domain>', 'Domain name to validate')
  .action(async (domain: string) => {
    try {
      const normalizedDomain = validateDomain(domain);
      const hash = namehash(normalizedDomain);
      
      displayInfo('Domain validation successful:');
      displayInfo(`  Domain: ${normalizedDomain}`);
      displayInfo(`  Namehash: ${hash}`);
      displayInfo(`  Valid: Yes`);
      
    } catch (error) {
      displayInfo('Domain validation failed:');
      displayInfo(`  Domain: ${domain}`);
      displayInfo(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      displayInfo(`  Valid: No`);
      process.exit(1);
    }
  });

program
  .command('check-approval')
  .description('Check if a delegate contract is approved for a domain')
  .argument('<domain>', 'Domain name to check')
  .argument('<delegate>', 'Delegate contract address')
  .action(async (domain: string, delegate: string) => {
    try {
      const normalizedDomain = validateDomain(domain);
      
      displayInfo(`Checking approval for ${normalizedDomain}...`);
      displayInfo(`Delegate: ${delegate}`);
      
      // TODO: Implement approval checking
      // This would check if the delegate contract is approved via setApprovalForAll
      
      displayInfo('Approval status: [TO BE IMPLEMENTED]');
      
    } catch (error) {
      displayError(`Failed to check approval: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

export default program;
