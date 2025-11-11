/**
 * ENS Contract Addresses by Chain
 * Mainnet addresses are authoritative; L2s use resolvers where deployed
 */

// ENS DAO Treasury address (mainnet)
// This is where premium name sale proceeds go (minus marketplace fees)
export const ENS_DAO_TREASURY = '0xFe89cc7aBB2C4183683ab71653C4cdc9B02D44b7' as const;

export const ENS_ADDRESSES = {
  // Ethereum Mainnet (Authoritative)
  1: {
    registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    publicResolver: '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63',
    nameWrapper: '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401',
    ethRegistrarController: '0x253553366Da8546fC250F225fe3d25d0C782303b',
    reverseRegistrar: '0xa58E81fe9b61B5c3fE2AFD33CF304c454AbFc7Cb',
    multicall3: '0xcA11bde05977b3631167028862bE2a173976CA11',
    daoTreasury: ENS_DAO_TREASURY,
  },
  // Optimism
  10: {
    registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    publicResolver: '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63',
    nameWrapper: '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401',
    ethRegistrarController: '0x253553366Da8546fC250F225fe3d25d0C782303b',
    reverseRegistrar: '0xa58E81fe9b61B5c3fE2AFD33CF304c454AbFc7Cb',
    multicall3: '0xcA11bde05977b3631167028862bE2a173976CA11',
    daoTreasury: ENS_DAO_TREASURY,
  },
  // Base
  8453: {
    registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    publicResolver: '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63',
    nameWrapper: '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401',
    ethRegistrarController: '0x253553366Da8546fC250F225fe3d25d0C782303b',
    reverseRegistrar: '0xa58E81fe9b61B5c3fE2AFD33CF304c454AbFc7Cb',
    multicall3: '0xcA11bde05977b3631167028862bE2a173976CA11',
    daoTreasury: ENS_DAO_TREASURY,
  },
  // Arbitrum
  42161: {
    registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    publicResolver: '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63',
    nameWrapper: '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401',
    ethRegistrarController: '0x253553366Da8546fC250F225fe3d25d0C782303b',
    reverseRegistrar: '0xa58E81fe9b61B5c3fE2AFD33CF304c454AbFc7Cb',
    multicall3: '0xcA11bde05977b3631167028862bE2a173976CA11',
    daoTreasury: ENS_DAO_TREASURY,
  },
  // Sepolia (Testnet)
  11155111: {
    registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    publicResolver: '0x19c2d5D0f035563344dBB7bE5fD2cD33F3668B52e',
    nameWrapper: '0x0635513f179D50A207757E05759CbD106d7dFcE8',
    ethRegistrarController: '0xFED6a969AaA60E4961FCD3EBF1A2e8913ac65B72',
    reverseRegistrar: '0xA0a1AbcDAe2794bC68b6f8e0bEf06d312206EE9A',
    multicall3: '0xcA11bde05977b3631167028862bE2a173976CA11',
  },
} as const;

export type SupportedChainId = keyof typeof ENS_ADDRESSES;

export function getEnsAddresses(chainId: number) {
  return ENS_ADDRESSES[chainId as SupportedChainId];
}

export function isSupportedChain(chainId: number): chainId is SupportedChainId {
  return chainId in ENS_ADDRESSES;
}

export function getChainName(chainId: number): string {
  const names: Record<number, string> = {
    1: 'Ethereum Mainnet',
    10: 'Optimism',
    8453: 'Base',
    42161: 'Arbitrum',
    11155111: 'Sepolia',
  };
  return names[chainId] || `Chain ${chainId}`;
}

export function isMainnetOnlyOperation(operation: string): boolean {
  const mainnetOnlyOps = [
    'register',
    'renew',
    'setResolver',
    'transfer',
    'setSubnodeRecord',
    'wrap',
    'unwrap',
    'setFuses',
  ];
  return mainnetOnlyOps.includes(operation);
}

