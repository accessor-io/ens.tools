/**
 * Register ENS Name
 * Implements ENS name registration with fee collection
 */

import { WalletClient, PublicClient, Address, Hex, parseEther } from 'viem';
import { simulateContract, writeContract } from 'viem/actions';
import { normalize } from 'viem/ens';
import { ETH_REGISTRAR_CONTROLLER_ABI } from './ens-contracts';
import { getEnsAddresses } from './ens-addresses';
import { feeCollectionService } from '../services/fee-collection-service';
import { toast } from 'sonner';

export interface RegisterNameParams {
  name: string;
  owner: Address;
  duration: bigint; // Duration in seconds (typically 1 year = 31536000)
  secret: `0x${string}`; // Secret from commit transaction
  resolver?: Address;
  data?: `0x${string}`[];
  reverseRecord?: boolean;
  ownerControlledFuses?: number;
}

/**
 * Register an ENS name via ETH Registrar Controller
 * This implements the commit-reveal registration process
 */
export async function registerENSName(
  walletClient: WalletClient,
  publicClient: PublicClient,
  params: RegisterNameParams
): Promise<Hex> {
  if (!walletClient.account) {
    throw new Error('Wallet not connected');
  }

  const normalizedName = normalize(params.name);
  
  const chainId = await publicClient.getChainId();
  const addresses = getEnsAddresses(chainId as any);
  if (!addresses || !addresses.ethRegistrarController) {
    throw new Error('Unsupported chain or registrar not available');
  }

  // Pay name registration fee if configured
  try {
    feeCollectionService.setClients(publicClient, walletClient);
    const nameRegistrationFee = await feeCollectionService.getNameRegistrationFee();
    if (nameRegistrationFee > 0n && walletClient.account) {
      toast.info('Paying name registration fee...');
      await feeCollectionService.payNameRegistrationFee(
        walletClient.account.address,
        params.name
      );
      toast.success('Name registration fee paid');
    }
  } catch (error) {
    console.error('Error paying name registration fee:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    toast.error('Failed to pay registration fee', {
      description: errorMessage,
    });
    // Continue with registration even if fee payment fails
    // User can manually pay the fee later if needed
  }

  // Get registration price
  const [basePrice, premium] = await publicClient.readContract({
    address: addresses.ethRegistrarController,
    abi: ETH_REGISTRAR_CONTROLLER_ABI,
    functionName: 'rentPrice',
    args: [normalizedName, params.duration],
  });

  const totalPrice = basePrice + premium;

  // Check if name is available
  const available = await publicClient.readContract({
    address: addresses.ethRegistrarController,
    abi: ETH_REGISTRAR_CONTROLLER_ABI,
    functionName: 'available',
    args: [normalizedName],
  });

  if (!available) {
    throw new Error(`Name ${params.name} is not available`);
  }

  // Register the name
  await simulateContract(publicClient, {
    address: addresses.ethRegistrarController,
    abi: ETH_REGISTRAR_CONTROLLER_ABI,
    functionName: 'register',
    args: [
      normalizedName,
      params.owner,
      params.duration,
      params.secret,
      params.resolver || addresses.publicResolver || '0x0000000000000000000000000000000000000000',
      params.data || [],
      params.reverseRecord || false,
      params.ownerControlledFuses || 0,
    ],
    account: walletClient.account,
    value: totalPrice,
  });

  const hash = await writeContract(walletClient, {
    address: addresses.ethRegistrarController,
    abi: ETH_REGISTRAR_CONTROLLER_ABI,
    functionName: 'register',
    args: [
      normalizedName,
      params.owner,
      params.duration,
      params.secret,
      params.resolver || addresses.publicResolver || '0x0000000000000000000000000000000000000000',
      params.data || [],
      params.reverseRecord || false,
      params.ownerControlledFuses || 0,
    ],
    account: walletClient.account,
    chain: walletClient.chain || null,
    value: totalPrice,
  });

  return hash;
}

