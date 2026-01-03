#!/usr/bin/env node

/**
 * Documentation Generator Script
 * 
 * Generates documentation structure covering all aspects of the project:
 * - Functionality (processes, methods, functions)
 * - Conditions and results
 * - Help and suggestions
 * - Best practices
 * - Business logic
 * - Code usage
 * - Terminal usage
 * - API usage and endpoints
 * - Privacy policy
 * - User agreements
 * - Web3-provider disclosure
 * - Terms of agreement
 * - Usage policy
 * - Financial risk disclosure
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const PROJECT_ROOT = path.join(__dirname, '..');

// Ensure docs directory exists
if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}

// Helper function to read file if exists
function readFileIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return null;
  }
}

// Extract API routes from server/api/routes
function extractAPIRoutes() {
  const routesDir = path.join(PROJECT_ROOT, 'server', 'api', 'routes');
  const routes = [];
  
  if (fs.existsSync(routesDir)) {
    const files = fs.readdirSync(routesDir);
    files.forEach(file => {
      if (file.endsWith('.ts')) {
        const content = readFileIfExists(path.join(routesDir, file));
        if (content) {
          // Extract route definitions (basic pattern matching)
          const routeMatches = content.matchAll(/router\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/g);
          for (const match of routeMatches) {
            routes.push({
              method: match[1].toUpperCase(),
              path: match[2],
              file: file.replace('.ts', ''),
            });
          }
        }
      }
    });
  }
  
  return routes;
}

// Generate documentation files
const documentationFiles = {
  'PROJECT-OVERVIEW.md': `# Project Overview

## Introduction

ENS Tools is a platform for managing Ethereum Name Service (ENS) domains, providing tools for domain configuration, delegation, marketplace operations, and metadata management.

## Architecture

### Frontend
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **UI Library**: Radix UI components
- **State Management**: React hooks and context

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL
- **Caching**: Redis
- **Security**: Encryption service with per-user keys

### Key Components

#### Core Services
- ENS Domain Management
- Delegation System
- Marketplace Integration (OpenSea, Seaport)
- Metadata Management (ENSIP-19)
- Transaction Builder
- Audit Logging
- Fee Collection

#### Security Features
- Per-user encryption
- Admin authentication
- Audit logging
- Transaction tracking
- Rate limiting

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL
- **Cache**: Redis
- **Web3**: Viem, Ethereum
- **Marketplace**: OpenSea Seaport Protocol

## Project Structure

\`\`\`
config/
├── src/              # Frontend React application
├── server/           # Backend Express API
├── contracts/       # Smart contracts
├── docs/            # Documentation
└── scripts/         # Utility scripts
\`\`\`

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis (optional, for caching)
- Ethereum wallet (MetaMask, etc.)

### Installation

\`\`\`bash
npm install
cd server && npm install
\`\`\`

### Development

\`\`\`bash
# Frontend
npm run dev

# Backend
cd server
npm run dev
\`\`\`

## Environment Variables

See \`server/README.md\` for required environment variables.

## License

[Specify license]

## Contact

[Contact information]
`,

  'FUNCTIONALITY.md': `# Functionality Documentation

## Overview

This document describes all processes, methods, and functions available in the ENS Tools platform.

## Core Processes

### Domain Management

#### Domain Registration
- Process for registering new ENS domains
- Integration with ENS registry
- Renewal process

#### Domain Configuration
- Setting resolver addresses
- Configuring text records
- Setting address records (multi-chain)
- Content hash configuration
- TTL settings

#### Subdomain Management
- Creating subdomains
- Removing subdomains
- Transferring subdomains
- Batch subdomain operations

### Delegation System

#### Permission-Based Delegation
- Granular permission system
- Permission keys and bitmasks
- Delegate assignment
- Permission modification
- Delegate removal

#### Delegation Workflows
- Single domain delegation
- Batch delegation operations
- Permission inheritance
- Delegation verification

### Transaction Management

#### Transaction Building
- Single transaction creation
- Batch transaction building
- Transaction simulation
- Gas estimation
- Transaction signing and execution

#### Transaction Tracking
- Transaction status monitoring
- Transaction history
- Error handling and retry logic
- Audit trail

### Marketplace Operations

#### OpenSea Integration
- Listing creation
- Order fulfillment
- Offer management
- Collection management

#### Seaport Protocol
- Order creation
- Order validation
- Order fulfillment
- Batch operations

### Metadata Management

#### ENSIP-19 Implementation
- Metadata schema validation
- Hierarchical metadata
- Metadata templates
- Metadata export/import

#### Base Metadata
- Standard metadata fields
- Custom metadata fields
- Metadata versioning
- Metadata synchronization

## Methods and Functions

### Core Utilities

#### ENS Utilities
- \`getDomainInfo(domain: string)\` - Get domain information
- \`checkDomainAvailability(domain: string)\` - Check if domain is available
- \`getResolver(domain: string)\` - Get resolver address
- \`getAddress(domain: string, coinType?: number)\` - Get address record

#### Transaction Builder
- \`buildTransaction(operations: Operation[])\` - Build transaction
- \`buildBatchTransaction(operations: Operation[])\` - Build batch transaction
- \`executeTransaction(tx: Transaction)\` - Execute transaction
- \`simulateTransaction(tx: Transaction)\` - Simulate transaction

### Services

#### Delegation Service
- \`delegateTo(domain: string, delegate: Address, permissions: number)\`
- \`removeDelegate(domain: string, delegate: Address)\`
- \`getDelegates(domain: string)\`
- \`getPermissions(domain: string, delegate: Address)\`

#### Metadata Service
- \`getMetadata(domain: string)\`
- \`setMetadata(domain: string, metadata: Metadata)\`
- \`validateMetadata(metadata: Metadata)\`
- \`exportMetadata(domain: string)\`

#### Marketplace Service
- \`createListing(domain: string, price: BigNumber)\`
- \`fulfillOrder(orderId: string)\`
- \`getListings(domain?: string)\`
- \`cancelListing(listingId: string)\`

### API Functions

See API-REFERENCE.md for detailed API endpoint documentation.

## Action Schema System

The platform uses a bracket notation schema system for defining ENS actions:

\`\`\`
[operator]action: [value1]@parameter1@[value2]@parameter2
\`\`\`

### Operators
- \`+\` - Add/create operation
- \`-\` - Remove/delete operation
- \`=\` or no prefix - Set/update operation

### Examples

\`\`\`
# Create subdomain
+mintSubdomain: [app]@subname@[example.eth]@parent

# Set text record
setText: [example.eth]@domain@[description]@key = [My awesome domain]@value

# Delegate with permissions
+delegateTo: [example.eth]@domain = [0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@delegate@[7]@permissions
\`\`\`

## Workflows

### Complete Domain Setup
1. Register or select domain
2. Set resolver
3. Configure records (address, text, content hash)
4. Set up delegation (if needed)
5. Configure metadata
6. Verify configuration

### Delegation Setup
1. Identify domain and delegate address
2. Determine required permissions
3. Execute delegation transaction
4. Verify delegation
5. Test permissions

### Marketplace Listing
1. Select domain to list
2. Set price and terms
3. Create listing
4. Monitor offers
5. Fulfill order when accepted

## Integration Points

### Web3 Providers
- MetaMask
- WalletConnect
- Coinbase Wallet
- Other EIP-1193 compatible wallets

### External Services
- ENS Registry (Ethereum mainnet)
- OpenSea API
- Etherscan API
- IPFS (for content hashes)
`,

  'CONDITIONS-AND-RESULTS.md': `# Conditions and Results

## Overview

This document describes conditions, edge cases, validation rules, and expected results for all operations.

## Domain Operations

### Domain Registration

#### Conditions
- Domain must be available (not already registered)
- Sufficient ETH balance for registration fee
- Valid domain format (RFC 1035 compliant)
- Minimum length: 3 characters (for .eth TLD)
- Maximum length: 253 characters total

#### Results
- **Success**: Domain registered, ownership assigned, registration receipt
- **Failure**: Error message indicating reason (domain taken, insufficient funds, invalid format)

#### Edge Cases
- Domain expires during registration process
- Network congestion causing transaction delays
- Invalid characters in domain name
- Domain already owned by caller

### Domain Transfer

#### Conditions
- Caller must be domain owner
- Recipient address must be valid (not zero address)
- Domain must not be locked or have transfer restrictions
- Sufficient gas for transaction

#### Results
- **Success**: Ownership transferred, event emitted, confirmation
- **Failure**: Error with specific reason (not owner, invalid recipient, restrictions)

#### Edge Cases
- Transfer to contract address
- Transfer during pending transaction
- Transfer of wrapped domain

### Subdomain Creation

#### Conditions
- Parent domain must be owned by caller (or have delegation)
- Subdomain name must be valid
- Subdomain must not already exist
- Sufficient gas for transaction

#### Results
- **Success**: Subdomain created, ownership assigned
- **Failure**: Error indicating reason (not authorized, already exists, invalid name)

#### Edge Cases
- Creating subdomain of subdomain
- Batch subdomain creation limits
- Subdomain name conflicts

## Delegation Operations

### Adding Delegate

#### Conditions
- Caller must be domain owner
- Delegate address must be valid
- Permissions must be valid bitmask
- Domain must support delegation

#### Results
- **Success**: Delegate added, permissions set, event emitted
- **Failure**: Error with reason (not owner, invalid delegate, invalid permissions)

#### Edge Cases
- Adding same delegate twice (updates permissions)
- Delegating to zero address
- Permission conflicts

### Removing Delegate

#### Conditions
- Caller must be domain owner
- Delegate must exist
- No active operations requiring delegate

#### Results
- **Success**: Delegate removed, permissions revoked
- **Failure**: Error indicating reason

#### Edge Cases
- Removing non-existent delegate
- Removing delegate with active operations

## Record Operations

### Setting Address Record

#### Conditions
- Caller must be owner or authorized delegate
- Domain must have resolver set
- Address must be valid (not zero for ETH)
- Coin type must be valid (if specified)

#### Results
- **Success**: Address record set, resolver updated
- **Failure**: Error with specific reason

#### Edge Cases
- Setting zero address (removes record)
- Multi-chain address conflicts
- Resolver not set

### Setting Text Record

#### Conditions
- Caller must be owner or authorized delegate
- Domain must have resolver set
- Key must be valid string
- Value must be valid (length limits may apply)

#### Results
- **Success**: Text record set
- **Failure**: Error indicating reason

#### Edge Cases
- Empty value (removes record)
- Key length limits
- Special character handling

## Transaction Operations

### Transaction Building

#### Conditions
- All operations must be valid
- Sufficient gas estimation available
- No conflicting operations in batch
- Valid chain ID

#### Results
- **Success**: Transaction built, gas estimated, ready for signing
- **Failure**: Error with invalid operations listed

#### Edge Cases
- Empty operation list
- Conflicting operations (e.g., set and remove same record)
- Gas estimation failures

### Transaction Execution

#### Conditions
- Transaction must be signed
- Sufficient ETH for gas
- Network connection active
- No nonce conflicts

#### Results
- **Success**: Transaction hash returned, status tracked
- **Failure**: Error with reason (insufficient funds, network error, rejected)

#### Edge Cases
- Transaction timeout
- Network reorg
- Gas price fluctuations

## Marketplace Operations

### Creating Listing

#### Conditions
- Domain must be owned by caller
- Price must be valid (greater than zero)
- Domain must not already be listed
- Valid marketplace contract

#### Results
- **Success**: Listing created, order ID returned
- **Failure**: Error with reason

#### Edge Cases
- Listing during transfer
- Price below minimum
- Marketplace contract paused

### Fulfilling Order

#### Conditions
- Order must be valid and active
- Caller must have sufficient funds
- Order must not be expired
- Domain must still be owned by seller

#### Results
- **Success**: Order fulfilled, domain transferred, payment processed
- **Failure**: Error indicating reason

#### Edge Cases
- Order expired during fulfillment
- Domain transferred before fulfillment
- Insufficient allowance

## Validation Rules

### Domain Name Validation
- Must match RFC 1035
- No leading/trailing dots
- No consecutive dots
- Valid characters only (a-z, 0-9, hyphen)
- Case-insensitive (normalized to lowercase)

### Address Validation
- Must be valid Ethereum address format
- Checksum validation (optional but recommended)
- Not zero address (for required fields)

### Permission Validation
- Must be valid bitmask
- Must not exceed maximum permissions
- Must include required base permissions

## Error Handling

### Error Types
- **ValidationError**: Invalid input parameters
- **AuthorizationError**: Insufficient permissions
- **NetworkError**: Blockchain network issues
- **TransactionError**: Transaction execution failures
- **BusinessLogicError**: Business rule violations

### Error Response Format
\`\`\`json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
\`\`\`

## Status Codes

### Transaction Status
- \`pending\` - Transaction submitted, awaiting confirmation
- \`confirmed\` - Transaction confirmed on blockchain
- \`failed\` - Transaction failed
- \`reverted\` - Transaction reverted

### Domain Status
- \`available\` - Domain can be registered
- \`registered\` - Domain is registered
- \`expired\` - Domain registration expired
- \`grace_period\` - Domain in grace period
- \`premium\` - Domain has premium pricing
`,

  'HELP-AND-SUGGESTIONS.md': `# Help and Suggestions

## Getting Help

### Documentation
- Check this documentation for detailed information
- Review API-REFERENCE.md for API usage
- See CODE-USAGE.md for code examples
- Check BEST-PRACTICES.md for recommended approaches

### Support Channels
- [GitHub Issues](link-to-issues) - Report bugs and request features
- [Discord/Slack](link) - Community support
- [Email Support](email) - Direct support inquiries

### Common Questions

#### How do I register a domain?
1. Check domain availability
2. Ensure sufficient ETH balance
3. Execute registration transaction
4. Wait for confirmation

#### How do I set up delegation?
1. Identify the domain and delegate address
2. Determine required permissions
3. Use delegation interface or API
4. Verify delegation was successful

#### How do I list a domain for sale?
1. Navigate to marketplace
2. Select domain to list
3. Set price and terms
4. Create listing
5. Monitor offers

#### How do I configure metadata?
1. Access domain configuration
2. Navigate to metadata section
3. Fill in metadata fields
4. Validate and save

## Suggestions

### Performance Optimization

#### Transaction Batching
- Batch multiple operations into single transaction when possible
- Reduces gas costs
- Improves user experience
- Use transaction builder for optimal batching

#### Caching
- Cache domain information when appropriate
- Use Redis for server-side caching
- Implement client-side caching for frequently accessed data

#### Network Optimization
- Use appropriate gas prices
- Monitor network congestion
- Consider transaction timing

### Security Best Practices

#### Wallet Security
- Use hardware wallets for large operations
- Never share private keys
- Verify transaction details before signing
- Use multi-signature wallets for important domains

#### Access Control
- Implement proper delegation
- Regularly review delegate permissions
- Remove unused delegates
- Use minimum required permissions

#### Data Protection
- Encrypt sensitive data
- Use secure connections (HTTPS)
- Implement proper authentication
- Regular security audits

### User Experience

#### Interface Design
- Provide clear feedback for all operations
- Show transaction status clearly
- Display estimated costs upfront
- Offer transaction preview before execution

#### Error Messages
- Provide clear, actionable error messages
- Include suggested solutions
- Link to relevant documentation
- Offer support contact information

#### Workflow Optimization
- Streamline common operations
- Provide templates for frequent tasks
- Offer guided workflows
- Save user preferences

### Development Suggestions

#### Code Organization
- Follow established patterns
- Use TypeScript for type safety
- Implement proper error handling
- Write tests for critical paths

#### API Design
- Use RESTful conventions
- Provide clear documentation
- Include examples in documentation
- Version APIs appropriately

#### Testing
- Write unit tests
- Implement integration tests
- Test error cases
- Test edge cases

## Troubleshooting

### Common Issues

#### Transaction Stuck
- Check network status
- Verify gas price
- Check nonce conflicts
- Consider transaction replacement

#### Domain Not Found
- Verify domain spelling
- Check if domain exists
- Verify network (mainnet vs testnet)
- Check resolver configuration

#### Permission Denied
- Verify ownership
- Check delegate permissions
- Verify transaction signer
- Check domain restrictions

#### API Errors
- Verify authentication
- Check rate limits
- Verify request format
- Check server status

### Debugging Tips

#### Enable Logging
- Enable debug logging in development
- Check browser console
- Review server logs
- Use transaction explorers

#### Network Inspection
- Use Etherscan to verify transactions
- Check ENS registry directly
- Verify resolver configuration
- Check event logs

#### Transaction Analysis
- Use transaction simulators
- Check gas estimation
- Verify call data
- Review transaction history

## Feature Requests

### Suggested Enhancements
- [List feature requests]
- [Community suggestions]
- [Roadmap items]

### Contributing
- See CONTRIBUTING.md for guidelines
- Submit pull requests
- Report issues
- Join discussions
`,

  'BEST-PRACTICES.md': `# Best Practices

## Overview

This document outlines best practices for using ENS Tools effectively and securely.

## Domain Management

### Domain Naming
- Use descriptive, memorable names
- Avoid special characters when possible
- Keep names concise but meaningful
- Consider brand consistency
- Check for trademark conflicts

### Domain Configuration
- Set resolver early in setup process
- Configure all necessary records at once
- Use batch operations for efficiency
- Verify configuration after changes
- Document configuration decisions

### Record Management
- Use standard record keys when possible
- Keep text records concise
- Set appropriate TTL values
- Update records regularly
- Remove unused records

## Delegation

### Permission Management
- Grant minimum required permissions
- Use specific permissions, not full access
- Document delegation decisions
- Regularly audit delegate permissions
- Remove unused delegates promptly

### Delegate Selection
- Only delegate to trusted addresses
- Verify delegate addresses carefully
- Use multi-signature for important domains
- Consider time-limited delegations
- Monitor delegate activity

### Permission Design
- Plan permission structure before delegation
- Use permission bitmasks efficiently
- Group related permissions
- Document permission meanings
- Test permissions before production use

## Transaction Management

### Gas Optimization
- Batch operations when possible
- Use appropriate gas prices
- Monitor network conditions
- Consider transaction timing
- Estimate gas before execution

### Transaction Safety
- Always review transaction details
- Verify recipient addresses
- Check transaction amounts
- Use transaction simulation
- Confirm on blockchain before proceeding

### Error Handling
- Implement proper error handling
- Provide user feedback
- Log errors for debugging
- Retry failed transactions when appropriate
- Handle network errors gracefully

## Security

### Wallet Management
- Use hardware wallets for important operations
- Never share private keys
- Use strong passwords
- Enable two-factor authentication when available
- Regularly update wallet software

### Access Control
- Implement proper authentication
- Use secure session management
- Implement rate limiting
- Monitor for suspicious activity
- Regular security audits

### Data Protection
- Encrypt sensitive data
- Use secure connections
- Implement proper backup procedures
- Protect against data loss
- Regular data validation

## API Usage

### Authentication
- Use secure authentication methods
- Rotate API keys regularly
- Implement proper authorization
- Use HTTPS for all API calls
- Validate all inputs

### Rate Limiting
- Respect rate limits
- Implement client-side rate limiting
- Use exponential backoff
- Cache responses when appropriate
- Monitor API usage

### Error Handling
- Handle all error cases
- Provide meaningful error messages
- Implement retry logic
- Log errors appropriately
- Monitor API health

## Code Development

### TypeScript Usage
- Use strict type checking
- Define proper interfaces
- Avoid \`any\` types
- Use type guards
- Leverage TypeScript features

### Code Organization
- Follow project structure
- Use consistent naming
- Implement proper separation of concerns
- Write reusable code
- Document complex logic

### Testing
- Write tests for all features
- Test edge cases
- Test error conditions
- Maintain test coverage
- Use appropriate testing tools

## Performance

### Frontend Optimization
- Optimize bundle size
- Use code splitting
- Implement lazy loading
- Optimize images and assets
- Use appropriate caching strategies

### Backend Optimization
- Optimize database queries
- Use connection pooling
- Implement caching
- Monitor performance metrics
- Optimize API responses

### Network Optimization
- Minimize API calls
- Use batch operations
- Implement request queuing
- Monitor network usage
- Optimize payload sizes

## Documentation

### Code Documentation
- Document all public APIs
- Include usage examples
- Document parameters and return values
- Explain complex logic
- Keep documentation updated

### User Documentation
- Provide clear instructions
- Include examples
- Document common workflows
- Explain error messages
- Keep documentation current

## Monitoring and Maintenance

### Monitoring
- Monitor application health
- Track error rates
- Monitor performance metrics
- Set up alerts
- Regular health checks

### Maintenance
- Regular dependency updates
- Security patches
- Performance optimization
- Code refactoring
- Documentation updates
`,

  'BUSINESS-LOGIC.md': `# Business Logic

## Overview

This document describes the business rules, logic, and decision-making processes within ENS Tools.

## Domain Registration

### Pricing Logic
- Base registration fee determined by ENS protocol
- Premium pricing for short or desirable names
- Renewal fees may differ from initial registration
- Pricing updates based on market conditions

### Registration Rules
- Minimum registration period: 1 year
- Maximum registration period: Varies by TLD
- Grace period after expiration
- Auction process for expired domains

### Ownership Rules
- First-come-first-served for available domains
- Ownership transfer requires explicit transaction
- Wrapped domains have additional restrictions
- Subdomain ownership inherits from parent

## Delegation System

### Permission Model
- Granular permission system
- Permissions represented as bitmasks
- Base permissions required for operations
- Permission inheritance rules

### Delegation Rules
- Owner can delegate to any address
- Delegates can have limited permissions
- Delegation can be revoked by owner
- Delegation does not transfer ownership

### Permission Calculation
- Permissions combined using bitwise OR
- Specific permissions checked using bitwise AND
- Permission validation before operations
- Permission inheritance from parent domains

## Fee Collection

### Fee Structure
- Transaction fees for operations
- Marketplace fees for sales
- Premium service fees (if applicable)
- Gas costs passed to user

### Fee Calculation
- Base fee + percentage for marketplace
- Gas estimation for transactions
- Fee collection before operation
- Refund logic for failed operations

### Payment Processing
- ETH payments for fees
- USDC payments (if supported)
- Payment verification
- Receipt generation

## Marketplace

### Listing Rules
- Owner must approve listing
- Minimum listing duration
- Maximum listing duration
- Price validation rules

### Order Fulfillment
- Order validation before fulfillment
- Payment verification
- Domain transfer on fulfillment
- Fee distribution

### Offer Management
- Offer expiration rules
- Counter-offer logic
- Offer acceptance rules
- Offer cancellation rules

## Metadata Management

### Metadata Validation
- Schema validation required
- Required fields enforcement
- Optional fields handling
- Version compatibility

### Metadata Storage
- On-chain storage for critical data
- Off-chain storage for large data
- IPFS integration
- Synchronization rules

## Transaction Processing

### Transaction Validation
- Signature verification
- Nonce validation
- Gas estimation
- Balance verification

### Transaction Execution
- Sequential execution for dependencies
- Parallel execution when possible
- Failure handling
- Rollback logic

### Batch Processing
- Operation grouping
- Gas optimization
- Dependency resolution
- Error handling

## Access Control

### Authentication
- Wallet-based authentication
- Signature verification
- Session management
- Token expiration

### Authorization
- Ownership verification
- Permission checking
- Delegate validation
- Role-based access

## Audit and Compliance

### Audit Logging
- All operations logged
- User identification
- Timestamp recording
- Operation details

### Compliance Rules
- KYC requirements (if applicable)
- AML checks (if applicable)
- Regulatory compliance
- Data retention policies

## Error Handling

### Error Classification
- Validation errors
- Authorization errors
- Network errors
- Business logic errors

### Error Recovery
- Retry logic
- Fallback mechanisms
- User notification
- Error logging

## Business Rules Summary

### Domain Operations
- Owner has full control
- Delegates have limited control based on permissions
- Operations require appropriate authorization
- All operations are logged

### Financial Operations
- Fees collected before operations
- Refunds for failed operations
- Payment verification required
- Receipts generated

### Marketplace Operations
- Owner approval required
- Payment verification required
- Domain transfer on fulfillment
- Fees distributed appropriately
`,

  'CODE-USAGE.md': `# Code Usage

## Overview

This document provides code examples and usage patterns for ENS Tools.

## Installation

\`\`\`bash
npm install
\`\`\`

## Basic Usage

### Importing Modules

\`\`\`typescript
import { ENSClient } from '@/lib/ens';
import { DelegationService } from '@/lib/services';
import { parseAction } from '@/lib/schemas';
\`\`\`

### Domain Operations

#### Get Domain Info
\`\`\`typescript
import { getDomainInfo } from '@/lib/ens';

const domainInfo = await getDomainInfo('example.eth');
console.log(domainInfo);
\`\`\`

#### Set Address Record
\`\`\`typescript
import { setAddress } from '@/lib/ens/ens-write-operations';

await setAddress({
  domain: 'example.eth',
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  publicClient,
  walletClient,
});
\`\`\`

#### Set Text Record
\`\`\`typescript
import { setText } from '@/lib/ens/ens-write-operations';

await setText({
  domain: 'example.eth',
  key: 'description',
  value: 'My awesome domain',
  publicClient,
  walletClient,
});
\`\`\`

### Delegation

#### Add Delegate
\`\`\`typescript
import { delegateTo } from '@/lib/delegation';

await delegateTo({
  domain: 'example.eth',
  delegate: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  permissions: 7, // Full permissions
  publicClient,
  walletClient,
});
\`\`\`

#### Remove Delegate
\`\`\`typescript
import { removeDelegate } from '@/lib/delegation';

await removeDelegate({
  domain: 'example.eth',
  delegate: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  publicClient,
  walletClient,
});
\`\`\`

### Transaction Building

#### Build Single Transaction
\`\`\`typescript
import { TransactionBuilder } from '@/lib/ens/transaction-builder';

const builder = new TransactionBuilder(publicClient, walletClient);
builder.setAddress('example.eth', '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
builder.setText('example.eth', 'description', 'My domain');

const hashes = await builder.execute();
\`\`\`

#### Build Batch Transaction
\`\`\`typescript
import { buildBatchTransaction } from '@/lib/schemas/ens-batch-builder';

const actions = [
  'setText: [example.eth]@domain@[description]@key = [My domain]@value',
  'setAddr: [example.eth]@domain = [0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@address',
];

const batchResult = await buildBatchTransaction(actions, chainId);
\`\`\`

### Action Schema

#### Parse Actions
\`\`\`typescript
import { parseAction, parseActions } from '@/lib/schemas';

// Single action
const action = parseAction('setText: [example.eth]@domain@[description]@key = [My domain]@value');

// Multiple actions
const actions = parseActions(\`
  setText: [example.eth]@domain@[description]@key = [My domain]@value
  setAddr: [example.eth]@domain = [0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@address
\`);
\`\`\`

#### Execute Actions
\`\`\`typescript
import { executeActionsFromString } from '@/lib/schemas';

const result = await executeActionsFromString(
  'setText: [example.eth]@domain@[description]@key = [My domain]@value',
  {
    publicClient,
    walletClient,
    actor: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  }
);
\`\`\`

### Metadata Management

#### Get Metadata
\`\`\`typescript
import { getMetadata } from '@/lib/services/base-metadata-service';

const metadata = await getMetadata('example.eth');
\`\`\`

#### Set Metadata
\`\`\`typescript
import { setMetadata } from '@/lib/services/base-metadata-service';

await setMetadata('example.eth', {
  name: 'Example Domain',
  description: 'My awesome domain',
  // ... other fields
});
\`\`\`

### Marketplace

#### Create Listing
\`\`\`typescript
import { createListing } from '@/lib/services/ens-marketplace-service';

const listing = await createListing({
  domain: 'example.eth',
  price: parseEther('1.0'),
});
\`\`\`

#### Fulfill Order
\`\`\`typescript
import { fulfillOrder } from '@/lib/services/ens-marketplace-service';

await fulfillOrder({
  orderId: 'order-id',
  publicClient,
  walletClient,
});
\`\`\`

## React Hooks

### Use Transaction Manager
\`\`\`typescript
import { useTransactionManager } from '@/lib/hooks/useTransactionManager';

function MyComponent() {
  const { executeTransaction, status, error } = useTransactionManager();

  const handleExecute = async () => {
    await executeTransaction({
      // transaction config
    });
  };

  return (
    <button onClick={handleExecute}>
      Execute Transaction
    </button>
  );
}
\`\`\`

### Use Domain Context
\`\`\`typescript
import { useDomainContext } from '@/lib/contexts/DomainContext';

function MyComponent() {
  const { domain, domainInfo, loading, error } = useDomainContext('example.eth');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{domainInfo?.name}</div>;
}
\`\`\`

## Error Handling

### Try-Catch Pattern
\`\`\`typescript
try {
  await setAddress({
    domain: 'example.eth',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    publicClient,
    walletClient,
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation error:', error.message);
  } else if (error instanceof AuthorizationError) {
    console.error('Authorization error:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
\`\`\`

### Error Types
\`\`\`typescript
import {
  ValidationError,
  AuthorizationError,
  NetworkError,
  TransactionError,
} from '@/lib/utils/error-handler';

// Handle specific error types
if (error instanceof ValidationError) {
  // Handle validation error
}
\`\`\`

## Advanced Patterns

### Batch Operations
\`\`\`typescript
const builder = new TransactionBuilder(publicClient, walletClient);

// Add multiple operations
builder.setAddress('example.eth', address1);
builder.setText('example.eth', 'key1', 'value1');
builder.setText('example.eth', 'key2', 'value2');
builder.setAddress('sub.example.eth', address2);

// Execute all at once
const hashes = await builder.execute();
\`\`\`

### Template Usage
\`\`\`typescript
import { generateProfilesFromTemplate } from '@/lib/schemas';

const template = \`
  setText: [{{domain}}]@domain@[description]@key = [{{description}}]@value
  setAddr: [{{domain}}]@domain = [{{address}}]@address
\`;

const profiles = generateProfilesFromTemplate(template, [
  { domain: 'example.eth', description: 'Example', address: '0x...' },
  { domain: 'test.eth', description: 'Test', address: '0x...' },
]);
\`\`\`

## Testing

### Unit Tests
\`\`\`typescript
import { describe, it, expect } from 'vitest';
import { parseAction } from '@/lib/schemas';

describe('parseAction', () => {
  it('should parse simple action', () => {
    const action = parseAction('setText: [example.eth]@domain@[key]@key = [value]@value');
    expect(action.action).toBe('setText');
  });
});
\`\`\`

## Type Definitions

### Common Types
\`\`\`typescript
interface DomainInfo {
  name: string;
  owner: Address;
  resolver?: Address;
  expiry?: Date;
}

interface ParsedAction {
  action: string;
  operator: ActionOperator;
  parameters: Record<string, string>;
  raw: string;
}
\`\`\`
`,

  'TERMINAL-USAGE.md': `# Terminal Usage

## Overview

This document describes terminal/CLI commands and usage for ENS Tools.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Access to project directory

## Development Commands

### Installation
\`\`\`bash
# Install dependencies
npm install

# Install server dependencies
cd server && npm install
\`\`\`

### Development Server
\`\`\`bash
# Start frontend development server
npm run dev

# Start backend server (in server directory)
cd server
npm run dev
\`\`\`

### Building
\`\`\`bash
# Build frontend for production
npm run build

# Build output will be in build/ directory
\`\`\`

### Testing
\`\`\`bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests in watch mode
npm test -- --watch
\`\`\`

## Database Commands

### Migrations
\`\`\`bash
# Run database migrations (if migration tool configured)
# Example with specific tool:
npm run db:migrate

# Rollback migration
npm run db:rollback
\`\`\`

### Database Access
\`\`\`bash
# Connect to PostgreSQL (if configured)
psql $DATABASE_URL

# Or using connection string directly
psql postgresql://user:password@localhost:5432/dbname
\`\`\`

## Scripts

### Utility Scripts
\`\`\`bash
# Run specific script
node scripts/script-name.js

# With arguments
node scripts/script-name.js arg1 arg2
\`\`\`

### Environment Setup
\`\`\`bash
# Set environment variables
export DATABASE_URL="postgresql://..."
export MASTER_ENCRYPTION_KEY="..."

# Or use .env file
cp .env.example .env
# Edit .env with your values
\`\`\`

## Server Management

### Start Server
\`\`\`bash
cd server
npm start

# Or with environment variables
NODE_ENV=production npm start
\`\`\`

### Server Health Check
\`\`\`bash
# Check server health
curl http://localhost:3001/health

# Expected response:
# {"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
\`\`\`

## Logging

### View Logs
\`\`\`bash
# If using process manager
pm2 logs

# Or direct output
npm run dev 2>&1 | tee logs/dev.log
\`\`\`

## Docker (if applicable)

### Docker Commands
\`\`\`bash
# Build Docker image
docker build -t ens-tools .

# Run container
docker run -p 3001:3001 ens-tools

# Run with environment file
docker run --env-file .env -p 3001:3001 ens-tools
\`\`\`

## Git Operations

### Common Git Commands
\`\`\`bash
# Clone repository
git clone <repository-url>
cd config

# Create branch
git checkout -b feature/new-feature

# Commit changes
git add .
git commit -m "Description of changes"

# Push to remote
git push origin feature/new-feature
\`\`\`

## Package Management

### Update Dependencies
\`\`\`bash
# Check for outdated packages
npm outdated

# Update packages
npm update

# Update specific package
npm update package-name

# Install latest version
npm install package-name@latest
\`\`\`

### Clean Install
\`\`\`bash
# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Same for server
cd server
rm -rf node_modules package-lock.json
npm install
\`\`\`

## Troubleshooting

### Port Already in Use
\`\`\`bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>

# Or on Linux
fuser -k 3001/tcp
\`\`\`

### Permission Issues
\`\`\`bash
# Fix npm permissions (if needed)
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
\`\`\`

### Clear Cache
\`\`\`bash
# Clear npm cache
npm cache clean --force

# Clear build cache
rm -rf build/
rm -rf .vite/
\`\`\`

## Production Deployment

### Build for Production
\`\`\`bash
# Build frontend
npm run build

# The build output should be served by a web server
# or deployed to a hosting service
\`\`\`

### Environment Variables
\`\`\`bash
# Set production environment variables
export NODE_ENV=production
export DATABASE_URL="..."
export MASTER_ENCRYPTION_KEY="..."
export FRONTEND_URL="https://your-domain.com"
export PORT=3001
\`\`\`

## Monitoring

### Process Monitoring
\`\`\`bash
# Using pm2 (if installed)
pm2 start npm --name "ens-tools" -- start
pm2 status
pm2 logs ens-tools
pm2 monit
\`\`\`

## Notes

- Always check environment variables before running commands
- Use appropriate Node.js version (check .nvmrc if present)
- Ensure database is running before starting server
- Check firewall settings for production deployment
`,

  'API-REFERENCE.md': `# API Reference

## Overview

This document provides reference documentation for all API endpoints in ENS Tools.

## Base URL

\`\`\`
http://localhost:3001/api
\`\`\`

Production: [Production URL]

## Authentication

Most endpoints require authentication. Authentication is done via wallet signature.

### Authentication Flow
1. User signs message with wallet
2. Send signature to \`/api/auth/login\`
3. Receive session token
4. Include token in subsequent requests

### Headers
\`\`\`
Authorization: Bearer <token>
Content-Type: application/json
\`\`\`

## Rate Limiting

- IP-based: 100 requests per 15 minutes
- User-based: 200 requests per 15 minutes (authenticated)

## Endpoints

${(() => {
  const routes = extractAPIRoutes();
  if (routes.length === 0) {
    return '### API routes will be auto-detected from codebase';
  }
  
  const grouped = {};
  routes.forEach(route => {
    if (!grouped[route.file]) {
      grouped[route.file] = [];
    }
    grouped[route.file].push(route);
  });
  
  let output = '';
  Object.entries(grouped).forEach(([file, fileRoutes]) => {
    output += `### ${file.charAt(0).toUpperCase() + file.slice(1)} Routes\n\n`;
    fileRoutes.forEach(route => {
      output += `#### ${route.method} /api/${route.file}${route.path}\n\n`;
      output += `Description: [To be documented]\n\n`;
      output += `**Request:**\n\`\`\`json\n{}\n\`\`\`\n\n`;
      output += `**Response:**\n\`\`\`json\n{}\n\`\`\`\n\n`;
    });
  });
  return output;
})()}

## Common Response Formats

### Success Response
\`\`\`json
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
\`\`\`

### Error Response
\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": {}
  }
}
\`\`\`

## Error Codes

- \`VALIDATION_ERROR\` - Invalid input parameters
- \`AUTHORIZATION_ERROR\` - Insufficient permissions
- \`NOT_FOUND\` - Resource not found
- \`RATE_LIMIT_EXCEEDED\` - Too many requests
- \`NETWORK_ERROR\` - Blockchain network error
- \`TRANSACTION_ERROR\` - Transaction execution error

## Examples

### Using cURL
\`\`\`bash
# Health check
curl http://localhost:3001/health

# Authenticated request
curl -H "Authorization: Bearer <token>" \\
     -H "Content-Type: application/json" \\
     http://localhost:3001/api/domains/example.eth
\`\`\`

### Using JavaScript/TypeScript
\`\`\`typescript
const response = await fetch('http://localhost:3001/api/domains/example.eth', {
  headers: {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
\`\`\`

## WebSocket (if applicable)

[WebSocket documentation if WebSocket endpoints exist]

## Versioning

API versioning information if applicable.

## Changelog

[API changelog and version history]
`,

  'PRIVACY-POLICY.md': `# Privacy Policy

## Last Updated

[Date]

## Introduction

This Privacy Policy describes how ENS Tools ("we", "our", or "us") collects, uses, and protects your information when you use our services.

## Information We Collect

### Information You Provide
- Wallet addresses
- Domain names and configurations
- Transaction data
- User preferences and settings

### Automatically Collected Information
- Transaction history
- Usage patterns
- Error logs
- Performance metrics

### Blockchain Information
- Public blockchain data
- Transaction hashes
- Smart contract interactions
- ENS registry data

## How We Use Information

### Service Provision
- Process transactions
- Manage domain configurations
- Provide marketplace services
- Deliver requested services

### Improvement
- Analyze usage patterns
- Improve user experience
- Fix bugs and issues
- Develop new features

### Security
- Prevent fraud
- Detect security threats
- Enforce terms of service
- Protect user accounts

## Information Sharing

### We Do Not Sell Your Data
We do not sell, trade, or rent your personal information to third parties.

### Service Providers
We may share information with:
- Infrastructure providers
- Analytics services
- Security services
- Payment processors (if applicable)

### Legal Requirements
We may disclose information when required by law or to:
- Comply with legal obligations
- Protect our rights
- Prevent fraud or abuse
- Ensure user safety

## Data Security

### Encryption
- Data encrypted in transit (HTTPS)
- Sensitive data encrypted at rest
- Per-user encryption keys
- Secure key management

### Access Controls
- Limited access to user data
- Authentication required
- Audit logging
- Regular security audits

## Your Rights

### Access
You have the right to access your personal information.

### Correction
You can correct inaccurate information.

### Deletion
You can request deletion of your data (subject to legal requirements).

### Portability
You can request a copy of your data.

## Data Retention

We retain data for as long as necessary to:
- Provide services
- Comply with legal obligations
- Resolve disputes
- Enforce agreements

## Children's Privacy

Our services are not intended for users under 18 years of age.

## International Users

Data may be processed and stored outside your country of residence.

## Changes to Privacy Policy

We may update this policy. Changes will be posted with updated "Last Updated" date.

## Contact

For privacy concerns, contact: [Contact Information]

## Compliance

- GDPR (if applicable)
- CCPA (if applicable)
- Other applicable privacy laws
`,

  'USER-AGREEMENTS.md': `# User Agreements

## Terms of Service

### Acceptance
By using ENS Tools, you agree to these terms of service.

### Eligibility
- Must be 18 years or older
- Must have legal capacity to enter contracts
- Must comply with applicable laws
- Must not be prohibited from using services

### Account Responsibility
- You are responsible for account security
- You must protect wallet credentials
- You are liable for account activities
- You must report unauthorized access

### Prohibited Activities
- Illegal activities
- Fraud or deception
- Violation of others' rights
- Interference with services
- Reverse engineering
- Unauthorized access

### Service Availability
- Services provided "as is"
- No guarantee of uninterrupted service
- We reserve right to modify services
- We may suspend accounts for violations

### Intellectual Property
- We own platform intellectual property
- You retain rights to your content
- You grant license for service provision
- Respect others' intellectual property

### Limitation of Liability
- Services provided without warranties
- We are not liable for indirect damages
- Liability limited to fees paid
- Some jurisdictions may not allow limitations

### Indemnification
You agree to indemnify us against claims arising from:
- Your use of services
- Your violation of terms
- Your violation of laws
- Your infringement of rights

### Dispute Resolution
- Governing law: [Jurisdiction]
- Dispute resolution process
- Arbitration clause (if applicable)
- Class action waiver (if applicable)

### Changes to Terms
We may modify terms. Continued use constitutes acceptance.

### Termination
- We may terminate accounts for violations
- You may terminate your account
- Termination does not affect accrued rights

## User Responsibilities

### Wallet Security
- Protect private keys
- Use secure wallets
- Enable security features
- Regular security updates

### Transaction Verification
- Verify transaction details
- Check recipient addresses
- Confirm amounts
- Review gas costs

### Compliance
- Comply with applicable laws
- Pay required taxes
- Respect others' rights
- Follow platform rules

## Platform Rules

### Acceptable Use
- Use services as intended
- Respect other users
- Provide accurate information
- Report issues promptly

### Content Guidelines
- No illegal content
- No harmful content
- No spam or abuse
- Respect intellectual property

### Marketplace Rules
- Accurate listings
- Fair pricing
- Honest descriptions
- Timely fulfillment

## Enforcement

### Violations
Violations may result in:
- Warnings
- Account suspension
- Account termination
- Legal action

### Appeals
Process for appealing enforcement actions.

## Contact

For questions about user agreements: [Contact Information]
`,

  'WEB3-PROVIDER-DISCLOSURE.md': `# Web3 Provider Disclosure

## Overview

ENS Tools integrates with various Web3 providers to enable blockchain interactions. This document discloses important information about Web3 provider usage.

## Supported Providers

### MetaMask
- Browser extension wallet
- Mobile app available
- EIP-1193 compatible
- Most widely used

### WalletConnect
- Cross-platform wallet connection
- QR code connection
- Multiple wallet support
- Mobile-friendly

### Coinbase Wallet
- Coinbase integration
- Browser extension
- Mobile app
- EIP-1193 compatible

### Other EIP-1193 Wallets
- Any wallet implementing EIP-1193
- Standard interface
- Cross-compatibility

## Provider Integration

### Connection Process
1. User initiates wallet connection
2. Provider prompts for connection approval
3. Connection established
4. Account information retrieved

### Transaction Signing
1. Transaction created by application
2. Transaction sent to provider
3. User reviews and approves
4. Transaction signed and broadcast

### Provider Limitations
- Provider availability depends on user's wallet
- Transaction approval required from user
- Provider may impose rate limits
- Network connectivity required

## Security Considerations

### Private Key Management
- Private keys never leave user's wallet
- We do not have access to private keys
- Transactions require user approval
- User responsible for key security

### Transaction Security
- All transactions require user approval
- Transaction details displayed for review
- User can reject transactions
- No automatic transaction execution

### Network Security
- Connection to blockchain networks
- Network selection by user
- Mainnet and testnet support
- Network switching capabilities

## Provider Responsibilities

### User Responsibilities
- Secure wallet installation
- Protect private keys
- Verify transaction details
- Keep wallet software updated

### Our Responsibilities
- Provide secure integration
- Display accurate transaction information
- Handle errors gracefully
- Respect user privacy

## Risks

### Provider Risks
- Provider software vulnerabilities
- Provider service outages
- Network connectivity issues
- Transaction delays

### User Risks
- Private key compromise
- Phishing attacks
- Malicious transactions
- Network congestion

## Best Practices

### For Users
- Use reputable wallet providers
- Keep wallet software updated
- Verify transaction details
- Use hardware wallets for large amounts
- Be cautious of phishing attempts

### For Developers
- Implement proper error handling
- Display clear transaction information
- Provide transaction previews
- Handle provider disconnections
- Test with multiple providers

## Provider Updates

### Compatibility
- We strive to maintain compatibility
- Provider updates may affect integration
- We monitor provider changes
- Updates implemented as needed

### Breaking Changes
- Provider breaking changes communicated
- Migration guides provided
- Support for legacy versions (when possible)

## Support

### Provider Issues
- Contact provider support for wallet issues
- We can assist with integration issues
- Report bugs to both provider and us

### Documentation
- Provider-specific documentation
- Integration guides
- Troubleshooting resources

## Disclaimer

- We are not affiliated with wallet providers
- Provider terms apply to wallet usage
- We are not responsible for provider actions
- Users must review provider terms

## Contact

For Web3 provider questions: [Contact Information]
`,

  'TERMS-OF-AGREEMENT.md': `# Terms of Agreement

## Effective Date

[Date]

## Parties

This agreement is between:
- **Service Provider**: ENS Tools
- **User**: Individual or entity using the services

## Definitions

### Services
ENS Tools platform providing ENS domain management, delegation, marketplace, and related services.

### User
Any individual or entity accessing or using the services.

### Content
Any information, data, text, or other materials provided by users.

## Service Description

### Services Provided
- ENS domain management
- Domain configuration tools
- Delegation system
- Marketplace services
- Metadata management
- Transaction building and execution

### Service Limitations
- Services depend on blockchain network availability
- Transaction success depends on network conditions
- Some features may require additional fees
- Services subject to blockchain protocol rules

## User Obligations

### Account Security
- Maintain account security
- Protect authentication credentials
- Report security breaches
- Use secure connection methods

### Compliance
- Comply with applicable laws
- Respect intellectual property rights
- Prohibit illegal activities
- Follow platform guidelines

### Accurate Information
- Provide accurate information
- Update information as needed
- Verify transaction details
- Report errors promptly

## Service Provider Obligations

### Service Availability
- Strive for service availability
- Provide reasonable support
- Maintain security measures
- Protect user data

### Transparency
- Clear fee disclosure
- Transparent transaction processes
- Honest service descriptions
- Regular communication

## Fees and Payments

### Fee Structure
- Transaction fees disclosed upfront
- Marketplace fees clearly stated
- Gas costs passed to users
- No hidden fees

### Payment Terms
- Payment required before service
- Refunds for failed operations (when applicable)
- Payment methods accepted
- Currency accepted

## Intellectual Property

### Platform IP
- We own platform intellectual property
- Trademarks and copyrights protected
- License granted for service use
- No transfer of ownership

### User Content
- Users retain content ownership
- License granted for service provision
- User responsible for content legality
- Respect for others' IP rights

## Limitation of Liability

### Service Limitations
- Services provided "as is"
- No warranties expressed or implied
- No guarantee of results
- User assumes risks

### Liability Limits
- Not liable for indirect damages
- Not liable for lost profits
- Liability limited to fees paid
- Some jurisdictions may not allow limits

## Indemnification

User agrees to indemnify service provider against:
- Claims arising from user's use
- User's violation of terms
- User's violation of laws
- User's infringement of rights

## Termination

### By User
- User may terminate account
- Termination process available
- Data handling upon termination

### By Service Provider
- May terminate for violations
- May suspend for investigation
- Notice provided when possible
- Appeal process available

## Dispute Resolution

### Governing Law
[Jurisdiction and applicable law]

### Resolution Process
- Good faith negotiation
- Mediation (if applicable)
- Arbitration (if applicable)
- Court proceedings (if applicable)

## Modifications

### Terms Modifications
- We may modify terms
- Notice of changes provided
- Continued use constitutes acceptance
- Material changes may require re-acceptance

### Service Modifications
- We may modify services
- Features may be added or removed
- Notice provided when possible
- No guarantee of feature availability

## Severability

If any provision is invalid, remaining provisions remain in effect.

## Entire Agreement

This agreement constitutes the entire agreement between parties.

## Contact

For questions about terms: [Contact Information]

## Acknowledgment

By using services, user acknowledges:
- Reading and understanding terms
- Agreement to be bound by terms
- Legal capacity to enter agreement
- Acceptance of risks
`,

  'USAGE-POLICY.md': `# Usage Policy

## Overview

This document outlines acceptable use policies for ENS Tools platform.

## Acceptable Use

### Permitted Uses
- Legitimate domain management
- Legal business activities
- Personal domain management
- Educational purposes
- Development and testing

### Prohibited Uses

#### Illegal Activities
- Any illegal activities
- Money laundering
- Fraud or deception
- Violation of laws
- Criminal activities

#### Abuse and Harassment
- Harassment of users
- Threats or intimidation
- Hate speech
- Discrimination
- Bullying

#### System Abuse
- Attempting to break security
- Unauthorized access
- Denial of service attacks
- Exploiting vulnerabilities
- Reverse engineering (beyond permitted scope)

#### Spam and Misinformation
- Spam or unsolicited messages
- False information
- Misleading content
- Phishing attempts
- Scam activities

#### Intellectual Property Violations
- Copyright infringement
- Trademark violations
- Patent violations
- Trade secret violations
- Unauthorized use of content

## Content Guidelines

### Domain Names
- Must comply with ENS rules
- Must not infringe on trademarks
- Must not be offensive or harmful
- Must comply with applicable laws

### Listings and Descriptions
- Accurate descriptions
- Honest pricing
- No false claims
- No misleading information

### User-Generated Content
- Respectful language
- No harmful content
- No illegal content
- Compliance with guidelines

## Marketplace Usage

### Seller Responsibilities
- Accurate listings
- Honest descriptions
- Fair pricing
- Timely fulfillment
- Customer service

### Buyer Responsibilities
- Legitimate purchases
- Timely payment
- Respectful communication
- Honest reviews

### Prohibited Items
- Illegal domains
- Stolen domains
- Domains used for illegal purposes
- Domains violating rights

## Enforcement

### Violation Consequences
- Warnings
- Content removal
- Account suspension
- Account termination
- Legal action (if applicable)

### Reporting Violations
- Report mechanism available
- Investigation process
- Response timeline
- Appeal process

### Appeal Process
- How to appeal
- Timeline for appeals
- Review process
- Final decisions

## Rate Limits

### API Rate Limits
- IP-based limits
- User-based limits
- Endpoint-specific limits
- Exceeding limits may result in temporary restrictions

### Usage Monitoring
- We monitor usage patterns
- Unusual activity investigated
- Automated systems may flag activity
- Manual review when needed

## Data Usage

### Permitted Data Use
- Service provision
- Improvement of services
- Security and fraud prevention
- Legal compliance

### Prohibited Data Use
- Selling user data
- Sharing with unauthorized parties
- Using for unrelated purposes
- Violating privacy rights

## Security Requirements

### User Security
- Strong authentication
- Secure connections
- Regular updates
- Security best practices

### Platform Security
- Security measures in place
- Regular security audits
- Incident response
- User notification of breaches

## Compliance

### Legal Compliance
- Compliance with applicable laws
- Respect for regulations
- International compliance
- Jurisdiction-specific requirements

### Industry Standards
- Following best practices
- Industry standards compliance
- Regular updates
- Continuous improvement

## Updates to Policy

### Policy Changes
- We may update policy
- Notice of changes
- Effective date
- Continued use constitutes acceptance

## Contact

For questions about usage policy: [Contact Information]

## Acknowledgment

By using services, users acknowledge:
- Reading and understanding policy
- Agreement to comply with policy
- Understanding consequences of violations
- Responsibility for their actions
`,

  'FINANCIAL-RISK-DISCLOSURE.md': `# Financial Risk Disclosure

## Important Notice

**This document contains important information about financial risks associated with using ENS Tools. Please read carefully.**

## General Risk Warning

Cryptocurrency and blockchain transactions involve substantial risk. You should carefully consider whether trading or using blockchain services is suitable for you in light of your circumstances, knowledge, and financial resources.

## Specific Risks

### Blockchain Network Risks

#### Network Congestion
- Transactions may be delayed during network congestion
- Delays may affect transaction execution
- Gas prices may increase significantly
- Transaction may fail if gas is insufficient

#### Network Forks
- Blockchain networks may fork
- Forks may affect transaction validity
- Network splits may occur
- Resolution may take time

#### Network Failures
- Blockchain networks may experience outages
- Network upgrades may cause disruptions
- Smart contract bugs may affect functionality
- Network attacks may occur

### Transaction Risks

#### Transaction Failures
- Transactions may fail for various reasons
- Failed transactions still consume gas
- No guarantee of transaction success
- Network conditions affect success rates

#### Transaction Delays
- Transactions may be delayed
- Delays may affect timing-sensitive operations
- No control over network processing
- Delays may result in missed opportunities

#### Gas Costs
- Gas costs are variable
- Gas costs may be significant
- Gas estimation may be inaccurate
- High gas costs may make operations uneconomical

### Smart Contract Risks

#### Smart Contract Bugs
- Smart contracts may contain bugs
- Bugs may result in loss of funds
- No guarantee of bug-free code
- Audits do not guarantee security

#### Smart Contract Upgrades
- Smart contracts may be upgraded
- Upgrades may affect functionality
- No guarantee of backward compatibility
- Changes may not be reversible

#### Smart Contract Interactions
- Interactions with smart contracts carry risk
- Unexpected behavior may occur
- Complex interactions increase risk
- Third-party contracts may have vulnerabilities

### Market Risks

#### Price Volatility
- Cryptocurrency prices are volatile
- Prices may change rapidly
- No guarantee of price stability
- Losses may be significant

#### Liquidity Risks
- Markets may lack liquidity
- Low liquidity may affect pricing
- Large transactions may move markets
- Liquidity may disappear suddenly

### Regulatory Risks

#### Regulatory Changes
- Regulations may change
- Changes may affect service availability
- Compliance requirements may increase
- Services may be restricted or prohibited

#### Jurisdictional Risks
- Different jurisdictions have different rules
- Services may not be available in all jurisdictions
- Legal status may be unclear
- Enforcement actions may occur

### Technology Risks

#### Software Bugs
- Software may contain bugs
- Bugs may result in losses
- No guarantee of bug-free software
- Updates may introduce new bugs

#### Security Vulnerabilities
- Security vulnerabilities may exist
- Vulnerabilities may be exploited
- No system is completely secure
- Attacks may result in losses

#### Third-Party Risks
- Dependence on third-party services
- Third parties may fail
- Third parties may have vulnerabilities
- Limited control over third parties

### Operational Risks

#### Service Availability
- Services may be unavailable
- Outages may occur
- Maintenance may cause disruptions
- No guarantee of uptime

#### Human Error
- Human error may occur
- Errors may result in losses
- No guarantee of error-free operation
- Training and procedures may not prevent all errors

## Risk Mitigation

### Best Practices
- Use hardware wallets for large amounts
- Verify all transaction details
- Start with small amounts
- Understand what you're doing
- Keep software updated
- Use secure connections
- Backup important data

### Limitations
- Risk mitigation does not eliminate risk
- Some risks cannot be mitigated
- Unexpected events may occur
- No guarantee of loss prevention

## No Investment Advice

### Not Financial Advice
- Information provided is not financial advice
- We do not provide investment recommendations
- You should consult financial advisors
- You are responsible for your decisions

### No Guarantees
- No guarantee of profits
- No guarantee of results
- Past performance does not guarantee future results
- All investments carry risk

## Losses

### Potential for Loss
- You may lose all invested funds
- Losses may be significant
- No insurance or protection
- You bear all losses

### No Recourse
- Limited recourse for losses
- Blockchain transactions are irreversible
- No refunds for failed transactions (except gas refunds)
- Legal recourse may be limited

## Acknowledgment

By using ENS Tools, you acknowledge:
- Understanding of risks
- Acceptance of risks
- Ability to bear losses
- Not relying on guarantees
- Responsibility for decisions

## Consultation

### Professional Advice
- Consult financial advisors
- Consult legal advisors
- Consult tax advisors
- Understand applicable laws

### Due Diligence
- Research before using
- Understand how services work
- Review all documentation
- Ask questions if unclear

## Updates

This disclosure may be updated. Continued use constitutes acceptance of updated disclosure.

## Contact

For questions about risks: [Contact Information]

## Legal Disclaimer

This disclosure is for informational purposes only and does not constitute legal, financial, or investment advice.
`,

  'LEGAL-COMPLIANCE.md': `# Legal Compliance

## Overview

This document outlines legal compliance information for ENS Tools.

## Regulatory Compliance

### Applicable Regulations
- [List applicable regulations]
- GDPR (if applicable)
- CCPA (if applicable)
- Financial regulations (if applicable)
- Data protection laws

### Compliance Measures
- Regular compliance reviews
- Legal consultation
- Policy updates
- Training programs

## Data Protection

### GDPR Compliance (if applicable)
- Lawful basis for processing
- Data subject rights
- Data protection officer
- Breach notification procedures

### CCPA Compliance (if applicable)
- Consumer rights
- Disclosure requirements
- Opt-out mechanisms
- Non-discrimination

### Other Jurisdictions
- Jurisdiction-specific requirements
- Local data protection laws
- Cross-border data transfer
- Compliance monitoring

## Financial Regulations

### Money Transmission (if applicable)
- Licensing requirements
- Reporting obligations
- Compliance procedures
- Regulatory updates

### Anti-Money Laundering (AML)
- AML policies and procedures
- Transaction monitoring
- Suspicious activity reporting
- Customer due diligence

### Know Your Customer (KYC)
- KYC requirements (if applicable)
- Identity verification
- Documentation requirements
- Ongoing monitoring

## Intellectual Property

### Trademarks
- Trademark protection
- Proper usage guidelines
- Infringement prevention
- Enforcement procedures

### Copyrights
- Copyright protection
- License compliance
- Fair use considerations
- DMCA procedures (if applicable)

### Patents
- Patent considerations
- Patent searches
- Infringement avoidance
- Legal consultation

## Terms and Agreements

### Terms of Service
- Clear terms
- User acceptance
- Regular updates
- Legal review

### Privacy Policy
- Privacy disclosures
- Data handling
- User rights
- Regular updates

### User Agreements
- Clear agreements
- Enforceability
- Regular review
- Legal compliance

## Dispute Resolution

### Jurisdiction
- Governing law
- Jurisdiction selection
- Conflict of laws
- International considerations

### Resolution Mechanisms
- Negotiation
- Mediation
- Arbitration
- Litigation

## Reporting and Disclosure

### Regulatory Reporting
- Required reports
- Reporting timelines
- Documentation
- Compliance verification

### Public Disclosures
- Required disclosures
- Transparency requirements
- User notifications
- Public communications

## Compliance Monitoring

### Internal Monitoring
- Regular audits
- Compliance checks
- Risk assessments
- Issue identification

### External Monitoring
- Regulatory updates
- Industry changes
- Legal developments
- Compliance consulting

## Training and Education

### Staff Training
- Compliance training
- Regular updates
- Certification requirements
- Knowledge assessment

### User Education
- User guidelines
- Educational materials
- Best practices
- Risk awareness

## Incident Response

### Security Incidents
- Incident response plan
- Notification procedures
- Investigation process
- Remediation steps

### Legal Incidents
- Legal response procedures
- Attorney consultation
- Documentation
- Resolution process

## Updates and Changes

### Regulatory Changes
- Monitoring regulatory changes
- Updating policies
- Implementing changes
- User notification

### Policy Updates
- Regular policy review
- Legal review
- User notification
- Effective dates

## Contact

For legal compliance questions: [Contact Information]

## Legal Disclaimer

This document provides general information and does not constitute legal advice. Consult with legal professionals for specific legal questions.
`
};

// Generate all documentation files
console.log('Generating documentation structure...\n');

Object.entries(documentationFiles).forEach(([filename, content]) => {
  const filePath = path.join(DOCS_DIR, filename);
  
  // Check if file already exists
  if (fs.existsSync(filePath)) {
    console.log(`[SKIP] ${filename} already exists, skipping...`);
    return;
  }
  
  // Write file
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`[OK] Created ${filename}`);
});

// Create documentation index
const indexContent = `# Documentation Index

## Overview

This directory contains documentation for ENS Tools covering all aspects of functionality, usage, legal, and compliance information.

## Documentation Files

### Technical Documentation
- [PROJECT-OVERVIEW.md](./PROJECT-OVERVIEW.md) - Project overview and architecture
- [FUNCTIONALITY.md](./FUNCTIONALITY.md) - Processes, methods, and functions
- [CONDITIONS-AND-RESULTS.md](./CONDITIONS-AND-RESULTS.md) - Conditions, edge cases, and results
- [CODE-USAGE.md](./CODE-USAGE.md) - Code examples and usage patterns
- [API-REFERENCE.md](./API-REFERENCE.md) - API endpoints and usage
- [TERMINAL-USAGE.md](./TERMINAL-USAGE.md) - Terminal/CLI commands

### User Documentation
- [HELP-AND-SUGGESTIONS.md](./HELP-AND-SUGGESTIONS.md) - Help and suggestions
- [BEST-PRACTICES.md](./BEST-PRACTICES.md) - Best practices
- [BUSINESS-LOGIC.md](./BUSINESS-LOGIC.md) - Business rules and logic

### Legal and Compliance
- [PRIVACY-POLICY.md](./PRIVACY-POLICY.md) - Privacy policy
- [USER-AGREEMENTS.md](./USER-AGREEMENTS.md) - User agreements
- [TERMS-OF-AGREEMENT.md](./TERMS-OF-AGREEMENT.md) - Terms of service
- [USAGE-POLICY.md](./USAGE-POLICY.md) - Usage policy
- [WEB3-PROVIDER-DISCLOSURE.md](./WEB3-PROVIDER-DISCLOSURE.md) - Web3 provider disclosures
- [FINANCIAL-RISK-DISCLOSURE.md](./FINANCIAL-RISK-DISCLOSURE.md) - Financial risk disclosures
- [LEGAL-COMPLIANCE.md](./LEGAL-COMPLIANCE.md) - Legal compliance information

## Quick Links

### Getting Started
1. Read [PROJECT-OVERVIEW.md](./PROJECT-OVERVIEW.md)
2. Review [FUNCTIONALITY.md](./FUNCTIONALITY.md)
3. Check [CODE-USAGE.md](./CODE-USAGE.md) for examples

### For Developers
- [API-REFERENCE.md](./API-REFERENCE.md)
- [CODE-USAGE.md](./CODE-USAGE.md)
- [TERMINAL-USAGE.md](./TERMINAL-USAGE.md)
- [BEST-PRACTICES.md](./BEST-PRACTICES.md)

### For Users
- [HELP-AND-SUGGESTIONS.md](./HELP-AND-SUGGESTIONS.md)
- [BEST-PRACTICES.md](./BEST-PRACTICES.md)
- [USER-AGREEMENTS.md](./USER-AGREEMENTS.md)

### Legal Information
- [PRIVACY-POLICY.md](./PRIVACY-POLICY.md)
- [TERMS-OF-AGREEMENT.md](./TERMS-OF-AGREEMENT.md)
- [FINANCIAL-RISK-DISCLOSURE.md](./FINANCIAL-RISK-DISCLOSURE.md)

## Documentation Status

All documentation files are templates that should be reviewed and customized for your specific project needs.

## Last Updated

${new Date().toISOString().split('T')[0]}
`;

const indexPath = path.join(DOCS_DIR, 'DOCUMENTATION-INDEX.md');
if (!fs.existsSync(indexPath)) {
  fs.writeFileSync(indexPath, indexContent, 'utf-8');
  console.log(`[OK] Created DOCUMENTATION-INDEX.md`);
}

console.log('\n[SUCCESS] Documentation structure generated successfully!');
console.log(`\nDocumentation files created in: ${DOCS_DIR}`);
console.log('\nNext steps:');
console.log('   1. Review and customize each documentation file');
console.log('   2. Fill in project-specific information');
console.log('   3. Update legal sections with actual policies');
console.log('   4. Add code examples specific to your implementation');
console.log('   5. Review API endpoints and update API-REFERENCE.md');
