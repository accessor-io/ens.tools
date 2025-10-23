import { PublicClient, Address, Hex } from 'viem';
import { normalize } from 'viem/ens';
import { namehash } from '../ens/ens-helpers';
import { ENS_REGISTRY_ABI, NAME_WRAPPER_ABI, PUBLIC_RESOLVER_ABI } from '../ens/ens-contracts';
import { ENS_REGISTRY_ADDRESS, NAME_WRAPPER_ADDRESS, ENS_PUBLIC_RESOLVER } from '../ens/ens-write-operations';

export interface VerificationResult {
  success: boolean;
  checks: VerificationCheck[];
  errors: string[];
}

export interface VerificationCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  expected?: string;
  actual?: string;
}

export class PostVerificationService {
  async verifyDelegation(
    publicClient: PublicClient,
    name: string,
    expectedManager: Address,
    expectedRecords: Record<string, string>
  ): Promise<VerificationResult> {
    const checks: VerificationCheck[] = [];
    const errors: string[] = [];

    try {
      const normalizedName = normalize(name);
      const node = namehash(normalizedName);

      const ownerCheck = await this.verifyOwner(publicClient, node, name, expectedManager);
      checks.push(ownerCheck);
      if (ownerCheck.status === 'fail') {
        errors.push(ownerCheck.message);
      }

      const resolverCheck = await this.verifyResolver(publicClient, node, name);
      checks.push(resolverCheck);
      if (resolverCheck.status === 'fail') {
        errors.push(resolverCheck.message);
      }

      const recordsCheck = await this.verifyRecords(publicClient, node, name, expectedRecords);
      checks.push(...recordsCheck);
      recordsCheck.forEach(check => {
        if (check.status === 'fail') {
          errors.push(check.message);
        }
      });

      const wrapperCheck = await this.verifyWrapper(publicClient, node, name);
      if (wrapperCheck) {
        checks.push(wrapperCheck);
        if (wrapperCheck.status === 'fail') {
          errors.push(wrapperCheck.message);
        }
      }

      return {
        success: errors.length === 0,
        checks,
        errors,
      };
    } catch (error) {
      return {
        success: false,
        checks,
        errors: [...errors, error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  private async verifyOwner(
    publicClient: PublicClient,
    node: Hex,
    name: string,
    expectedManager: Address
  ): Promise<VerificationCheck> {
    try {
      const owner = await publicClient.readContract({
        address: ENS_REGISTRY_ADDRESS,
        abi: ENS_REGISTRY_ABI,
        functionName: 'owner',
        args: [node],
      });

      const ownerAddress = owner as Address;
      const matches = ownerAddress.toLowerCase() === expectedManager.toLowerCase();

      return {
        name: 'Owner Verification',
        status: matches ? 'pass' : 'fail',
        message: matches 
          ? `Owner verified: ${ownerAddress}` 
          : `Owner mismatch. Expected: ${expectedManager}, Got: ${ownerAddress}`,
        expected: expectedManager,
        actual: ownerAddress,
      };
    } catch (error) {
      return {
        name: 'Owner Verification',
        status: 'fail',
        message: `Failed to verify owner: ${error instanceof Error ? error.message : 'Unknown error'}`,
        expected: expectedManager,
      };
    }
  }

  private async verifyResolver(
    publicClient: PublicClient,
    node: Hex,
    name: string
  ): Promise<VerificationCheck> {
    try {
      const resolver = await publicClient.readContract({
        address: ENS_REGISTRY_ADDRESS,
        abi: ENS_REGISTRY_ABI,
        functionName: 'resolver',
        args: [node],
      });

      const resolverAddress = resolver as Address;
      const hasResolver = resolverAddress !== '0x0000000000000000000000000000000000000000';

      return {
        name: 'Resolver Verification',
        status: hasResolver ? 'pass' : 'warning',
        message: hasResolver 
          ? `Resolver set: ${resolverAddress}` 
          : `No resolver set for ${name}`,
        actual: resolverAddress,
      };
    } catch (error) {
      return {
        name: 'Resolver Verification',
        status: 'fail',
        message: `Failed to verify resolver: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async verifyRecords(
    publicClient: PublicClient,
    node: Hex,
    name: string,
    expectedRecords: Record<string, string>
  ): Promise<VerificationCheck[]> {
    const checks: VerificationCheck[] = [];

    for (const [key, expectedValue] of Object.entries(expectedRecords)) {
      try {
        const resolver = await publicClient.readContract({
          address: ENS_REGISTRY_ADDRESS,
          abi: ENS_REGISTRY_ABI,
          functionName: 'resolver',
          args: [node],
        });

        if (resolver === '0x0000000000000000000000000000000000000000') {
          checks.push({
            name: `Record: ${key}`,
            status: 'warning',
            message: `Cannot verify record (no resolver set)`,
            expected: expectedValue,
          });
          continue;
        }

        try {
          const actualValue = await publicClient.readContract({
            address: resolver as Address,
            abi: PUBLIC_RESOLVER_ABI,
            functionName: 'text',
            args: [node, key],
          });

          const matches = (actualValue as string) === expectedValue;

          checks.push({
            name: `Record: ${key}`,
            status: matches ? 'pass' : 'fail',
            message: matches 
              ? `Record verified: ${key} = ${actualValue}` 
              : `Record mismatch. Expected: ${expectedValue}, Got: ${actualValue}`,
            expected: expectedValue,
            actual: actualValue as string,
          });
        } catch {
          checks.push({
            name: `Record: ${key}`,
            status: 'warning',
            message: `Record not set: ${key}`,
            expected: expectedValue,
          });
        }
      } catch (error) {
        checks.push({
          name: `Record: ${key}`,
          status: 'fail',
          message: `Failed to verify record: ${error instanceof Error ? error.message : 'Unknown error'}`,
          expected: expectedValue,
        });
      }
    }

    return checks;
  }

  private async verifyWrapper(
    publicClient: PublicClient,
    node: Hex,
    name: string
  ): Promise<VerificationCheck | null> {
    try {
      const owner = await publicClient.readContract({
        address: ENS_REGISTRY_ADDRESS,
        abi: ENS_REGISTRY_ABI,
        functionName: 'owner',
        args: [node],
      });

      const balance = await publicClient.readContract({
        address: NAME_WRAPPER_ADDRESS,
        abi: [
          {
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [
              { name: 'account', type: 'address' },
              { name: 'id', type: 'uint256' },
            ],
            outputs: [{ name: '', type: 'uint256' }],
          },
        ] as const,
        functionName: 'balanceOf',
        args: [owner as Address, BigInt(node)],
      });

      const isWrapped = balance > 0n;

      if (isWrapped) {
        try {
          const fuses = await publicClient.readContract({
            address: NAME_WRAPPER_ADDRESS,
            abi: NAME_WRAPPER_ABI,
            functionName: 'getFuses',
            args: [node],
          });

          return {
            name: 'Wrapper Verification',
            status: 'pass',
            message: `Name is wrapped with fuses: ${fuses}`,
            actual: fuses.toString(),
          };
        } catch {
          return {
            name: 'Wrapper Verification',
            status: 'warning',
            message: 'Name is wrapped but could not read fuses',
          };
        }
      }

      return null;
    } catch (error) {
      return {
        name: 'Wrapper Verification',
        status: 'warning',
        message: `Could not verify wrapper status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async verifyContractOwnership(
    publicClient: PublicClient,
    contractAddress: Address,
    expectedOwner: Address
  ): Promise<VerificationCheck> {
    try {
      const owner = await publicClient.readContract({
        address: contractAddress,
        abi: [
          {
            name: 'owner',
            type: 'function',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ name: '', type: 'address' }],
          },
        ] as const,
        functionName: 'owner',
      });

      const ownerAddress = owner as Address;
      const matches = ownerAddress.toLowerCase() === expectedOwner.toLowerCase();

      return {
        name: 'Contract Ownership',
        status: matches ? 'pass' : 'fail',
        message: matches 
          ? `Contract owner verified: ${ownerAddress}` 
          : `Contract owner mismatch. Expected: ${expectedOwner}, Got: ${ownerAddress}`,
        expected: expectedOwner,
        actual: ownerAddress,
      };
    } catch (error) {
      return {
        name: 'Contract Ownership',
        status: 'fail',
        message: `Failed to verify contract ownership: ${error instanceof Error ? error.message : 'Unknown error'}`,
        expected: expectedOwner,
      };
    }
  }
}

export const postVerificationService = new PostVerificationService();

