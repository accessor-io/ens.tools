/**
 * Transfer Domain Ownership
 * Implements domain transfer functionality
 */

import { WalletClient, PublicClient, Address, Hex } from 'viem';
import { simulateContract, writeContract } from 'viem/actions';
import { normalize } from 'viem/ens';
import { namehash } from './ens-helpers';
import { ENS_REGISTRY_ABI, NAME_WRAPPER_ABI } from './ens-contracts';
import { getEnsAddresses } from './ens-addresses';
import { feeCollectionService } from '../services/fee-collection-service';
import { toast } from 'sonner';

export interface TransferDomainParams {
  name: string;
  newOwner: Address;
}

/**
 * Transfer domain ownership via Registry
 */
export async function transferDomainViaRegistry(
  walletClient: WalletClient,
  publicClient: PublicClient,
  params: TransferDomainParams
): Promise<Hex> {
  if (!walletClient.account) {
    throw new Error('Wallet not connected');
  }

  const normalizedName = normalize(params.name);
  const node = namehash(normalizedName);
  
  const chainId = await publicClient.getChainId();
  const addresses = getEnsAddresses(chainId as any);
  if (!addresses) {
    throw new Error('Unsupported chain');
  }

  // Pay transfer fee if configured
  try {
    feeCollectionService.setClients(publicClient, walletClient);
    const transferFee = await feeCollectionService.getTransferFee();
    if (transferFee > 0n && walletClient.account) {
      toast.info('Paying transfer fee...');
      await feeCollectionService.payTransferFee(
        walletClient.account.address,
        params.newOwner,
        params.name
      );
      toast.success('Transfer fee paid');
    }
  } catch (error) {
    console.error('Error paying transfer fee:', error);
    // Continue with transfer even if fee payment fails
  }

  await simulateContract(publicClient, {
    address: addresses.registry,
    abi: ENS_REGISTRY_ABI,
    functionName: 'setOwner',
    args: [node, params.newOwner],
    account: walletClient.account,
  });

  const hash = await writeContract(walletClient, {
    address: addresses.registry,
    abi: ENS_REGISTRY_ABI,
    functionName: 'setOwner',
    args: [node, params.newOwner],
    account: walletClient.account,
    chain: walletClient.chain || null,
  });

  return hash;
}

/**
 * Transfer wrapped name via NameWrapper
 */
export async function transferWrappedName(
  walletClient: WalletClient,
  publicClient: PublicClient,
  params: TransferDomainParams
): Promise<Hex> {
  if (!walletClient.account) {
    throw new Error('Wallet not connected');
  }

  const normalizedName = normalize(params.name);
  const node = namehash(normalizedName);
  
  const chainId = await publicClient.getChainId();
  const addresses = getEnsAddresses(chainId as any);
  if (!addresses) {
    throw new Error('Unsupported chain');
  }

  // Pay transfer fee if configured
  try {
    feeCollectionService.setClients(publicClient, walletClient);
    const transferFee = await feeCollectionService.getTransferFee();
    if (transferFee > 0n && walletClient.account) {
      toast.info('Paying transfer fee...');
      await feeCollectionService.payTransferFee(
        walletClient.account.address,
        params.newOwner,
        params.name
      );
      toast.success('Transfer fee paid');
    }
  } catch (error) {
    console.error('Error paying transfer fee:', error);
    // Continue with transfer even if fee payment fails
  }

  await simulateContract(publicClient, {
    address: addresses.nameWrapper,
    abi: NAME_WRAPPER_ABI,
    functionName: 'safeTransferFrom',
    args: [
      walletClient.account.address,
      params.newOwner,
      BigInt(node.slice(2, 66), 16),
      BigInt(1),
      '0x',
    ],
    account: walletClient.account,
  });

  const hash = await writeContract(walletClient, {
    address: addresses.nameWrapper,
    abi: NAME_WRAPPER_ABI,
    functionName: 'safeTransferFrom',
    args: [
      walletClient.account.address,
      params.newOwner,
      BigInt(node.slice(2, 66), 16),
      BigInt(1),
      '0x',
    ],
    account: walletClient.account,
    chain: walletClient.chain || null,
  });

  return hash;
}

