/**
 * Test Delegate Tracking with Real Contract Data
 * 
 * This script tests the delegate event tracker with real contract data on Ethereum mainnet.
 * 
 * Usage:
 *   node scripts/test-delegate-tracking.js [contractAddress] [domainName]
 * 
 * Examples:
 *   node scripts/test-delegate-tracking.js 0x1234...abcd ens.eth
 *   node scripts/test-delegate-tracking.js ens.eth  (uses default contract)
 * 
 * Environment Variables:
 *   GRANULAR_DELEGATE_ADDRESS - Default contract address
 *   INFURA_URL - Infura RPC endpoint
 *   ALCHEMY_URL - Alchemy RPC endpoint
 *   RPC_URL - Generic RPC endpoint
 */

// Note: This is a simplified version that can be run with Node.js
// For full TypeScript support, use: npx tsx scripts/test-delegate-tracking.ts

const { createPublicClient, http } = require('viem');
const { mainnet } = require('viem/chains');

// Import the namehash function (we'll need to implement it here or import from built files)
function namehash(name) {
  // Simple implementation - for production use the actual namehash from src/lib/ens/ens-helpers.ts
  const { keccak256, toBytes, toHex } = require('viem');
  
  if (!name) {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }
  
  // Normalize ENS name (lowercase, remove spaces)
  const normalized = name.toLowerCase().trim();
  const parts = normalized.split('.').filter(p => p);
  
  let hash = '0x0000000000000000000000000000000000000000000000000000000000000000';
  
  for (let i = parts.length - 1; i >= 0; i--) {
    const label = parts[i];
    const labelHash = keccak256(toBytes(label));
    hash = keccak256(toBytes(hash + labelHash.slice(2)));
  }
  
  return hash;
}

// Default contract address (update with your deployed contract)
const DEFAULT_CONTRACT_ADDRESS = process.env.GRANULAR_DELEGATE_ADDRESS;

// Default RPC endpoint
function getRpcUrl() {
  if (process.env.INFURA_URL) return process.env.INFURA_URL;
  if (process.env.ALCHEMY_URL) return process.env.ALCHEMY_URL;
  if (process.env.RPC_URL) return process.env.RPC_URL;
  // Default to public RPC (may be rate-limited)
  return 'https://eth.llamarpc.com';
}

