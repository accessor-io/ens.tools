import chalk from 'chalk';
import ora from 'ora';
import { Address, Hex } from 'viem';
import { getPublicClient, getWalletClient } from '../config';

export async function waitForTransaction(hash: Hex) {
  const spinner = ora('Waiting for transaction confirmation...').start();
  
  try {
    const publicClient = getPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    spinner.succeed('Transaction confirmed');
    return receipt;
  } catch (error) {
    spinner.fail(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

export function validateAddress(address: string): Address {
  if (!address.startsWith('0x') || address.length !== 42) {
    throw new Error('Invalid address format');
  }
  return address as Address;
}

export function validateDomain(domain: string): string {
  if (!domain.includes('.')) {
    throw new Error('Invalid domain format');
  }
  return domain;
}

export function displaySuccess(message: string) {
  console.log(chalk.green(`✅ ${message}`));
}

export function displayError(message: string) {
  console.log(chalk.red(`❌ ${message}`));
}

export function displayInfo(message: string) {
  console.log(chalk.cyan(`ℹ️  ${message}`));
}

export function displayWarning(message: string) {
  console.log(chalk.yellow(`⚠️  ${message}`));
}

export function formatAddress(address: Address): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatLongAddress(address: Address): string {
  return address;
}

export async function checkApproval(parentOwner: Address, delegateContract: Address): Promise<boolean> {
  const publicClient = getPublicClient();
  
  try {
    const isApproved = await publicClient.readContract({
      address: '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401' as Address, // NAME_WRAPPER
      abi: [
        {
          name: 'isApprovedForAll',
          type: 'function',
          stateMutability: 'view',
          inputs: [
            { name: 'owner', type: 'address' },
            { name: 'operator', type: 'address' },
          ],
          outputs: [{ name: '', type: 'bool' }],
        },
      ],
      functionName: 'isApprovedForAll',
      args: [parentOwner, delegateContract],
    });
    
    return isApproved as boolean;
  } catch {
    return false;
  }
}

export async function promptApproval(parentOwner: Address, delegateContract: Address): Promise<void> {
  const isApproved = await checkApproval(parentOwner, delegateContract);
  
  if (!isApproved) {
    displayWarning('Delegate contract not approved!');
    displayInfo('You need to call NameWrapper.setApprovalForAll() first');
    displayInfo(`Owner: ${formatAddress(parentOwner)}`);
    displayInfo(`Delegate: ${formatAddress(delegateContract)}`);
    displayInfo('\nRun: approve <delegate-address>');
    throw new Error('Delegate contract not approved');
  }
}


