import { Address, Hex, encodeFunctionData } from 'viem';
import { DelegationAction } from './delegation-planner';

export interface SafeTransaction {
  to: Address;
  value: bigint;
  data: Hex;
  operation: 0 | 1;
}

export interface SafeBundleParams {
  safeAddress: Address;
  transactions: SafeTransaction[];
  nonce: bigint;
}

export class SafeTransactionBundler {
  async createSafeBundle(actions: DelegationAction[]): Promise<SafeTransaction[]> {
    return actions.map(action => ({
      to: action.contract,
      value: 0n,
      data: encodeFunctionData({
        abi: this.getABIForAction(action.type),
        functionName: action.functionName as any,
        args: action.args,
      }),
      operation: 0 as const,
    }));
  }

  async encodeSafeMultiSend(transactions: SafeTransaction[]): Promise<Hex> {
    const MULTISEND_ABI = [
      {
        name: 'multiSend',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
          {
            name: 'transactions',
            type: 'bytes',
          },
        ],
        outputs: [],
      },
    ] as const;

    const encodedTransactions = transactions.map(tx => {
      const encoded = `${tx.operation.toString(16).padStart(2, '0')}${tx.to.slice(2)}${tx.value.toString(16).padStart(16, '0')}${tx.data.slice(2).length.toString(16).padStart(8, '0')}${tx.data.slice(2)}`;
      return encoded;
    }).join('');

    return encodeFunctionData({
      abi: MULTISEND_ABI,
      functionName: 'multiSend',
      args: [`0x${encodedTransactions}`],
    });
  }

  getTransactionDescription(action: DelegationAction): string {
    return action.description;
  }

  private getABIForAction(type: DelegationAction['type']) {
    switch (type) {
      case 'transfer':
        return [
          {
            name: 'safeTransferFrom',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'from', type: 'address' },
              { name: 'to', type: 'address' },
              { name: 'tokenId', type: 'uint256' },
              { name: 'amount', type: 'uint256' },
              { name: 'data', type: 'bytes' },
            ],
            outputs: [],
          },
        ] as const;
      case 'approval':
        return [
          {
            name: 'setApprovalForAll',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'operator', type: 'address' },
              { name: 'approved', type: 'bool' },
            ],
            outputs: [],
          },
        ] as const;
      case 'setResolver':
        return [
          {
            name: 'setResolver',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'node', type: 'bytes32' },
              { name: 'resolver', type: 'address' },
            ],
            outputs: [],
          },
        ] as const;
      case 'setText':
        return [
          {
            name: 'setText',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'node', type: 'bytes32' },
              { name: 'key', type: 'string' },
              { name: 'value', type: 'string' },
            ],
            outputs: [],
          },
        ] as const;
      case 'setAddr':
        return [
          {
            name: 'setAddr',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'node', type: 'bytes32' },
              { name: 'coinType', type: 'uint256' },
              { name: 'a', type: 'bytes' },
            ],
            outputs: [],
          },
        ] as const;
      default:
        return [] as const;
    }
  }
}

export const safeTransactionBundler = new SafeTransactionBundler();

