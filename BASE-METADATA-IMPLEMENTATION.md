# Base Chain Metadata Implementation

## Overview

This implementation enhances contract name assignment and metadata deployment by storing metadata on Base chain (chainId: 8453) for cross-chain resolution from any EVM network.

## Architecture

### Metadata Storage Strategy

1. **Primary Storage**: Base Chain (ChainId: 8453)
   - Stores complete contract metadata packages
   - Enables cross-chain resolution
   - Centralized metadata registry

2. **Reference Storage**: ENS Text Records
   - Stores pointer to Base metadata
   - Text record key: `ensip19.base` (for ENSIP-X) or `metadata.base` (for basic)
   - Contains name hash, canonical ID, and metadata hash

3. **Chain-Specific Records**: Original Chain
   - Contract address records
   - Basic text records for compatibility

### Data Flow

```
┌─────────────────┐
│ Contract Deploy │
│  (Any EVM Net)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ Generate Metadata Package    │
│ - Canonical ID              │
│ - Full Metadata JSON         │
│ - Cross-Chain Pointers      │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Store on Base Chain         │
│ - Metadata Registry Contract │
│ - Cross-Chain Pointers      │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Create ENS Reference        │
│ - Store pointer in ENS      │
│ - Link to Base metadata     │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Cross-Chain Resolution      │
│ Any EVM Network             │
│ → Read ENS pointer          │
│ → Fetch from Base           │
└─────────────────────────────┘
```

## Components

### 1. Base Metadata Service (`src/lib/services/base-metadata-service.ts`)

Provides functions for:
- Storing metadata on Base chain
- Retrieving metadata from Base chain
- Setting/getting cross-chain pointers
- Formatting ENS reference pointers

**Key Functions:**
- `storeCompleteMetadataPackage()` - Stores full metadata with cross-chain pointers
- `getMetadataFromBase()` - Retrieves metadata by name hash
- `setCrossChainPointer()` - Maps chain ID to contract address
- `formatBaseMetadataReference()` - Creates ENS text record reference

### 2. Updated Registration Workflows

**UnifiedContractRegistration** (`src/components/workflows/UnifiedContractRegistration.tsx`)
- Enhanced ENSIP-X workflow with Base storage
- Stores canonical ID, metadata JSON, and cross-chain pointers
- Creates ENS reference pointer

**ContractRegistration** (`src/components/workflows/ContractRegistration.tsx`)
- Enhanced basic workflow with Base storage
- Stores contract metadata package
- Creates ENS reference pointer

## Metadata Format

### Base Metadata Reference (ENS Text Record)

```json
{
  "protocol": "base-metadata",
  "chainId": 8453,
  "nameHash": "0x...",
  "canonicalId": "org.protocol.category.role.v1-0-0.1",
  "metadataHash": "0x..."
}
```

### Cross-Chain Pointer

```typescript
{
  chainId: number,
  contractAddress: string,
  metadataHash: string
}
```

## Benefits

### 1. Cross-Chain Resolution
- Metadata accessible from any EVM network
- Single source of truth on Base
- No need to replicate metadata across chains

### 2. Cost Efficiency
- Store metadata once on Base (low fees)
- Reference from any chain
- Reduced gas costs

### 3. Consistency
- Centralized metadata registry
- Standardized metadata format
- Version tracking

### 4. Interoperability
- Works with all EVM-compatible chains
- Contract naming remains consistent
- Metadata updates propagate across chains

## Usage

### Storing Metadata

```typescript
import { storeCompleteMetadataPackage } from '@/lib/services/base-metadata-service';

await storeCompleteMetadataPackage(walletClient, {
  nameHash: namehash(ensName),
  canonicalId: metadata.id,
  metadata: fullMetadata,
  crossChainPointers: [
    {
      chainId: 1,
      contractAddress: '0x...',
      metadataHash: '0x...'
    }
  ]
});
```

### Retrieving Metadata

```typescript
import { getMetadataFromBase, parseBaseMetadataReference } from '@/lib/services/base-metadata-service';

// 1. Read reference from ENS
const referenceText = await getTextRecord(ensName, 'ensip19.base');
const reference = parseBaseMetadataReference(referenceText);

// 2. Fetch metadata from Base
const metadata = await getMetadataFromBase(basePublicClient, reference.nameHash);
```

## Implementation Details

### Base Metadata Registry Contract

A smart contract on Base that stores:
- Name hash → Canonical ID mapping
- Name hash → Metadata JSON mapping
- Name hash + Chain ID → Contract address mapping

**Contract Interface:**
```solidity
interface BaseMetadataRegistry {
  function setMetadata(
    bytes32 indexed nameHash,
    string memory canonicalId,
    string memory metadataJson
  ) external;
  
  function getMetadata(
    bytes32 indexed nameHash
  ) external view returns (
    string memory canonicalId,
    string memory metadataJson
  );
  
  function setCrossChainPointer(
    bytes32 indexed nameHash,
    uint256 chainId,
    address contractAddress
  ) external;
  
  function getCrossChainPointer(
    bytes32 indexed nameHash,
    uint256 chainId
  ) external view returns (address);
}
```

### Error Handling

The implementation includes graceful fallback:
- If Base storage fails, continues with ENS-only storage
- Warning toast notification informs user
- Registration still completes successfully

## Network Configuration

### Base Chain Settings
- Chain ID: 8453
- RPC URL: https://mainnet.base.org
- Contract: (To be deployed)

### Supported Chains
- Ethereum Mainnet (1)
- Polygon (137)
- Arbitrum (42161)
- Optimism (10)
- Base (8453)
- Any EVM-compatible chain

## Future Enhancements

1. **Metadata Registry Deployment**
   - Deploy Base Metadata Registry contract
   - Verify contract on Base explorer
   - Update contract address

2. **IPFS Integration**
   - Store large metadata on IPFS
   - Reference IPFS hash from Base
   - Multi-tier storage strategy

3. **Event Indexing**
   - Index Base metadata events
   - Real-time metadata updates
   - Historical version tracking

4. **Batch Operations**
   - Batch metadata storage
   - Multi-contract registration
   - Gas optimization

5. **Schema Validation**
   - On-chain schema validation
   - Metadata standardization
   - Compliance checking

## Conclusion

This implementation provides a solid foundation for cross-chain metadata resolution using Base as the storage layer. Contract name assignment is now coordinated with metadata deployment, enabling seamless resolution from any EVM network.

