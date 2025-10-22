# Comprehensive ens.tools Features

## 🎯 Complete Implementation Guide

This document details all the production-ready features now available in ens.tools, following standards from github.com/accessor-io/naming-convention-toolkit and official ENS specifications.

---

## ✅ **1. Contract Registration System**

### Overview
Full-featured contract registration workflow that creates ENS subdomains and assigns comprehensive metadata following industry standards.

### Location
- **Component**: `/components/ContractRegistration.tsx`
- **Navigation**: Sidebar → "Register Contract"

### Features

#### **Step 1: Contract Information**
- Enter contract address (proxy or implementation)
- Specify contract type (ERC20, ERC721, Governor, Vault, etc.)
- Mark as upgradeable/proxy contract
- Add implementation address for proxy contracts

#### **Step 2: ENS Naming**
- Select parent domain (must be owned by connected wallet)
- Choose from standard naming templates:
  - `app.*` - Main application contracts
  - `dao.*` - Governance contracts
  - `vault.*` - Treasury/vault contracts
  - `token.*` - Token contracts
  - `nft.*` - NFT collection contracts
  - `staking.*` - Staking contracts
  - `oracle.*` - Price oracle contracts
  - `registry.*` - Registry contracts
  - Custom subdomain option
- Preview full ENS name before creation

#### **Step 3: Metadata Schema**
- Auto-selects recommended schema based on naming template
- Available schemas:
  - **Smart Contract Standard** - General contract metadata
  - **DAO Governance** - DAO-specific fields
  - **Infrastructure Services** - API/RPC/Oracle metadata
  - **Application Contract** - dApp metadata
- Required and optional fields per schema
- Field validation

#### **Step 4: Review & Register**
- Review all information
- Confirm transaction
- Creates subdomain with proper fuses
- Sets contract address record
- Applies all metadata records

### Metadata Fields (Contract Schema Example)
- **Contract Address** (required)
- **Description** (required)
- **Contract Type** (GovernorBravo, ERC20, etc.)
- **Version**
- **Implementation Address** (for proxies)
- **Documentation URL**
- **GitHub Repository**
- **Audit Report URL**

### Transaction Flow
```
1. Create Subdomain (with fuses)
   ↓
2. Set Contract Address Record
   ↓
3. Set All Metadata Records
   ↓
4. Set Contract-Specific Metadata
   ↓
5. Success - Name Resolves to Contract
```

---

## ✅ **2. Domain Profile & Management**

### Overview
Comprehensive domain profile view with complete editing capabilities, subdomain management, security configuration, and transfer options.

### Location
- **Component**: `/components/DomainProfile.tsx`
- **Access**: Click "View" on any domain in Domain Management

### Features

#### **Overview Tab**
- Complete domain information display
- Owner address with copy/view on Etherscan
- Resolved address (ETH record)
- Domain type (Wrapped/Standard)
- Expiration date
- Resolver address
- Quick action buttons to all tabs

#### **Metadata Tab**
- **Schema Selection**
  - Choose from 4 standard schemas
  - Auto-recommended based on domain pattern
  - Schema-specific field validation

- **Metadata Editor**
  - Edit/add text records
  - Structured form based on schema
  - Field descriptions and placeholders
  - Required field validation
  - Save all records with one transaction

- **Supported Record Types**
  - Contract addresses
  - Text records (description, docs, etc.)
  - Social media links
  - URLs and API endpoints
  - Custom fields

#### **Subdomains Tab**
- **View All Subdomains**
  - List of all subdomains under parent
  - Status and configuration per subdomain
  - Quick management actions

- **Create Subdomain**
  - Specify subdomain label
  - Set owner address
  - Configure fuses/permissions
  - Inherit expiration from parent
  - Apply security restrictions

- **Recommended Hierarchy**
  - Standard subdomain patterns
  - Best practices for organization
  - Quick-create suggestions

#### **Security Tab**
- **Fuse Management** (for wrapped names)
  - View available fuses
  - Configure permissions:
    - CANNOT_UNWRAP - Prevent unwrapping
    - CANNOT_BURN_FUSES - Lock fuses permanently
    - CANNOT_TRANSFER - Prevent transfers
    - CANNOT_SET_RESOLVER - Lock resolver
    - CANNOT_SET_TTL - Lock TTL
    - CANNOT_CREATE_SUBDOMAIN - Prevent subdomain creation
    - PARENT_CANNOT_CONTROL - Emancipate from parent
    - CAN_EXTEND_EXPIRY - Allow expiry extension
  - Apply multiple fuses atomically

