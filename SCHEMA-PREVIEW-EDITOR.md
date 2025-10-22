# ENSIP-19 Schema Preview & Editor

Advanced schema preview and editing component for ENS domains compliance with ENSIP-19 specification.

## Features

### Compliance Scoring
- Real-time ENS compliance score calculation (0-100)
- Compliance level assessment (excellent, good, acceptable, poor, non-compliant)
- Breakdown of validation against 6 QA standards:
  - Schema Validation (20 points)
  - Canonical ID Grammar (20 points)
  - Category Classification (15 points)
  - Security Standards (15 points)
  - Lifecycle Management (10 points)
  - Version Format (10 points)

### Validation
- Full ENSIP-19 JSON Schema validation using AJV
- Custom validation rules
- Real-time error and warning display
- Field-level validation feedback

### Dual View Modes
1. **Form Mode**: Structured editing with categorized tabs
   - Basic fields (ID, org, protocol, category, role, version, chainId)
   - Addresses (multi-chain support)
   - Security (upgradeability, owners, audits)
   - Lifecycle (status, replacedBy)
   - Advanced (standards, tags, artifacts)

2. **JSON Mode**: Raw JSON preview and editing
   - Syntax highlighting
   - Pretty-printed format
   - Direct JSON manipulation

### Import/Export
- Export metadata as JSON file
- Import existing metadata from JSON
- Copy to clipboard
- Download for backup

## Usage

```tsx
import { SchemaPreviewEditor } from './components/SchemaPreviewEditor';

function MyComponent() {
  const handleSave = (metadata: ENSIP19Metadata) => {
    console.log('Saved metadata:', metadata);
    // Save to resolver, IPFS, or database
  };

  return (
    <SchemaPreviewEditor
      domain="uniswap.defi.cns.eth"
      initialMetadata={{
        id: "uniswap.uniswap-v3.defi.governor.v1-0-0.1",
        org: "uniswap",
        protocol: "uniswap-v3",
        category: "defi",
        role: "governor",
        version: "v1-0-0",
        chainId: 1,
        addresses: [
          { chainId: 1, address: "0x..." }
        ]
      }}
      onSave={handleSave}
      readOnly={false}
    />
  );
}
```

## Props

- `domain?: string` - Domain name for reference
- `initialMetadata?: Partial<ENSIP19Metadata>` - Initial metadata object
- `onSave?: (metadata: ENSIP19Metadata) => void` - Callback when saving
- `readOnly?: boolean` - Disable editing mode

## Validation Standards

### Standard 1: Schema Validation
Validates against complete ENSIP-19 JSON Schema specification.

### Standard 2: Canonical ID Grammar
Ensures ID follows pattern: `org.protocol.category.role[.variant].version.chainId`

### Standard 3: Category Classification
Validates category is from approved list: defi, dao, l2, infra, token, nft, gaming, social, identity, privacy, security, wallet, analytics, rwa, supply, health, finance, dev, art

### Standard 5: Security Standards
Recommends security audits, owner specification, and upgradeability documentation.

### Standard 6: Lifecycle Management
Validates lifecycle status and recommends deprecated contract replacements.

### Standard 10: Version Format
Ensures version follows pattern: `v{num}`, `v{num}-{num}`, or `v{num}-{num}-{num}`

## Integration Examples

### With Domain Registration
```tsx
import { SchemaPreviewEditor } from './components/SchemaPreviewEditor';
import { useWeb3 } from './lib/web3-provider';

function ContractRegistration() {
  const { publicClient } = useWeb3();
  const [metadata, setMetadata] = useState({});

  const handleSave = async (ensMetadata: ENSIP19Metadata) => {
    // Calculate metadata hash
    const hash = await calculateMetadataHash(ensMetadata);
    
    // Save to ENS resolver
    await updateTextRecord(
      'eth.contract.metadata',
      JSON.stringify(ensMetadata)
    );
    
    // Register subdomain
    await registerSubdomain(
      ensMetadata.id,
      ensMetadata.ensRoot
    );
  };

  return (
    <SchemaPreviewEditor
      onSave={handleSave}
      initialMetadata={metadata}
    />
  );
}
```

### With Compliance Checking
```tsx
function ComplianceChecker() {
  const [score, setScore] = useState(0);

  return (
    <SchemaPreviewEditor
      onMetadataChange={(metadata) => {
        const result = QAValidator.calculateComplianceScore(metadata);
        setScore(result.score);
      }}
    />
  );
}
```

## File Structure

```
src/
├── components/
│   └── SchemaPreviewEditor.tsx       # Main component
├── lib/
│   ├── ensip19-schema.json            # JSON Schema definition
│   ├── ensip19-validator.ts           # Validation logic
│   └── ensip19-utils.ts               # Helper functions
```

## Dependencies

- React
- shadcn/ui components
- AJV for JSON Schema validation
- ENSIP-19 specification

## Testing

Run validation tests:
```bash
npm test SchemaPreviewEditor
```

## License

MIT

