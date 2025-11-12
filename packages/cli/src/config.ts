import { createPublicClient, createWalletClient, http, Address } from 'viem';
import { mainnet, goerli, sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { displayError } from './utils/helpers';

// Environment variables
const RPC_URL = process.env.RPC_URL || 'https://eth.llamarpc.com';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ENS_REGISTRY = process.env.ENS_REGISTRY || '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
const NAME_WRAPPER = process.env.NAME_WRAPPER || '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401';
const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS;
const DELEGATE_ADDRESS = process.env.DELEGATE_ADDRESS;
const GRANULAR_DELEGATE_ADDRESS = process.env.GRANULAR_DELEGATE_ADDRESS;

// Network configuration
const NETWORK = process.env.NETWORK || 'mainnet';
const CHAIN_ID = parseInt(process.env.CHAIN_ID || '1');

// Gas configuration
const GAS_LIMIT = parseInt(process.env.GAS_LIMIT || '500000');
const GAS_PRICE = BigInt(process.env.GAS_PRICE || '20000000000');

// IPFS configuration
const IPFS_GATEWAY = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
const IPFS_API_URL = process.env.IPFS_API_URL;

// Analytics
const GOOGLE_ANALYTICS_ID = process.env.GOOGLE_ANALYTICS_ID;

// Get chain configuration
function getChain() {
  switch (NETWORK.toLowerCase()) {
    case 'mainnet':
      return mainnet;
    case 'goerli':
      return goerli;
    case 'sepolia':
      return sepolia;
    default:
      return mainnet;
  }
}

// Create public client
export function getPublicClient() {
  const chain = getChain();
  
  return createPublicClient({
    chain,
    transport: http(RPC_URL),
  });
}

// Create wallet client
export function getWalletClient() {
  if (!PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY environment variable is required');
  }

  const chain = getChain();
  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);

  return createWalletClient({
    chain,
    transport: http(RPC_URL),
    account,
  });
}

// Configuration object
export const config = {
  // Network
  network: NETWORK,
  chainId: CHAIN_ID,
  rpcUrl: RPC_URL,
  
  // Contracts
  ensRegistry: ENS_REGISTRY as Address,
  nameWrapper: NAME_WRAPPER as Address,
  factoryAddress: FACTORY_ADDRESS as Address | undefined,
  delegateAddress: DELEGATE_ADDRESS as Address | undefined,
  granularDelegateAddress: GRANULAR_DELEGATE_ADDRESS as Address | undefined,
  
  // Gas
  gasLimit: GAS_LIMIT,
  gasPrice: GAS_PRICE,
  
  // IPFS
  ipfsGateway: IPFS_GATEWAY,
  ipfsApiUrl: IPFS_API_URL,
  
  // Analytics
  googleAnalyticsId: GOOGLE_ANALYTICS_ID,
  
  // Validation
  validate() {
    const errors: string[] = [];
    
    if (!PRIVATE_KEY) {
      errors.push('PRIVATE_KEY environment variable is required');
    }
    
    if (!RPC_URL) {
      errors.push('RPC_URL environment variable is required');
    }
    
    if (errors.length > 0) {
      displayError('Configuration validation failed:');
      errors.forEach(error => displayError(`  - ${error}`));
      throw new Error('Invalid configuration');
    }
  }
};

// Validate configuration on import
try {
  config.validate();
} catch (error) {
  // Configuration validation will be handled when commands are executed
}
