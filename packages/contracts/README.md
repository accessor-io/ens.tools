# ENS Granular Name Assignment (GNA) Contracts

This package contains the smart contracts for the Granular Name Assignment (GNA) system, which enables fine-grained, revocable delegation of operational control over ENS name records and subdomains.

## Overview

The GNA system consists of two main contracts:

1. **GranularAssignmentController** (`ENSNamingDelegateGranular.sol`) - Manages delegation policies and permissions
2. **GranularResolver** (`GranularResolver.sol`) - Enforces access control for resolver operations

## Architecture

```
┌─────────────────────┐    ┌──────────────────────────┐    ┌─────────────────────┐
│   ENS Registry      │    │ GranularAssignmentController │    │  GranularResolver   │
│   (Mainnet)         │◄───┤                          │◄───┤                     │
│ 0x0000...2e1e       │    │  - Delegation Management  │    │  - Access Control   │
│ (Hardcoded)         │    │  - Permission Enforcement │    │  - Record Management│
└─────────────────────┘    │  - Emergency Controls     │    │  - Owner Override   │
                           └──────────────────────────┘    └─────────────────────┘
┌─────────────────────┐
│   NameWrapper       │
│   (Mainnet)         │
│ 0xD441...86401      │
│ (Hardcoded)         │
└─────────────────────┘
```

### ENS Ecosystem Compatibility

