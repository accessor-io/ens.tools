/**
 * Test Delegate Tracking with Real Contract Data
 * 
 * This script tests the delegate event tracker with real contract data on Ethereum mainnet.
 * 
 * Usage:
 *   npx tsx scripts/test-delegate-tracking.ts [contractAddress] [domainName]
 * 
 * Examples:
 *   npx tsx scripts/test-delegate-tracking.ts 0x1234...abcd ens.eth
 *   npx tsx scripts/test-delegate-tracking.ts ens.eth  (uses default contract)
 */

import { createPublicClient, http, Address, Hex } from 'viem';
import { mainnet } from 'viem/chains';
import { namehash } from '../src/lib/ens/ens-helpers';
import { DelegateEventTracker } from '../src/lib/services/delegate-event-tracker';

// Default contract address (update with your deployed contract)
const DEFAULT_CONTRACT_ADDRESS = process.env.GRANULAR_DELEGATE_ADDRESS as Address | undefined;

// Default RPC endpoint (can be overridden with INFURA_URL or ALCHEMY_URL env vars)
const getRpcUrl = (): string => {
  if (process.env.INFURA_URL) return process.env.INFURA_URL;
  if (process.env.ALCHEMY_URL) return process.env.ALCHEMY_URL;
  if (process.env.RPC_URL) return process.env.RPC_URL;
  // Default to public RPC (may be rate-limited)
  return 'https://eth.llamarpc.com';
};

interface TestResult {
  success: boolean;
  contractAddress: Address;
  domainName: string;
  node: Hex;
  deploymentBlock?: bigint;
  currentBlock?: bigint;
  delegateCount?: number;
  delegates?: Address[];
  events?: {
    added: number;
    removed: number;
    total: number;
  };
  errors?: string[];
  warnings?: string[];
  timing?: {
    deploymentBlockDetection: number;
    eventQuery: number;
    total: number;
  };
}

