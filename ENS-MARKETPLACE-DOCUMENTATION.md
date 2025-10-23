# ENS Marketplace Documentation

## Overview

The ENS Marketplace is a specialized marketplace focused exclusively on ENS domain trading using OpenSea's Seaport protocol. This marketplace allows users to buy, sell, and make offers on ENS domains.

## Features

### Core Features

1. **Domain Listings**
   - Browse ENS domains available for purchase
   - View domain details including expiration dates
   - Filter and search domains by name
   - View seller information

2. **Domain Offers**
   - Make offers on ENS domains
   - View active offers from other buyers
   - Track offer status

3. **Domain Trading**
   - Buy domains directly from listings
   - List your own domains for sale
   - Complete transactions via Seaport

4. **Statistics**
   - Total domains registered
   - Currently listed domains
   - Floor price
   - Total trading volume
   - Average price
   - Total sales
   - Active offers

### ENS-Specific Features

1. **Domain Information**
   - Domain name display
   - Expiration date tracking
   - Registration date
   - Wrapped status
   - Fuses information
   - Resolver address
   - Resolved Ethereum address

2. **Domain Management**
   - Domain availability checking
   - Domain ownership verification
   - Domain transfer handling

## Architecture

### Service Layer

```
src/lib/services/
├── ens-marketplace-service.ts    # ENS-specific marketplace operations
├── seaport-service.ts             # Core Seaport protocol implementation
├── seaport-signer.ts              # Order signing utilities
├── seaport-advanced.ts            # Advanced features
└── seaport-error-handler.ts       # Error handling
```

### Component Layer

```
src/components/marketplace/
├── ENSMarketplace.tsx             # Main ENS marketplace UI
├── Marketplace.tsx                 # General marketplace (legacy)
└── index.ts                        # Component exports
```

## Usage

### Creating a Domain Listing

1. Click "List Domain" button
2. Enter domain name (e.g., "example.eth")
3. Enter price in ETH
4. Click "Create Listing"
5. Confirm transaction in wallet

### Making an Offer

1. Click "Make Offer" button
2. Enter domain name
3. Enter offer price in ETH
4. Click "Make Offer"
5. Confirm transaction in wallet

### Buying a Domain

1. Browse listings
2. Click "Buy" on desired domain
3. Approve marketplace if needed
4. Confirm purchase transaction
5. Domain transfers to your wallet

## Seaport Integration

The marketplace uses Seaport v1.5 for all domain trading operations:

- **Contract Address**: `0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC`
- **Supported Chains**: Ethereum Mainnet, Sepolia, Optimism, Base, Arbitrum
- **Order Types**: ERC721 listings and offers
- **Token Contract**: ENS Name Wrapper

## ENS Name Wrapper

All ENS domains are traded as ERC721 tokens through the ENS Name Wrapper:

- **Mainnet**: `0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401`
- **Sepolia**: `0x0635513f179D50A207757E05759CbD106d7dFcE8`

## Domain Trading Flow

### Listing Flow

1. User owns an ENS domain
2. User creates a listing order with domain and price
3. Order is signed with EIP-712
4. Order is posted to marketplace
5. Order appears in listings

### Purchase Flow

1. Buyer browses listings
2. Buyer selects a domain
3. Buyer approves marketplace if needed
4. Buyer fulfills the listing order
5. Domain transfers to buyer
6. Payment transfers to seller

### Offer Flow

1. Buyer creates an offer order with domain and price
2. Order is signed with EIP-712
3. Order is posted to marketplace
4. Seller accepts the offer
5. Domain transfers to buyer
6. Payment transfers to seller

## Error Handling

The marketplace includes error handling for:

- Insufficient balance
- Order expired
- Order already fulfilled
- Order cancelled
- Insufficient approval
- Network errors
- Transaction failures

All errors provide user-friendly messages and recovery suggestions.

## Security

### Order Security

- EIP-712 signature verification
- Nonce management prevents replay attacks
- Time validation ensures orders are valid
- On-chain order validation

### Transaction Security

- Balance checks before transactions
- Approval verification
- Gas estimation
- Transaction retry logic
- Error recovery

## API Integration

The marketplace integrates with:

- **OpenSea API v2**: For listing and offer data (primary source)
- **The Graph Subgraph**: For ENS domain data (fallback)
- **ENS Contracts**: For domain ownership and registration

### Data Sources

1. **OpenSea API**: Primary source for listings, offers, and statistics
   - Ensures real-time marketplace data
   - Includes actual listing prices
   - Shows active offers
   - Provides collection statistics

2. **The Graph Subgraph**: Fallback for ENS domain data
   - Fetches actual registered ENS domains
   - Shows domain ownership information
   - Displays expiration dates
   - Shows registration dates
   - Displays resolved addresses

3. **No Mock Data**: All placeholder data has been removed
   - All listings are from OpenSea or The Graph
   - All domain names are real ENS domains
   - Statistics are from actual marketplace data

## Multi-Chain Support

The marketplace supports:

- Ethereum Mainnet (Primary)
- Sepolia Testnet
- Optimism
- Base
- Arbitrum

Each chain uses its own ENS Name Wrapper address and Seaport contract.

## Testing

To test the ENS marketplace:

1. Start the development server: `npm run dev`
2. Navigate to the Marketplace view
3. Connect a wallet (MetaMask recommended)
4. Search for domains or browse listings
5. View actual ENS domains from The Graph
6. Make offers on domains
7. Create listings for your own domains

### What You'll See

- **Real ENS Domains**: All domains shown are actual registered ENS names
- **Actual Data**: Expiration dates, registration dates, owners, and resolved addresses are real
- **OpenSea Listings**: Domains with prices are actual listings from OpenSea
- **Available Domains**: Domains without prices are registered but not listed for sale
- **Live Statistics**: Market statistics come from OpenSea API

## Future Enhancements

Potential additions:

1. Domain expiration tracking
2. Domain renewal reminders
3. Bulk domain operations
4. Domain analytics
5. Historical price charts
6. Domain transfer history
7. Integration with ENS registrars
8. Custom domain configurations

## References

- [ENS Documentation](https://docs.ens.domains/)
- [Seaport Documentation](https://docs.opensea.io/reference/seaport-overview)
- [OpenSea API v2](https://docs.opensea.io/reference/overview)
- [ENS Name Wrapper](https://docs.ens.domains/contract-api-reference/name-wrapper)

## Files Created

- `src/lib/services/ens-marketplace-service.ts` - ENS marketplace service
- `src/components/marketplace/ENSMarketplace.tsx` - ENS marketplace UI
- `ENS-MARKETPLACE-DOCUMENTATION.md` - This documentation

## Summary

The ENS Marketplace provides a specialized trading platform exclusively for ENS domains. It leverages Seaport protocol for secure, decentralized trading while focusing on the unique needs of ENS domain owners and buyers.