The GNA system is fully compatible with the official ENS ecosystem from [ensdomains/ens-contracts](https://github.com/ensdomains/ens-contracts):

- **ENSRegistry.sol**: Direct integration with official ENS Registry
- **NameWrapper.sol**: Full support for NameWrapper functionality  
- **PublicResolver.sol**: Compatible with standard ENS resolvers
- **EIP Standards**: Implements EIP-137, EIP-165, EIP-205, EIP-619, EIP-634, EIP-1577, EIP-1844

### Hardcoded Addresses for Production

The production contracts use **hardcoded mainnet addresses** for the ENS Registry and NameWrapper to ensure they interact with the actual ENS system:

```solidity
// ENS Registry address on mainnet (hardcoded for production use)
address public constant ENS_REGISTRY = 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e;

// NameWrapper address on mainnet (hardcoded for production use)  
address public constant NAME_WRAPPER = 0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401;
```

**Why Hardcoded Addresses?**

1. **Production Safety**: Ensures contracts always interact with the real ENS system
2. **No Configuration Errors**: Eliminates risk of deploying with wrong addresses
3. **Gas Efficiency**: No need to store addresses in storage
4. **Immutability**: Addresses cannot be changed after deployment
5. **ENS Integration**: Direct integration with the official ENS infrastructure

## Contracts

### GranularAssignmentController

**File**: `src/ENSNamingDelegateGranular.sol`

The central policy engine for managing granular permissions. Key features:

- **Permission Management**: Add, update, and remove delegates with specific permissions
- **Time-Bound Delegations**: All delegations can have expiration timestamps
- **Emergency Controls**: Pause, revoke, and alert mechanisms
- **Access Control Lists**: Whitelist and blacklist functionality
- **Audit Trail**: Complete history of delegation changes

### GranularResolver

**File**: `src/GranularResolver.sol`

ENS resolver with granular permission enforcement. Features:

- **Access Control**: Enforces permissions for all resolver operations
- **Owner Override**: Optional bypass mechanism for ENS owners
- **Standard Compliance**: Implements all standard ENS resolver functions
- **Integration**: Seamless integration with GranularAssignmentController

## Interfaces

### Core Interfaces

- **`IENSRegistry.sol`** - Interface for ENS Registry contract
- **`INameWrapper.sol`** - Interface for NameWrapper contract  
- **`IENSResolver.sol`** - Interface for ENS resolver functions
- **`IGranularAssignmentController.sol`** - Interface for GNA controller

### Network Addresses

**File**: `config/addresses.js`

Contains addresses for ENS contracts across different networks:

```javascript
const ADDRESSES = {
  1: { // Mainnet
    ENS_REGISTRY: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
    NAME_WRAPPER: "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401",
    PUBLIC_RESOLVER: "0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41"
  },
  // ... other networks
};
```

## Permission System

### Permission Constants

| Permission | Bit | Value | Function Controlled |
|------------|-----|-------|-------------------|
| `MANAGE_SUBDOMAINS` | 0 | 1 | `setSubnodeOwner`, `setSubnodeRecord` |
| `SET_ADDR_RECORD` | 1 | 2 | `setAddr` (any coin type) |
| `SET_TEXT_RECORD` | 2 | 4 | `setText` (any key) |
| `SET_CONTENT_HASH` | 3 | 8 | `setContenthash` |
| `SET_PUBKEY` | 4 | 16 | `setPubkey` |
| `SET_ABI` | 5 | 32 | `setABI` |
| `SET_ZONEHASH` | 6 | 64 | `setZonehash` |
| `SET_TTL` | 7 | 128 | `setTTL` |
| `SET_RESOLVER` | 8 | 256 | `setResolver` |
| `SET_OWNER` | 9 | 512 | `setOwner` (Registry operations) |
| `SET_FUSES` | 10 | 1024 | `setFuses` (NameWrapper operations) |

### Delegation Patterns

Common permission combinations for different roles:

```javascript
const DELEGATION_PATTERNS = {
  TREASURY: SET_ADDR_RECORD,                    // Can only set addresses
  MARKETING: SET_TEXT_RECORD,                   // Can only set text records
  DEVOPS: MANAGE_SUBDOMAINS,                    // Can manage subdomains
  RECORD_MANAGER: SET_ADDR_RECORD | SET_TEXT_RECORD | SET_CONTENT_HASH,
  OPERATIONS: MANAGE_SUBDOMAINS | SET_ADDR_RECORD | SET_TEXT_RECORD,
  ADMIN: // All permissions except ownership
};
```

## Deployment

### Prerequisites

1. Node.js and npm
2. Hardhat development environment
3. Access to target network (mainnet, testnet, etc.)

### Deploy Script

**File**: `scripts/deployment/deploy-gna.js`

```bash
# Deploy to mainnet
npx hardhat run scripts/deployment/deploy-gna.js --network mainnet

# Deploy to testnet
npx hardhat run scripts/deployment/deploy-gna.js --network sepolia
```

### Manual Deployment

```javascript
// 1. Deploy GranularAssignmentController (uses hardcoded mainnet addresses)
const GranularAssignmentController = await ethers.getContractFactory("ENSNamingDelegateGranular");
const controller = await GranularAssignmentController.deploy();

// 2. Deploy GranularResolver (uses hardcoded mainnet addresses)
const GranularResolver = await ethers.getContractFactory("GranularResolver");
const resolver = await GranularResolver.deploy(controller.address);

// 3. Set resolver for your domain
const ensRegistry = await ethers.getContractAt("IENSRegistry", "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e");
await ensRegistry.setResolver(node, resolver.address);
```

### Testing with Mock Contracts

For testing, use the testable versions that accept constructor parameters:

```javascript
// 1. Deploy testable GranularAssignmentController
const TestableGranularAssignmentController = await ethers.getContractFactory("TestableENSNamingDelegateGranular");
const controller = await TestableGranularAssignmentController.deploy(
  mockEnsRegistry.address,
  mockNameWrapper.address
);

// 2. Deploy testable GranularResolver
const TestableGranularResolver = await ethers.getContractFactory("TestableGranularResolver");
const resolver = await TestableGranularResolver.deploy(
  mockEnsRegistry.address,
  controller.address
);
```

## Usage Examples

### Basic Delegation Setup

```javascript
// Add delegate with specific permissions
await granularController.addDelegate(
  node,
  delegateAddress,
  SET_ADDR_RECORD | SET_TEXT_RECORD,
  Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 // 30 days
);

// Delegate can now set records
await granularResolver.setAddr(node, newAddress);
await granularResolver.setText(node, "description", "Updated by delegate");
```

### Enterprise Segregation of Duties

```javascript
// Treasury team - can only set address records
await granularController.addDelegate(
  node,
  treasuryAddress,
  SET_ADDR_RECORD,
  block.timestamp + 90 * 24 * 60 * 60 // 90 days
);

// Marketing team - can only set text records  
await granularController.addDelegate(
  node,
  marketingAddress,
  SET_TEXT_RECORD,
  block.timestamp + 30 * 24 * 60 * 60 // 30 days
);

// DevOps team - can manage subdomains
await granularController.addDelegate(
  node,
  devopsAddress,
  MANAGE_SUBDOMAINS,
  block.timestamp + 7 * 24 * 60 * 60 // 7 days
);
```

### Emergency Response

```javascript
// Emergency pause all delegations
await granularController.emergencyPause(node, true);

// Revoke all delegations
await granularController.emergencyRevokeAll(node);

// Trigger security alert
await granularController.triggerSecurityAlert(
  node, 
  suspiciousDelegate, 
  "Multiple failed attempts"
);
```

## Testing

### Run Tests

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/GranularNameAssignment.test.js

# Run ENS compatibility tests
npx hardhat test test/ENSCompatibility.test.js

# Run with gas reporting
REPORT_GAS=true npx hardhat test
```

### Test Coverage

The test suite covers:

- Permission constant validation
- Delegation management operations
- Permission enforcement logic
- Emergency control functions
- GranularResolver integration
- Whitelist/blacklist functionality
- Locking mechanisms
- Gas optimization
- **ENS ecosystem compatibility**
- **EIP standards compliance**
- **Official contract integration**

## Security Considerations

### Critical Security Notes

1. **Resolver Dependency**: The entire security model depends on using the GranularResolver. ENS owners can bypass all permissions by changing the resolver.

2. **Owner Override**: Use `toggleOwnerOverride()` to disable owner bypass for enhanced security isolation.

3. **Time-Bound Delegations**: Always set expiration timestamps to prevent perpetual access from compromised keys.

4. **Emergency Controls**: Implement monitoring and alerting for emergency control usage.

### Best Practices

1. **Principle of Least Privilege**: Grant only the minimum permissions necessary
2. **Time-Limited Access**: Use short expiration times for sensitive operations
3. **Regular Audits**: Monitor delegation changes and access patterns
4. **Backup Procedures**: Maintain emergency access procedures
5. **Documentation**: Document all delegation policies and procedures

## Integration

### With Existing ENS Infrastructure

The GNA system is designed to work alongside existing ENS features:

- **NameWrapper Fuses**: Can be used to restrict resolver changes
- **Standard Resolvers**: Can be migrated to GranularResolver
- **Existing Delegations**: Can be migrated using the controller interface

### With External Systems

- **Monitoring**: Use events for real-time monitoring
- **Governance**: Integrate with DAO governance systems
- **Automation**: Use with smart contract automation tools

## Gas Costs

### Estimated Gas Costs (Mainnet)

- `addDelegate()`: ~150,000 gas
- `removeDelegate()`: ~80,000 gas
- `setAddr()`: ~60,000 gas
- `setText()`: ~50,000 gas
- Permission check: ~5,000 gas (view function)

## Troubleshooting

### Common Issues

1. **"Not authorized for this operation"**
   - Check if delegate has the required permission
   - Verify delegation hasn't expired
   - Ensure node isn't emergency paused

2. **"Delegate already exists"**
   - Use `updateDelegate()` instead of `addDelegate()`
   - Or remove existing delegate first

3. **"Delegation duration exceeds maximum"**
   - Check `maxDelegationDuration` setting
   - Use shorter expiration time

### Debug Commands

```javascript
// Check delegation status
const info = await granularController.getDelegateInfo(node, delegate);
console.log("Delegation info:", info);

// Check permissions
const hasPermission = await granularController.hasPermission(node, delegate, SET_ADDR_RECORD);
console.log("Has permission:", hasPermission);

// Check emergency status
const isPaused = await granularController.isEmergencyPaused(node);
console.log("Emergency paused:", isPaused);
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For questions and support:

- GitHub Issues: [Create an issue](https://github.com/accessor-io/ens-granular-name-assignment/issues)
- Documentation: [Read the docs](https://docs.ens-granular-name-assignment.com)
- Community: [Join our Discord](https://discord.gg/ens-gna)