async function testDelegateTracking(contractAddress, domainName) {
  const result = {
    success: false,
    contractAddress,
    domainName,
    node: null,
    deploymentBlock: null,
    currentBlock: null,
    delegateCount: 0,
    delegates: [],
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
      result.errors.push(`Contract does not exist at address ${contractAddress}`);
      console.error(`ERROR: Contract does not exist at ${contractAddress}`);
      return result;
    }
    console.log('Contract exists (code length:', code.length, 'bytes)');

    // Test deployment block detection
    console.log('\nTesting deployment block detection...');
    const deploymentStartTime = Date.now();
    
    // Binary search for deployment block
    let deploymentBlock = null;
    try {
      const currentCode = await publicClient.getCode({ address: contractAddress });
      if (!currentCode || currentCode === '0x') {
        deploymentBlock = 0n;
      } else {
        const currentBlockNum = await publicClient.getBlockNumber();
        if (currentBlockNum < 1000n) {
          deploymentBlock = 0n;
        } else {
          // Check midpoint
          const midPoint = currentBlockNum / 2n;
          const midCode = await publicClient.getCode({
            address: contractAddress,
            blockNumber: midPoint,
          });

          let low, high;
          if (midCode && midCode !== '0x') {
            low = 0n;
            high = midPoint;
          } else {
            low = midPoint;
            high = currentBlockNum;
          }

          // Binary search
          deploymentBlock = high;
          while (low <= high) {
            const mid = (low + high) / 2n;
            const code = await publicClient.getCode({
              address: contractAddress,
              blockNumber: mid,
            });

            if (code && code !== '0x') {
              deploymentBlock = mid;
              high = mid - 1n;
            } else {
              low = mid + 1n;
            }
          }
        }
      }
      
      result.deploymentBlock = deploymentBlock;
      result.timing.deploymentBlockDetection = Date.now() - deploymentStartTime;
      console.log(`Deployment block: ${deploymentBlock}`);
      console.log(`Detection time: ${result.timing.deploymentBlockDetection}ms`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`Deployment block detection failed: ${errorMsg}`);
      console.error('ERROR:', errorMsg);
    }

    // Query delegate events
    console.log('\nQuerying delegate events...');
    const queryStartTime = Date.now();
    
    try {
      const delegateAddedAbi = [
        {
          type: 'event',
          name: 'DelegateAdded',
          inputs: [
            { name: 'node', type: 'bytes32', indexed: true },
            { name: 'delegate', type: 'address', indexed: true },
            { name: 'operations', type: 'uint256', indexed: false },
            { name: 'expiresAt', type: 'uint256', indexed: false },
          ],
        },
      ];

      const delegateRemovedAbi = [
        {
          type: 'event',
          name: 'DelegateRemoved',
          inputs: [
            { name: 'node', type: 'bytes32', indexed: true },
            { name: 'delegate', type: 'address', indexed: true },
          ],
        },
      ];

      const startBlock = result.deploymentBlock || (currentBlock > 10000n ? currentBlock - 10000n : 0n);
      
      console.log(`Querying from block ${startBlock} to latest...`);
      
      const [addedEvents, removedEvents] = await Promise.all([
        publicClient.getLogs({
          address: contractAddress,
          event: delegateAddedAbi[0],
          args: { node },
          fromBlock: startBlock,
          toBlock: 'latest',
        }).catch((err) => {
          console.warn('Error querying DelegateAdded events:', err.message);
          return [];
        }),
        publicClient.getLogs({
          address: contractAddress,
          event: delegateRemovedAbi[0],
          args: { node },
          fromBlock: startBlock,
          toBlock: 'latest',
        }).catch((err) => {
          console.warn('Error querying DelegateRemoved events:', err.message);
          return [];
        }),
      ]);

      console.log(`Found ${addedEvents.length} DelegateAdded events`);
      console.log(`Found ${removedEvents.length} DelegateRemoved events`);

      // Build delegate state map
      const delegateMap = new Map();
      
      // Process DelegateAdded events
      for (const event of addedEvents) {
        if (event.args && 'delegate' in event.args) {
          const delegate = event.args.delegate;
          const existing = delegateMap.get(delegate);
          if (!existing || event.blockNumber > existing.blockNumber) {
            delegateMap.set(delegate, { added: true, blockNumber: event.blockNumber });
          }
        }
      }

      // Process DelegateRemoved events
      for (const event of removedEvents) {
        if (event.args && 'delegate' in event.args) {
          const delegate = event.args.delegate;
          const existing = delegateMap.get(delegate);
          if (!existing || event.blockNumber > existing.blockNumber) {
            delegateMap.set(delegate, { added: false, blockNumber: event.blockNumber });
          }
        }
      }

      // Get active delegates
      const activeDelegates = Array.from(delegateMap.entries())
        .filter(([_, state]) => state.added)
        .map(([delegate]) => delegate);

      result.delegateCount = activeDelegates.length;
      result.delegates = activeDelegates;
      result.timing.eventQuery = Date.now() - queryStartTime;
      
      console.log(`Found ${activeDelegates.length} active delegates`);
      console.log(`Query time: ${result.timing.eventQuery}ms`);
      
      if (activeDelegates.length > 0) {
        console.log('\nActive Delegates:');
        activeDelegates.forEach((delegate, index) => {
          console.log(`  ${index + 1}. ${delegate}`);
        });
      } else {
        console.log('No active delegates found for this domain.');
        result.warnings.push('No delegates found. This may be normal if no delegates have been added.');
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`Event query failed: ${errorMsg}`);
      console.error('ERROR:', errorMsg);
    }

    result.timing.total = Date.now() - startTime;
    result.success = result.errors.length === 0;

    console.log('\n' + '='.repeat(80));
    console.log('Test Summary');
    console.log('='.repeat(80));
    console.log(`Success: ${result.success ? 'YES' : 'NO'}`);
    console.log(`Total time: ${result.timing.total}ms`);
    console.log(`Deployment block detection: ${result.timing.deploymentBlockDetection}ms`);
    console.log(`Event query: ${result.timing.eventQuery}ms`);
    console.log(`Active delegates: ${result.delegateCount}`);
    
    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
    }

    console.log('='.repeat(80) + '\n');

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.errors.push(`Test failed: ${errorMsg}`);
    console.error('FATAL ERROR:', errorMsg);
    console.error(error);
  }

  return result;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  let contractAddress = DEFAULT_CONTRACT_ADDRESS;
  let domainName = 'ens.eth'; // Default domain

  // Parse arguments
  if (args.length >= 2) {
    contractAddress = args[0];
    domainName = args[1];
  } else if (args.length === 1) {
    // If only one arg, check if it's an address or domain name
    if (args[0].startsWith('0x') && args[0].length === 42) {
      contractAddress = args[0];
    } else {
      domainName = args[0];
    }
  }

  // Validate inputs
  if (!contractAddress) {
    console.error('ERROR: Contract address is required.');
    console.error('\nUsage:');
    console.error('  node scripts/test-delegate-tracking.js [contractAddress] [domainName]');
    console.error('\nOr set GRANULAR_DELEGATE_ADDRESS environment variable.');
    console.error('\nExamples:');
    console.error('  node scripts/test-delegate-tracking.js 0x1234...abcd ens.eth');
    console.error('  node scripts/test-delegate-tracking.js ens.eth  (uses default contract)');
    console.error('  GRANULAR_DELEGATE_ADDRESS=0x1234... node scripts/test-delegate-tracking.js test.eth');
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

module.exports = { testDelegateTracking };