- **Wrap Status**
  - Indication if name is wrapped
  - Benefits of wrapping
  - Wrap name option (coming soon)

#### **Transfer Tab**
- Transfer ownership to new address
- Warning alerts
- Confirmation dialog
- Irreversible action safeguards

### Technical Implementation
- Uses production ENS write operations
- Integrates with NameWrapper for fuses
- Real-time validation
- Gas-efficient batch operations
- Error handling with user-friendly messages

---

## ✅ **3. Metadata Schema System**

### Overview
Industry-standard metadata schemas following accessor-io/naming-convention-toolkit conventions.

### Location
- **Library**: `/lib/metadata-schemas.ts`
- **Used In**: Contract Registration, Domain Profile, Metadata Editor

### Standard Text Record Keys

#### Identity
- `avatar` - Profile picture (IPFS/HTTP URL)
- `description` - Description text
- `display` - Display name
- `email` - Contact email
- `keywords` - Search keywords
- `name` - Canonical name

#### Contract-Specific
- `eth.contract.address` - Contract address
- `eth.contract.abi` - ABI (JSON)
- `eth.contract.version` - Version string
- `eth.contract.type` - Contract type
- `eth.contract.implementation` - Implementation address
- `eth.contract.proxy.type` - Proxy pattern type

#### Links
- `url` - Website URL
- `notice` - Important notice
- `docs.url` - Documentation URL
- `api.url` - API endpoint
- `changelog.url` - Changelog URL

#### Social
- `com.github` - GitHub org/repo
- `com.twitter` - Twitter handle
- `com.discord` - Discord server
- `org.telegram` - Telegram handle

#### DAO/Governance
- `dao.governance.type` - Governance mechanism
- `dao.voting.power` - Voting power formula
- `dao.proposal.threshold` - Proposal threshold
- `dao.snapshot.space` - Snapshot space

#### Security
- `security.audit.url` - Audit report URL
- `security.bounty.url` - Bug bounty URL
- `security.multisig.address` - Multisig address

#### Deployment
- `deployment.timestamp` - Deployment timestamp
- `deployment.deployer` - Deployer address
- `deployment.chainId` - Chain ID
- `deployment.network` - Network name

### Schema Validation
```typescript
validateMetadata(metadata, schema)
// Returns: { valid: boolean, errors: string[] }
```

### Auto-Recommendation
```typescript
getRecommendedSchema('dao.example.eth')
// Returns: DAO_SCHEMA

getRecommendedSchema('app.example.eth')
// Returns: APPLICATION_SCHEMA
```

---

## ✅ **4. ENS Write Operations**

### Overview
Production-ready write operations for ENS management using viem.

### Location
- **Library**: `/lib/ens-write-operations.ts`

### Available Operations

#### **Set Text Record**
```typescript
setTextRecord(walletClient, publicClient, {
  name: 'app.example.eth',
  recordType: 'text',
  key: 'description',
  value: 'Main application contract'
})
```

#### **Create Subdomain**
```typescript
createSubdomain(walletClient, {
  parentName: 'example.eth',
  label: 'app',
  owner: '0x...',
  resolver: '0x...',
  fuses: 0,
  expiry: BigInt(...)
})
```

#### **Transfer Domain**
```typescript
transferDomain(walletClient, {
  name: 'app.example.eth',
  newOwner: '0x...'
})
```

#### **Set Fuses**
```typescript
setFuses(walletClient, {
  name: 'app.example.eth',
  fuses: combineFuses(['CANNOT_UNWRAP', 'CANNOT_TRANSFER'])
})
```

#### **Wrap Name**
```typescript
wrapName(walletClient, {
  name: 'example.eth',
  owner: '0x...',
  fuses: 0,
  expiry: BigInt(...)
})
```

### Fuse Management
```typescript
// Combine multiple fuses
const fuses = combineFuses([
  'CANNOT_UNWRAP',
  'CANNOT_TRANSFER',
  'PARENT_CANNOT_CONTROL'
]);

// Get active fuses from number
const active = getActiveFuses(fusesNumber);
// Returns: ['CANNOT_UNWRAP', 'CANNOT_TRANSFER']
```