async function testDelegateTracking(
  contractAddress: Address,
  domainName: string
): Promise<TestResult> {
  const result: TestResult = {
    success: false,
    contractAddress,
    domainName,
    node: '0x' as Hex,
    errors: [],
    warnings: [],
    timing: {
      deploymentBlockDetection: 0,
      eventQuery: 0,
      total: 0,
    },
  };

  const startTime = Date.now();

  try {
    console.log('\n' + '='.repeat(80));
    console.log('Delegate Tracking Test');
    console.log('='.repeat(80));
    console.log(`Contract Address: ${contractAddress}`);
    console.log(`Domain Name: ${domainName}`);
    console.log(`RPC URL: ${getRpcUrl()}`);
    console.log('');

    // Create public client
    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http(getRpcUrl()),
    });

    // Get current block
    console.log('Fetching current block number...');
    const currentBlock = await publicClient.getBlockNumber();
    result.currentBlock = currentBlock;
    console.log(`Current block: ${currentBlock}`);

    // Calculate node hash
    console.log(`\nCalculating node hash for "${domainName}"...`);
    const node = namehash(domainName);
    result.node = node;
    console.log(`Node hash: ${node}`);

    // Check if contract exists
    console.log('\nChecking if contract exists...');
    const code = await publicClient.getCode({ address: contractAddress });
    if (!code || code === '0x') {
      result.errors?.push(`Contract does not exist at address ${contractAddress}`);
      console.error(`ERROR: Contract does not exist at ${contractAddress}`);
      return result;
    }
    console.log('Contract exists (code length:', code.length, 'bytes)');

    // Initialize event tracker
    console.log('\nInitializing delegate event tracker...');
    const eventTracker = new DelegateEventTracker(contractAddress);
    eventTracker.setClient(publicClient);

    // Test deployment block detection
    console.log('\nTesting deployment block detection...');
    const deploymentStartTime = Date.now();
    try {
      // Access private method via type assertion (for testing)
      const tracker = eventTracker as any;
      const deploymentBlock = await tracker.getContractDeploymentBlock();
      result.deploymentBlock = deploymentBlock;
      result.timing!.deploymentBlockDetection = Date.now() - deploymentStartTime;
      console.log(`Deployment block: ${deploymentBlock}`);
      console.log(`Detection time: ${result.timing.deploymentBlockDetection}ms`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors?.push(`Deployment block detection failed: ${errorMsg}`);
      console.error('ERROR:', errorMsg);
    }

    // Query delegate events
    console.log('\nQuerying delegate events...');
    const queryStartTime = Date.now();
    
    try {
      const delegates = await eventTracker.getAllDelegates(node);
      result.delegateCount = delegates.length;
      result.delegates = delegates;
      result.timing!.eventQuery = Date.now() - queryStartTime;
      
      console.log(`Found ${delegates.length} active delegates`);
      console.log(`Query time: ${result.timing.eventQuery}ms`);
      
      if (delegates.length > 0) {
        console.log('\nActive Delegates:');
        delegates.forEach((delegate, index) => {
          console.log(`  ${index + 1}. ${delegate}`);
        });
      } else {
        console.log('No active delegates found for this domain.');
        result.warnings?.push('No delegates found. This may be normal if no delegates have been added.');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors?.push(`Event query failed: ${errorMsg}`);
      console.error('ERROR:', errorMsg);
    }

    // Get detailed event information
    console.log('\nFetching detailed event information...');
    try {
      const events = await eventTracker.getDelegateEvents(node);
      console.log(`Found ${events.length} total DelegateAdded events`);
      
      // Count removed events (we'd need to query separately for full count)
      result.events = {
        added: events.length,
        removed: 0, // Would need separate query
        total: events.length,
      };

      if (events.length > 0) {
        console.log('\nRecent Events (last 5):');
        events.slice(0, 5).forEach((event, index) => {
          const date = new Date(Number(event.timestamp) * 1000);
          console.log(`  ${index + 1}. ${event.eventType.toUpperCase()} - Delegate: ${event.delegate}`);
          console.log(`     Operations: ${event.operations}, Expires: ${event.expiresAt}`);
          console.log(`     Timestamp: ${date.toISOString()}`);
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.warnings?.push(`Detailed event query failed: ${errorMsg}`);
      console.warn('WARNING:', errorMsg);
    }

    result.timing!.total = Date.now() - startTime;
    result.success = result.errors?.length === 0;

    console.log('\n' + '='.repeat(80));
    console.log('Test Summary');
    console.log('='.repeat(80));
    console.log(`Success: ${result.success ? 'YES' : 'NO'}`);
    console.log(`Total time: ${result.timing!.total}ms`);
    console.log(`Deployment block detection: ${result.timing!.deploymentBlockDetection}ms`);
    console.log(`Event query: ${result.timing!.eventQuery}ms`);
    console.log(`Active delegates: ${result.delegateCount || 0}`);
    
    if (result.errors && result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    if (result.warnings && result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
    }

    console.log('='.repeat(80) + '\n');

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.errors?.push(`Test failed: ${errorMsg}`);
    console.error('FATAL ERROR:', errorMsg);
    console.error(error);
  }

  return result;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  let contractAddress: Address | undefined;
  let domainName: string | undefined;

  // Parse arguments
  if (args.length >= 2) {
    contractAddress = args[0] as Address;
    domainName = args[1];
  } else if (args.length === 1) {
    // If only one arg, check if it's an address or domain name
    if (args[0].startsWith('0x') && args[0].length === 42) {
      contractAddress = args[0] as Address;
      domainName = 'ens.eth'; // Default domain
    } else {
      contractAddress = DEFAULT_CONTRACT_ADDRESS;
      domainName = args[0];
    }
  } else {
    // No arguments - use defaults or prompt
    contractAddress = DEFAULT_CONTRACT_ADDRESS;
    domainName = 'ens.eth'; // Default domain
  }

  // Validate inputs
  if (!contractAddress) {
    console.error('ERROR: Contract address is required.');
    console.error('\nUsage:');
    console.error('  npx tsx scripts/test-delegate-tracking.ts [contractAddress] [domainName]');
    console.error('\nOr set GRANULAR_DELEGATE_ADDRESS environment variable.');
    console.error('\nExamples:');
    console.error('  npx tsx scripts/test-delegate-tracking.ts 0x1234...abcd ens.eth');
    console.error('  npx tsx scripts/test-delegate-tracking.ts ens.eth  (uses default contract)');
    console.error('  GRANULAR_DELEGATE_ADDRESS=0x1234... npx tsx scripts/test-delegate-tracking.ts test.eth');
    process.exit(1);
  }

  if (!domainName) {
    console.error('ERROR: Domain name is required.');
    process.exit(1);
  }

  // Validate address format
  if (!/^0x[a-fA-F0-9]{40}$/i.test(contractAddress)) {
    console.error(`ERROR: Invalid contract address format: ${contractAddress}`);
    process.exit(1);
  }

  // Run test
  const result = await testDelegateTracking(contractAddress, domainName);
  
  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { testDelegateTracking };
