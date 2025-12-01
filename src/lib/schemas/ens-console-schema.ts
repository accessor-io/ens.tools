/**
 * ENS Console Schema Definition
 * Defines all possible actions and options for ENS protocol operations
 * Supports bracket notation: [value]@parameter with +/- operators
 */

export type ActionOperator = '+' | '-' | '=';

export interface SchemaField {
  key: string;
  label: string;
  description: string;
  type: 'string' | 'address' | 'number' | 'bigint' | 'boolean' | 'array' | 'object' | 'hex' | 'timestamp';
  required: boolean;
  defaultValue?: any;
  validation?: (value: any) => boolean;
  examples?: string[];
}

export interface ActionSchema {
  action: string;
  label: string;
  description: string;
  category: 'domain' | 'subdomain' | 'record' | 'delegation' | 'wrapper' | 'registration' | 'reverse';
  operator?: ActionOperator; // + for add/create, - for remove/delete, = for set/update
  parameters: SchemaField[];
  examples: string[];
  contract?: 'registry' | 'resolver' | 'nameWrapper' | 'registrar' | 'reverseRegistrar' | 'delegate';
}

/**
 * All ENS Protocol Actions Schema
 */
export const ENS_CONSOLE_SCHEMA: ActionSchema[] = [
  // ========== DOMAIN OPERATIONS ==========
  {
    action: 'transfer',
    label: 'Transfer Domain Ownership',
    description: 'Transfer ownership of a domain to another address',
    category: 'domain',
    operator: '=',
    parameters: [
      {
        key: 'domain',
        label: 'Domain Name',
        description: 'The ENS domain to transfer',
        type: 'string',
        required: true,
        examples: ['example.eth', 'subdomain.example.eth'],
      },
      {
        key: 'to',
        label: 'New Owner Address',
        description: 'Address to receive domain ownership',
        type: 'address',
        required: true,
        examples: ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'],
      },
    ],
    examples: [
      'transfer: [example.eth]@domain = [0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@to',
    ],
    contract: 'nameWrapper',
  },

  {
    action: 'wrap',
    label: 'Wrap Domain',
    description: 'Wrap an unwrapped domain in NameWrapper for advanced permissions',
    category: 'wrapper',
    operator: '+',
    parameters: [
      {
        key: 'domain',
        label: 'Domain Name',
        description: 'The ENS domain to wrap',
        type: 'string',
        required: true,
      },
      {
        key: 'owner',
        label: 'Wrapped Owner',
        description: 'Address that will own the wrapped domain',
        type: 'address',
        required: true,
      },
      {
        key: 'fuses',
        label: 'Fuses',
        description: 'Bitmask of fuses to set (see FUSES constants)',
        type: 'number',
        required: false,
        defaultValue: 0,
      },
      {
        key: 'expiry',
        label: 'Expiry Timestamp',
        description: 'Expiry timestamp for the wrapped domain (0 for no expiry)',
        type: 'bigint',
        required: false,
        defaultValue: 0n,
      },
    ],
    examples: [
      '+wrap: [example.eth]@domain = [0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@owner',
      '+wrap: [example.eth]@domain = [0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@owner + [7]@fuses',
    ],
    contract: 'nameWrapper',
  },

  {
    action: 'unwrap',
    label: 'Unwrap Domain',
    description: 'Unwrap a wrapped domain from NameWrapper',
    category: 'wrapper',
    operator: '-',
    parameters: [
      {
        key: 'domain',
        label: 'Domain Name',
        description: 'The wrapped ENS domain to unwrap',
        type: 'string',
        required: true,
      },
      {
        key: 'controller',
        label: 'New Controller',
        description: 'Address to receive control of the unwrapped domain',
        type: 'address',
        required: true,
      },
    ],
    examples: [
      '-unwrap: [example.eth]@domain = [0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@controller',
    ],
    contract: 'nameWrapper',
  },

  {
    action: 'renew',
    label: 'Renew Domain',
    description: 'Renew domain registration for additional time',
    category: 'registration',
    operator: '+',
    parameters: [
      {
        key: 'domain',
        label: 'Domain Name',
        description: 'The ENS domain to renew',
        type: 'string',
        required: true,
      },
      {
        key: 'duration',
        label: 'Duration (seconds)',
        description: 'Duration to extend registration (typically 31536000 for 1 year)',
        type: 'number',
        required: true,
        examples: ['31536000', '63072000'],
      },
    ],
    examples: [
      '+renew: [example.eth]@domain + [31536000]@duration',
    ],
    contract: 'registrar',
  },

  // ========== SUBDOMAIN OPERATIONS ==========
  {
    action: 'mintSubdomain',
    label: 'Create Subdomain',
    description: 'Create a new subdomain under a parent domain',
    category: 'subdomain',
    operator: '+',
    parameters: [
      {
        key: 'subname',
        label: 'Subdomain Label',
        description: 'The label for the subdomain (without parent)',
        type: 'string',
        required: true,
        examples: ['app', 'api', 'www'],
      },
      {
        key: 'parent',
        label: 'Parent Domain',
        description: 'The parent domain name',
        type: 'string',
        required: true,
        examples: ['example.eth'],
      },
      {
        key: 'owner',
        label: 'Subdomain Owner',
        description: 'Address to own the subdomain',
        type: 'address',
        required: false,
      },
      {
        key: 'resolver',
        label: 'Resolver Address',
        description: 'Resolver address for the subdomain (defaults to public resolver)',
        type: 'address',
        required: false,
      },
      {
        key: 'fuses',
        label: 'Fuses',
        description: 'Fuses to set on the subdomain',
        type: 'number',
        required: false,
        defaultValue: 0,
      },
      {
        key: 'expiry',
        label: 'Expiry Timestamp',
        description: 'Expiry timestamp for the subdomain',
        type: 'bigint',
        required: false,
        defaultValue: 0n,
      },
    ],
    examples: [
      '+mintSubdomain: [app]@subname@[example.eth]@parent',
      '+mintSubdomain: [api]@subname@[example.eth]@parent = [0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@owner',
    ],
    contract: 'nameWrapper',
  },

  {
    action: 'removeSubdomain',
    label: 'Remove Subdomain',
    description: 'Remove/delete a subdomain',
    category: 'subdomain',
    operator: '-',
    parameters: [
      {
        key: 'subname',
        label: 'Subdomain Label',
        description: 'The label of the subdomain to remove',
        type: 'string',
        required: true,
      },
      {
        key: 'parent',
        label: 'Parent Domain',
        description: 'The parent domain name',
        type: 'string',
        required: true,
      },
    ],
    examples: [
      '-removeSubdomain: [app]@subname@[example.eth]@parent',
    ],
    contract: 'registry',
  },

  {
    action: 'transferSubdomain',
    label: 'Transfer Subdomain Ownership',
    description: 'Transfer ownership of a subdomain to another address',
    category: 'subdomain',
    operator: '=',
    parameters: [
      {
        key: 'subname',
        label: 'Subdomain Label',
        description: 'The label of the subdomain',
        type: 'string',
        required: true,
      },
      {
        key: 'parent',
        label: 'Parent Domain',
        description: 'The parent domain name',
        type: 'string',
        required: true,
      },
      {
        key: 'to',
        label: 'New Owner Address',
        description: 'Address to receive subdomain ownership',
        type: 'address',
        required: true,
      },
    ],
    examples: [
      'transferSubdomain: [app]@subname@[example.eth]@parent = [0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@to',
    ],
    contract: 'registry',
  },

  // ========== RECORD OPERATIONS ==========
  {
    action: 'setAddr',
    label: 'Set Address Record',
    description: 'Set the address record for a domain (ETH or multi-chain)',
    category: 'record',
    operator: '=',
    parameters: [
      {
        key: 'domain',
        label: 'Domain Name',
        description: 'The ENS domain',
        type: 'string',
        required: true,
      },
      {
        key: 'address',
        label: 'Address Value',
        description: 'The address to set (Ethereum address or encoded multi-chain address)',
        type: 'address',
        required: true,
      },
      {
        key: 'coinType',
        label: 'Coin Type',
        description: 'Coin type for multi-chain addresses (60 for ETH, 0 for default ETH)',
        type: 'number',
        required: false,
        defaultValue: 60,
        examples: ['60', '0', '2', '3', '501'], // ETH, BTC, LTC, DOGE, SOL
      },
    ],
    examples: [
      'setAddr: [example.eth]@domain = [0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@address',
      'setAddr: [example.eth]@domain = [bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh]@address@[2]@coinType',
    ],
    contract: 'resolver',
  },

  {
    action: 'setText',
    label: 'Set Text Record',
    description: 'Set a text record (metadata) for a domain',
    category: 'record',
    operator: '=',
    parameters: [
      {
        key: 'domain',
        label: 'Domain Name',
        description: 'The ENS domain',
        type: 'string',
        required: true,
      },
      {
        key: 'key',
        label: 'Record Key',
        description: 'The text record key',
        type: 'string',
        required: true,
        examples: ['description', 'url', 'avatar', 'email', 'com.twitter', 'com.github'],
      },
      {
        key: 'value',
        label: 'Record Value',
        description: 'The text record value',
        type: 'string',
        required: true,
      },
    ],
    examples: [
      'setText: [example.eth]@domain@[description]@key = [My awesome domain]@value',
      'setText: [example.eth]@domain@[com.twitter]@key = [@example]@value',
      'setText: [example.eth]@domain@[url]@key = [https://example.com]@value',
    ],
    contract: 'resolver',
  },

  {
    action: 'removeText',
    label: 'Remove Text Record',
    description: 'Remove a text record by setting it to empty string',
    category: 'record',
    operator: '-',
    parameters: [
      {
        key: 'domain',
        label: 'Domain Name',
        description: 'The ENS domain',
        type: 'string',
        required: true,
      },
      {
        key: 'key',
        label: 'Record Key',
        description: 'The text record key to remove',
        type: 'string',
        required: true,
      },
    ],
    examples: [
      '-removeText: [example.eth]@domain@[description]@key',
    ],
    contract: 'resolver',
  },

  {
    action: 'setContentHash',
    label: 'Set Content Hash',
    description: 'Set the content hash record (IPFS, IPNS, Swarm, etc.)',
    category: 'record',
    operator: '=',
    parameters: [
      {
        key: 'domain',
        label: 'Domain Name',
        description: 'The ENS domain',
        type: 'string',
        required: true,
      },
      {
        key: 'contentHash',
        label: 'Content Hash',
        description: 'Content hash in format /ipfs/Qm..., /ipns/..., /bzz/..., or hex string',
        type: 'string',
        required: true,
        examples: ['/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG', '/ipns/example.eth'],
      },
    ],
    examples: [
      'setContentHash: [example.eth]@domain = [/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG]@contentHash',
    ],
    contract: 'resolver',
  },

  {
    action: 'setTTL',
    label: 'Set TTL',
    description: 'Set the Time To Live (TTL) for a domain',
    category: 'record',
    operator: '=',
    parameters: [
      {
        key: 'domain',
        label: 'Domain Name',
        description: 'The ENS domain',
        type: 'string',
        required: true,
      },
      {
        key: 'ttl',
        label: 'TTL (seconds)',
        description: 'Time to live in seconds',
        type: 'number',
        required: true,
        examples: ['3600', '86400'],
      },
    ],
    examples: [
      'setTTL: [example.eth]@domain = [3600]@ttl',
    ],
    contract: 'resolver',
  },

  {
    action: 'setABI',
    label: 'Set ABI Record',
    description: 'Set the ABI (Application Binary Interface) record for a domain',
    category: 'record',
    operator: '=',
    parameters: [
      {
        key: 'domain',
        label: 'Domain Name',
        description: 'The ENS domain',
        type: 'string',
        required: true,
      },
      {
        key: 'contentType',
        label: 'Content Type',
        description: 'ABI content type (1 = JSON, 2 = CBOR)',
        type: 'number',
        required: true,
        defaultValue: 1,
        examples: ['1', '2'],
      },
      {
        key: 'data',
        label: 'ABI Data',
        description: 'ABI data as JSON string or hex-encoded bytes',
        type: 'string',
        required: true,
      },
    ],
    examples: [
      'setABI: [example.eth]@domain@[1]@contentType = [{"type":"function","name":"transfer"}]@data',
    ],
    contract: 'resolver',
  },

  {
    action: 'setPubkey',
    label: 'Set Public Key',
    description: 'Set the public key record for a domain',
    category: 'record',
    operator: '=',
    parameters: [
      {
        key: 'domain',
        label: 'Domain Name',
        description: 'The ENS domain',
        type: 'string',
        required: true,
      },
      {
        key: 'x',
        label: 'Public Key X',
        description: 'X coordinate of the public key (32 bytes hex)',
        type: 'hex',
        required: true,
      },
      {
        key: 'y',
        label: 'Public Key Y',
        description: 'Y coordinate of the public key (32 bytes hex)',
        type: 'hex',
        required: true,
      },
    ],
    examples: [
      'setPubkey: [example.eth]@domain = [0x1234...]@x@[0x5678...]@y',
    ],
    contract: 'resolver',
  },

  {
    action: 'setZonehash',
    label: 'Set Zone Hash',
    description: 'Set the DNS zone hash for a domain',
    category: 'record',
    operator: '=',
    parameters: [
      {
        key: 'domain',
        label: 'Domain Name',
        description: 'The ENS domain',
        type: 'string',
        required: true,
      },
      {
        key: 'zonehash',
        label: 'Zone Hash',
        description: 'DNS zone hash (hex string)',
        type: 'hex',
        required: true,
      },
    ],
    examples: [
      'setZonehash: [example.eth]@domain = [0x1234...]@zonehash',
    ],
    contract: 'resolver',
  },

  {
    action: 'setResolver',
    label: 'Set Resolver',
    description: 'Set the resolver address for a domain',
    category: 'record',
    operator: '=',
    parameters: [
      {
        key: 'domain',
        label: 'Domain Name',
        description: 'The ENS domain',
        type: 'string',
        required: true,
      },
      {
        key: 'resolver',
        label: 'Resolver Address',
        description: 'Address of the resolver contract',
        type: 'address',
        required: true,
      },
    ],
    examples: [
      'setResolver: [example.eth]@domain = [0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63]@resolver',
    ],
    contract: 'registry',
  },

  // ========== DELEGATION OPERATIONS ==========
  {
    action: 'delegateTo',
    label: 'Add Delegate',
    description: 'Delegate permissions to an address for a domain',
    category: 'delegation',
    operator: '+',
    parameters: [
      {
        key: 'domain',
        label: 'Domain Name',
        description: 'The ENS domain',
        type: 'string',
        required: true,
      },
      {
        key: 'delegate',
        label: 'Delegate Address',
        description: 'Address to receive delegated permissions',
        type: 'address',
        required: true,
      },
      {
        key: 'permissions',
        label: 'Permission Mask',
        description: 'Bitmask of permissions (see GRANULAR_PERMISSIONS)',
        type: 'number',
        required: true,
        examples: ['1', '2', '4', '7', '1023'], // Individual or combined permissions
      },
      {
        key: 'expiresAt',
        label: 'Expiration Timestamp',
        description: 'Unix timestamp when delegation expires (0 for no expiration)',
        type: 'timestamp',
        required: false,
        defaultValue: 0,
      },
    ],
    examples: [
      '+delegateTo: [example.eth]@domain = [0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@delegate@[7]@permissions',
      '+delegateTo: [example.eth]@domain = [0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@delegate@[MANAGE_SUBDOMAINS|SET_TEXT_RECORD]@permissions',
    ],
    contract: 'delegate',
  },

  {
    action: 'delegateAuthSelect',
    label: 'Set Delegate Permissions',
    description: 'Set specific permissions for a delegate using permission keys',
    category: 'delegation',
    operator: '=',
    parameters: [
      {
        key: 'domain',
        label: 'Domain Name',
        description: 'The ENS domain',
        type: 'string',
        required: true,
      },
      {
        key: 'delegate',
        label: 'Delegate Address',
        description: 'Address of the delegate',
        type: 'address',
        required: true,
      },
      {
        key: 'permissionKeys',
        label: 'Permission Keys',
        description: 'Array of permission keys (MANAGE_SUBDOMAINS, SET_ADDR_RECORD, etc.)',
        type: 'array',
        required: true,
        examples: [
          '["MANAGE_SUBDOMAINS", "SET_TEXT_RECORD"]',
          '["SET_ADDR_RECORD", "SET_CONTENT_HASH"]',
        ],
      },
      {
        key: 'expiresAt',
        label: 'Expiration Timestamp',
        description: 'Unix timestamp when delegation expires',
        type: 'timestamp',
        required: false,
        defaultValue: 0,
      },
    ],
    examples: [
      'delegateAuthSelect: [example.eth]@domain@[0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@delegate = [MANAGE_SUBDOMAINS,SET_TEXT_RECORD]@permissionKeys',
    ],
    contract: 'delegate',
  },

  {
    action: 'removeDelegate',
    label: 'Remove Delegate',
    description: 'Remove a delegate from a domain',
    category: 'delegation',
    operator: '-',
    parameters: [
      {
        key: 'domain',
        label: 'Domain Name',
        description: 'The ENS domain',
        type: 'string',
        required: true,
      },
      {
        key: 'delegate',
        label: 'Delegate Address',
        description: 'Address of the delegate to remove',
        type: 'address',
        required: true,
      },
    ],
    examples: [
      '-removeDelegate: [example.eth]@domain@[0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@delegate',
    ],
    contract: 'delegate',
  },

  {
    action: 'updateDelegate',
    label: 'Update Delegate',
    description: 'Update permissions and expiration for an existing delegate',
    category: 'delegation',
    operator: '=',
    parameters: [
      {
        key: 'domain',
        label: 'Domain Name',
        description: 'The ENS domain',
        type: 'string',
        required: true,
      },
      {
        key: 'delegate',
        label: 'Delegate Address',
        description: 'Address of the delegate',
        type: 'address',
        required: true,
      },
      {
        key: 'permissions',
        label: 'Permission Mask',
        description: 'New permission bitmask',
        type: 'number',
        required: true,
      },
      {
        key: 'expiresAt',
        label: 'Expiration Timestamp',
        description: 'New expiration timestamp',
        type: 'timestamp',
        required: true,
      },
    ],
    examples: [
      'updateDelegate: [example.eth]@domain@[0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@delegate = [15]@permissions@[1735689600]@expiresAt',
    ],
    contract: 'delegate',
  },

  {
    action: 'lockDelegate',
    label: 'Lock Delegate',
    description: 'Lock a delegate to prevent removal',
    category: 'delegation',
    operator: '=',
    parameters: [
      {
        key: 'domain',
        label: 'Domain Name',
        description: 'The ENS domain',
        type: 'string',
        required: true,
      },
      {
        key: 'delegate',
        label: 'Delegate Address',
        description: 'Address of the delegate to lock',
        type: 'address',
        required: true,
      },
    ],
    examples: [
      'lockDelegate: [example.eth]@domain@[0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@delegate',
    ],
    contract: 'delegate',
  },

  {
    action: 'unlockDelegate',
    label: 'Unlock Delegate',
    description: 'Unlock a delegate to allow removal',
    category: 'delegation',
    operator: '=',
    parameters: [
      {
        key: 'domain',
        label: 'Domain Name',
        description: 'The ENS domain',
        type: 'string',
        required: true,
      },
      {
        key: 'delegate',
        label: 'Delegate Address',
        description: 'Address of the delegate to unlock',
        type: 'address',
        required: true,
      },
    ],
    examples: [
      'unlockDelegate: [example.eth]@domain@[0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@delegate',
    ],
    contract: 'delegate',
  },

  {
    action: 'enableDelegate',
    label: 'Enable Delegate',
    description: 'Enable a disabled delegate',
    category: 'delegation',
    operator: '=',
    parameters: [
      {
        key: 'domain',
        label: 'Domain Name',
        description: 'The ENS domain',
        type: 'string',
        required: true,
      },
      {
        key: 'delegate',
        label: 'Delegate Address',
        description: 'Address of the delegate to enable',
        type: 'address',
        required: true,
      },
    ],
    examples: [
      'enableDelegate: [example.eth]@domain@[0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@delegate',
    ],
    contract: 'delegate',
  },

  {
    action: 'disableDelegate',
    label: 'Disable Delegate',
    description: 'Disable a delegate without removing it',
    category: 'delegation',
    operator: '=',
    parameters: [
      {
        key: 'domain',
        label: 'Domain Name',
        description: 'The ENS domain',
        type: 'string',
        required: true,
      },
      {
        key: 'delegate',
        label: 'Delegate Address',
        description: 'Address of the delegate to disable',
        type: 'address',
        required: true,
      },
    ],
    examples: [
      'disableDelegate: [example.eth]@domain@[0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@delegate',
    ],
    contract: 'delegate',
  },

  // ========== FUSE OPERATIONS ==========
  {
    action: 'setFuses',
    label: 'Set Fuses',
    description: 'Set permission fuses on a wrapped domain',
    category: 'wrapper',
    operator: '=',
    parameters: [
      {
        key: 'domain',
        label: 'Domain Name',
        description: 'The wrapped ENS domain',
        type: 'string',
        required: true,
      },
      {
        key: 'fuses',
        label: 'Fuses',
        description: 'Bitmask of fuses to set',
        type: 'number',
        required: true,
        examples: ['1', '2', '4', '7', '32'],
      },
    ],
    examples: [
      'setFuses: [example.eth]@domain = [7]@fuses',
    ],
    contract: 'nameWrapper',
  },

  // ========== REVERSE RECORD OPERATIONS ==========
  {
    action: 'setReverseRecord',
    label: 'Set Reverse Record',
    description: 'Set the ENS name for an Ethereum address (reverse resolution)',
    category: 'reverse',
    operator: '=',
    parameters: [
      {
        key: 'address',
        label: 'Ethereum Address',
        description: 'The address to set reverse record for',
        type: 'address',
        required: true,
      },
      {
        key: 'name',
        label: 'ENS Name',
        description: 'The ENS name to associate with the address',
        type: 'string',
        required: true,
      },
    ],
    examples: [
      'setReverseRecord: [0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@address = [example.eth]@name',
    ],
    contract: 'reverseRegistrar',
  },

  // ========== APPROVAL OPERATIONS ==========
  {
    action: 'setApprovalForAll',
    label: 'Set Approval For All',
    description: 'Approve or revoke an operator for all domains',
    category: 'wrapper',
    operator: '=',
    parameters: [
      {
        key: 'operator',
        label: 'Operator Address',
        description: 'Address to approve or revoke',
        type: 'address',
        required: true,
      },
      {
        key: 'approved',
        label: 'Approved',
        description: 'Whether to approve (true) or revoke (false)',
        type: 'boolean',
        required: true,
        examples: ['true', 'false'],
      },
    ],
    examples: [
      'setApprovalForAll: [0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@operator = [true]@approved',
    ],
    contract: 'nameWrapper',
  },
];