---

## ✅ **5. Complete Domain Management**

### Enhanced Features

#### **Real Data Loading**
- Fetches user's owned domains from The Graph
- Displays all root-level registered/owned names
- Auto-loads when wallet connects
- Refresh functionality

#### **Search & Filter**
- Search by domain name
- Filter tabs:
  - **All Names** - Complete portfolio
  - **Wrapped** - Names with NameWrapper
  - **Expiring Soon** - Names expiring in <90 days

#### **Detailed Information**
- Click any domain to view complete profile
- Full editing capabilities
- Subdomain management
- Transfer options

#### **Expiration Monitoring**
- Real-time expiration status
- Days until expiry calculation
- Color-coded status indicators:
  - 🟢 Active (>90 days)
  - 🟡 Expiring Soon (<90 days)
  - 🔴 Expired

#### **Resolver Status**
- Indicates if resolver is set
- Shows resolver address
- Warning if no resolver configured

---

## ✅ **6. Comprehensive Hierarchy Management**

### Standard Subdomain Patterns

Following accessor-io/naming-convention-toolkit:

#### **Governance**
- `dao.*.eth` - DAO governance contracts
- `gov.*.eth` - Governor contracts  
- `multisig.*.eth` - Multisig wallets
- `timelock.*.eth` - Timelock contracts

#### **Infrastructure**
- `api.*.eth` - API endpoints
- `rpc.*.eth` - RPC endpoints
- `oracle.*.eth` - Price oracles
- `registry.*.eth` - Registry contracts

#### **Finance**
- `vault.*.eth` - Treasury vaults
- `treasury.*.eth` - Treasury contracts
- `staking.*.eth` - Staking contracts
- `rewards.*.eth` - Rewards distributors

#### **Tokens**
- `token.*.eth` - Token contracts
- `nft.*.eth` - NFT collections
- `dao-token.*.eth` - Governance tokens

#### **Applications**
- `app.*.eth` - Main application
- `dapp.*.eth` - Decentralized app
- `swap.*.eth` - DEX contracts
- `lending.*.eth` - Lending protocols

#### **Development**
- `dev.*.eth` - Development deployments
- `test.*.eth` - Test contracts
- `staging.*.eth` - Staging environment

---

## ✅ **7. Permissions & Fuses**

### NameWrapper Fuse System

#### Owner-Controlled Fuses
- **CANNOT_UNWRAP** (1) - Name cannot be unwrapped
- **CANNOT_BURN_FUSES** (2) - Fuses cannot be burned (made permanent)
- **CANNOT_TRANSFER** (4) - Name cannot be transferred
- **CANNOT_SET_RESOLVER** (8) - Resolver cannot be changed
- **CANNOT_SET_TTL** (16) - TTL cannot be modified
- **CANNOT_CREATE_SUBDOMAIN** (32) - Subdomains cannot be created
- **CANNOT_APPROVE** (64) - Approvals cannot be set

#### Parent-Controlled Fuses
- **PARENT_CANNOT_CONTROL** (65536) - Parent loses control (emancipation)
- **CAN_EXTEND_EXPIRY** (131072) - Parent can extend expiry

### Use Cases

#### **Immutable Contract Names**
```typescript
fuses: [
  'CANNOT_UNWRAP',
  'CANNOT_TRANSFER',
  'CANNOT_SET_RESOLVER',
  'PARENT_CANNOT_CONTROL'
]
```

#### **DAO-Controlled Names**
```typescript
fuses: [
  'CANNOT_UNWRAP',
  'CANNOT_BURN_FUSES',
  'PARENT_CANNOT_CONTROL'
]
// Allows DAO to modify while preventing unwrapping
```

#### **Temporary Subdomains**
```typescript
fuses: [
  'PARENT_CANNOT_CONTROL',
  'CAN_EXTEND_EXPIRY'
]
// Owner controls, parent can extend if needed
```

---

## ✅ **8. Template System**

### Naming Templates

#### **Pre-Configured Templates**
- Load instantly from template selector
- Auto-populate subdomain label
- Auto-select appropriate metadata schema
- Best practices baked in

#### **Template Categories**
1. **Application** - app, dapp
2. **Governance** - dao, gov
3. **Finance** - vault, treasury, token
4. **Infrastructure** - api, rpc, oracle
5. **Development** - dev, test, staging

