/**
 * Granular Permission Contract ABIs
 * Exports ABIs for ENSNamingDelegateGranular and GranularResolver contracts
 */

import { Abi } from 'viem';

// ENSNamingDelegateGranular ABI
export const ENS_NAMING_DELEGATE_GRANULAR_ABI = [
  {
    name: 'addDelegate',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'delegate', type: 'address' },
      { name: 'operations', type: 'uint256' },
      { name: 'expiresAt', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'removeDelegate',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'delegate', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'updateDelegate',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'delegate', type: 'address' },
      { name: 'operations', type: 'uint256' },
      { name: 'expiresAt', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'isAuthorizedDelegate',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'parentNode', type: 'bytes32' },
      { name: 'delegate', type: 'address' },
      { name: 'requiredOperation', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getDelegateInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'delegate', type: 'address' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'allowedOperations', type: 'uint256' },
          { name: 'expiresAt', type: 'uint256' },
          { name: 'enabled', type: 'bool' },
          { name: 'locked', type: 'bool' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'createdBy', type: 'address' },
        ],
      },
    ],
  },
  {
    name: 'getPermissions',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'delegate', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const satisfies Abi;

// GranularResolver ABI (subset for permission checking)
export const GRANULAR_RESOLVER_ABI = [
  {
    name: 'isAuthorized',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'caller', type: 'address' },
      { name: 'requiredPermission', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const satisfies Abi;


