# ENSIP-19 Quick Start Guide

## Installation

1. Install dependencies:
```bash
npm install
```

This will install the new required packages:
- `ajv` - JSON Schema validator
- `ajv-formats` - Format validators

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:5173`

## Using ENSIP-19 Registration

### Step 1: Navigate to ENSIP-19 Registration

1. Click on the sidebar menu
2. Under "Registry", click "ENSIP-19 Registration"

### Step 2: Fill in Basic Information

**Required fields:**
- **Organization**: Your organization identifier (e.g., `uniswap`, `compound`)
  - Lowercase, hyphen-separated only
- **Protocol**: Protocol name (e.g., `uniswap`, `aave`)
- **Role**: Contract function (e.g., `router`, `pool`, `vault`)
- **Version**: Contract version in format `v1-0-0` (hyphen-separated)
- **Chain ID**: Select your deployment chain
- **Contract Address**: Deployed contract address (0x...)

**Optional:**
- **Variant**: Protocol variant (e.g., `v3`, `optimized`)
- **Deployed Block**: Block number of deployment

You'll see a **Canonical ID Preview** showing the generated identifier:
```
uniswap.uniswap.defi.router.v4-0-0.1
```

### Step 3: Classify Your Contract

**Category** (required): Choose from 19 categories:
- defi, dao, l2, infra, token, nft, gaming, social, identity, privacy, security, wallet, analytics, rwa, supply, health, finance, dev, art

**Subcategory** (recommended): Auto-populated based on category
- Example: For "defi", choose from: amm, lending, stablecoin, yield, perps, etc.

**Standards** (optional):
- ERC Standards: `ERC20, ERC721` (comma-separated)
- Interface IDs: `0x01ffc9a7` (comma-separated)
- Tags: `dex, swap, amm` (comma-separated)

### Step 4: Add Security Information

**Proxy Configuration:**
- Select proxy type: immutable, transparent, uups, beacon, diamond, minimal
- If not immutable, provide implementation address

**Ownership:**
- Add contract owner addresses (comma-separated)
- Recommended: Use multisig addresses

**Audit Information:**
- Audit Firm: Name of auditor (e.g., `Trail of Bits`)
- Audit Date: Date of audit completion
- Audit Report: URL to public audit report

### Step 5: Set Lifecycle Status

- **Status**: planning, development, testing, deployed, deprecated, discontinued
- **Deployed Since**: Timestamp of deployment
- **Replaced By**: For deprecated contracts, specify replacement canonical ID

### Step 6: Review & Register

1. Review all information
2. Click **"Validate ENSIP-19"** to check compliance
3. You'll see a compliance score (0-100)
4. If validation passes, click **"Register Contract"**

The system will:
1. Generate metadata hash
2. Create ENS subdomain at `{contract}.{subcategory}.{category}.{org}.cns.eth`
3. Store metadata on-chain in text records:
   - `ensip19.id` - Canonical identifier
   - `ensip19.hash` - SHA-256 metadata hash
   - `ensip19.metadata` - Full JSON metadata
   - `eth.contract.address` - Contract address

## Example: Register Uniswap V4 Router

```
Step 1 - Basic Information:
  Organization: uniswap
  Protocol: uniswap
  Role: router
  Version: v4-0-0
  Chain ID: 1 (Ethereum Mainnet)
  Contract Address: 0x... (your contract)
  Deployed Block: 19000000

Step 2 - Classification:
  Category: defi
  Subcategory: amm
  ERC Standards: (leave empty)
  Tags: dex, swap, amm

Step 3 - Security:
  Proxy Type: uups
  Implementation: 0x... (implementation address)
  Owners: 0x... (multisig address)
  Audit Firm: Trail of Bits
  Audit Date: 2024-01-15
  Audit Report: https://...

Step 4 - Lifecycle:
  Status: deployed
  Deployed Since: 2024-01-17T00:00:00

Step 5 - Review:
  Click "Validate ENSIP-19" → Score: 95/100 (excellent)
  Click "Register Contract"

Result:
  Canonical ID: uniswap.uniswap.defi.router.v4-0-0.1
  ENS Domain: router.amm.defi.uniswap.cns.eth
  Metadata Hash: 0xcd788df...
  Status: ENSIP-19 Compliant ✓
```

## Compliance Scoring

The system evaluates 6 QA standards:

| Standard | Weight | Description |
|----------|--------|-------------|
| Schema Validation | 20 | All required fields present and valid |
| Canonical ID Grammar | 20 | Proper ID format |
| Category Classification | 15 | Valid category selection |
| Security Standards | 15 | Security metadata provided |
| Lifecycle Management | 10 | Lifecycle status set |
| Version Format | 10 | Proper version format |

**Compliance Levels:**
- 90-100: Excellent
- 80-89: Good
- 70-79: Acceptable
- 60-69: Poor
- 0-59: Non-compliant

## Viewing Registered Contracts

After registration, you can view your contract metadata by querying the ENS text records:

```javascript
import { publicClient } from 'viem';

const metadata = await publicClient.getEnsText({
  name: 'router.amm.defi.uniswap.cns.eth',
  key: 'ensip19.metadata'
});

console.log(JSON.parse(metadata));
```

## Programmatic Usage

You can also use the ENSIP-19 utilities programmatically:

```typescript
import {
  generateCanonicalId,
  generateMetadataHash,
  ENSIP19Metadata
} from './src/lib/ensip19-utils';

import { validateENSIP19Full } from './src/lib/ensip19-validator';

// Create metadata
const metadata: Partial<ENSIP19Metadata> = {
  org: 'myorg',
  protocol: 'myprotocol',
  category: 'defi',
  role: 'vault',
  version: 'v1-0-0',
  chainId: 1,
  addresses: [{
    chainId: 1,
    address: '0x...'
  }]
};

// Generate ID
metadata.id = generateCanonicalId({
  org: metadata.org,
  protocol: metadata.protocol,
  category: metadata.category,
  role: metadata.role,
  version: metadata.version,
  chainId: metadata.chainId
});

// Generate hash
metadata.metadataHash = await generateMetadataHash(metadata);

// Validate
const result = validateENSIP19Full(metadata);
console.log(result.valid); // true/false
console.log(result.errors); // array of errors
```

## Troubleshooting

### Version Format Errors

- ❌ `v1.0.0` (dots not allowed)
- ✅ `v1-0-0` (hyphens required)

The system auto-converts dots to hyphens.

### Address Format Errors

- Must start with `0x`
- Must be exactly 42 characters (40 hex + 0x)
- Case-insensitive

### Canonical ID Errors

Ensure all fields use lowercase and hyphens only:
- ❌ `MyOrg` → ✅ `myorg`
- ❌ `my_org` → ✅ `my-org`
- ❌ `My Org` → ✅ `my-org`

### Category Not Found

Make sure to select from the 19 approved categories. Custom categories are not allowed.

## Support

For detailed implementation information, see:
- `ENSIP19-IMPLEMENTATION.md` - Complete technical documentation
- `~/ens-metadata-tools-repo/docs/ENSIP-19.md` - Full ENSIP-19 specification

## Benefits of ENSIP-19 Compliance

1. **Standardization**: Interoperable metadata across the ecosystem
2. **Verification**: Cryptographic integrity via SHA-256 hashing
3. **Discovery**: Hierarchical organization for easy lookup
4. **Trust**: Auditable on-chain metadata
5. **Future-proof**: Version tracking and lifecycle management

