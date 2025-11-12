# ENS Delegation CLI Toolkit

Command-line interface for managing ENS naming delegations.

## Installation

```bash
cd cli
npm install
npm run build
```

## Configuration

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
RPC_URL=https://eth.llamarpc.com
PRIVATE_KEY=your_private_key_here
FACTORY_ADDRESS=0x...
DELEGATE_ADDRESS=0x...
GRANULAR_DELEGATE_ADDRESS=0x...
```

## Usage

### Factory Commands

```bash
# Create delegate contract for a project
ens-delegate factory create myproject.eth

# Get delegate contract address
ens-delegate factory get myproject.eth

# List all deployed delegates
ens-delegate factory list
```

### Basic Delegation Commands

```bash
# Set delegation
ens-delegate delegate set example.eth \
  --primary 0x123... \
  --secondary 0x456...

# Get delegation info
ens-delegate delegate get example.eth

# Revoke delegation
ens-delegate delegate revoke example.eth

# Check permissions
ens-delegate delegate check example.eth 0x123...

# Create subdomain via delegation
ens-delegate delegate create-subdomain example.eth app \
  --owner 0x789...
```

### Granular Delegation Commands

```bash
# Add delegate with specific permissions
ens-delegate granular add example.eth 0x123... \
  --operations 1 \
  --expires 1735689600

# Remove delegate
ens-delegate granular remove example.eth 0x123...

# Lock delegate (prevent removal)
ens-delegate granular lock example.eth 0x123...

# Unlock delegate
ens-delegate granular unlock example.eth 0x123...

# Enable delegate
ens-delegate granular enable example.eth 0x123...

# Disable delegate
ens-delegate granular disable example.eth 0x123...

# List all delegates
ens-delegate granular list example.eth

# Manage whitelist
ens-delegate granular whitelist example.eth add 0x123...
ens-delegate granular whitelist example.eth toggle

# Manage blacklist
ens-delegate granular blacklist example.eth add 0x456...
ens-delegate granular blacklist example.eth toggle
```

### Utility Commands

```bash
# Calculate namehash
ens-delegate utils namehash example.eth

# Normalize domain name
ens-delegate utils normalize Example.ETH

# Show operation bitmasks
ens-delegate utils operations
```

## Examples

### Complete Workflow

```bash
# 1. Create delegate contract for project
ens-delegate factory create techcorp.eth

# 2. Set delegation with primary and secondary
ens-delegate delegate set techcorp.eth \
  --primary 0xTechOpsMultisig \
  --secondary 0xTechOpsBackup

# 3. Check permissions
ens-delegate delegate check techcorp.eth 0xTechOpsMultisig

# 4. Create subdomain via delegation
ens-delegate delegate create-subdomain techcorp.eth products \
  --owner 0xProductContract

# 5. For products subdomain, add granular permissions
ens-delegate granular add products.techcorp.eth 0xDevOpsTeam \
  --operations 1 \
  --expires 0

# 6. Lock critical delegate
ens-delegate granular lock products.techcorp.eth 0xCTOWallet

# 7. List all delegates
ens-delegate granular list products.techcorp.eth
```

## Features

- Factory pattern support
- Basic delegation (primary/secondary)
- Granular delegation (unlimited delegates)
- Lock/unlock functionality
- Enable/disable delegates
- Whitelist/blacklist management
- Operation-specific permissions
- Expiration support
- Subdomain creation
- Permission checking
- Utility functions

## Requirements

- Node.js 18+
- Valid Ethereum private key
- Access to Ethereum RPC endpoint

## Security

**WARNING: Never commit your `.env` file with real private keys!**

The CLI toolkit requires private key access to sign transactions. Keep your private key secure.

## License

MIT