/**
 * Permission keys for delegation
 */
export const PERMISSION_KEYS = {
  MANAGE_SUBDOMAINS: 'MANAGE_SUBDOMAINS',
  SET_ADDR_RECORD: 'SET_ADDR_RECORD',
  SET_TEXT_RECORD: 'SET_TEXT_RECORD',
  SET_CONTENT_HASH: 'SET_CONTENT_HASH',
  SET_PUBKEY: 'SET_PUBKEY',
  SET_ABI: 'SET_ABI',
  SET_ZONEHASH: 'SET_ZONEHASH',
  SET_TTL: 'SET_TTL',
  SET_RESOLVER: 'SET_RESOLVER',
  SET_OWNER: 'SET_OWNER',
  SET_FUSES: 'SET_FUSES',
} as const;

/**
 * Fuse constants
 */
export const FUSE_CONSTANTS = {
  CANNOT_UNWRAP: 1,
  CANNOT_BURN_FUSES: 2,
  CANNOT_TRANSFER: 4,
  CANNOT_SET_RESOLVER: 8,
  CANNOT_SET_TTL: 16,
  CANNOT_CREATE_SUBDOMAIN: 32,
  CANNOT_APPROVE: 64,
  PARENT_CANNOT_CONTROL: 65536,
  CAN_EXTEND_EXPIRY: 131072,
} as const;

/**
 * Get action schema by action name
 */
export function getActionSchema(action: string): ActionSchema | undefined {
  return ENS_CONSOLE_SCHEMA.find(schema => schema.action === action);
}

/**
 * Get all actions by category
 */
export function getActionsByCategory(category: ActionSchema['category']): ActionSchema[] {
  return ENS_CONSOLE_SCHEMA.filter(schema => schema.category === category);
}

/**
 * Get all available actions
 */
export function getAllActions(): string[] {
  return ENS_CONSOLE_SCHEMA.map(schema => schema.action);
}