#### **Custom Templates**
- Create your own naming patterns
- Save for reuse
- Share across organization

---

## 🔄 **Complete User Workflows**

### Workflow 1: Register New Contract

1. **Navigate** to "Register Contract"
2. **Enter** contract address and type
3. **Select** parent domain you own
4. **Choose** naming template or create custom
5. **Fill** metadata schema fields
6. **Review** all information
7. **Confirm** and sign transaction
8. **Done** - Name now resolves to contract!

### Workflow 2: Manage Existing Domain

1. **Navigate** to "Domain Management"
2. **Find** your domain (search or filter)
3. **Click** "View" to open profile
4. **Tabs Available**:
   - Overview - See all info
   - Metadata - Edit records
   - Subdomains - Create/manage
   - Security - Set fuses
   - Transfer - Change ownership
5. **Make Changes** as needed
6. **Save** - Transactions signed and confirmed

### Workflow 3: Create Subdomain

1. **Open** domain profile
2. **Navigate** to Subdomains tab
3. **Click** "Create Subdomain"
4. **Enter** subdomain label
5. **Set** owner address
6. **Select** fuses/permissions
7. **Create** - Subdomain is live!

### Workflow 4: Set Metadata Schema

1. **Open** domain profile
2. **Navigate** to Metadata tab
3. **Select** appropriate schema
4. **Fill** required fields
5. **Add** optional fields
6. **Save** - All records set at once!

---

## 📊 **Technical Architecture**

### State Management
- React hooks for local state
- Web3Provider context for wallet
- Real-time data from The Graph
- On-chain calls for write operations

### Data Flow
```
User Action
    ↓
Validation
    ↓
Wallet Sign Transaction
    ↓
Smart Contract Call
    ↓
Confirmation
    ↓
UI Update
```

### Error Handling
- User-friendly error messages
- Transaction failure recovery
- Input validation
- Network error handling

### Security
- No private key exposure
- User confirms all transactions
- Read-only by default
- Explicit user action for writes

---

## 🎯 **Production Checklist**

- [x] Wallet connection with MetaMask
- [x] Real ENS data loading from The Graph
- [x] Domain profile with full editing
- [x] Contract registration workflow
- [x] Metadata schema system
- [x] Subdomain creation
- [x] Fuse management
- [x] Transfer functionality
- [x] Template system
- [x] Hierarchy standards
- [x] Validation and error handling
- [x] Responsive design
- [x] Documentation

---

## 📚 **Standards Compliance**

### ENS Protocol
✅ Compatible with ENS Registry  
✅ Uses NameWrapper for advanced features  
✅ Follows ENS text record standards  
✅ Integrates with Public Resolver

### Naming Conventions
✅ Based on accessor-io/naming-convention-toolkit  
✅ Industry-standard subdomain patterns  
✅ Hierarchical organization  
✅ Semantic naming

### Metadata Standards
✅ Comprehensive schema system  
✅ Standard text record keys  
✅ Contract-specific fields  
✅ Validation and completeness

---

## 🚀 **Next Steps & Enhancements**

### Planned Features
- [ ] Batch operations (multiple domains at once)
- [ ] CSV import/export
- [ ] Advanced filtering and search
- [ ] Multi-chain support (L2s)
- [ ] Custom schema builder
- [ ] Automated renewals
- [ ] Notification system
- [ ] Team collaboration features

### Integration Opportunities
- [ ] Snapshot.org integration
- [ ] Safe (Gnosis) multisig integration
- [ ] Governor contract integration
- [ ] IPFS content hash management
- [ ] Automated ABI fetching from Etherscan

---

## 📖 **User Guide**

### For Developers
Use this system to:
- Register all your project's contracts to ENS
- Apply standardized metadata
- Organize contracts hierarchically
- Document contract purposes
- Make contracts discoverable

### For DAOs
Use this system to:
- Register governance contracts
- Document DAO structure
- Manage treasury addresses
- Create clear hierarchy
- Enable community discovery

### For Protocols
Use this system to:
- Register entire protocol suite
- Document all components
- Create intuitive naming
- Enable integrations
- Improve UX

---

**Status**: ✅ **PRODUCTION READY**  
**Last Updated**: 2025-10-22  
**Version**: 2.0  
**Compliance**: ENS Protocol + accessor-io/naming-convention-toolkit
