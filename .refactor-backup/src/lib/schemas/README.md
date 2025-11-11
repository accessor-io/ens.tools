# ENS Console Schema System

A system for defining, parsing, and managing ENS protocol actions using bracket notation syntax.

## Overview

The ENS Console Schema System provides:
- Schema definitions for all ENS protocol actions
- Bracket notation parser: `[value]@parameter` with `+/-` operators
- Template system for batch operations across multiple domains
- Export/build functionality for custom schemas

## Bracket Notation Syntax

### Basic Format

```
[operator]action: [value1]@parameter1@[value2]@parameter2
```

### Operators

- `+` - Add/create operation (e.g., `+mintSubdomain`, `+delegateTo`)
- `-` - Remove/delete operation (e.g., `-removeSubdomain`, `-removeDelegate`)
- `=` or no prefix - Set/update operation (e.g., `setText`, `setAddr`)

### Examples

```bash
# Create subdomain
+mintSubdomain: [app]@subname@[example.eth]@parent

# Set text record
setText: [example.eth]@domain@[description]@key = [My awesome domain]@value

# Remove delegate
-removeDelegate: [example.eth]@domain@[0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@delegate

# Delegate with permissions
+delegateTo: [example.eth]@domain = [0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb]@delegate@[7]@permissions
```

## Available Actions

### Domain Operations
- `transfer` - Transfer domain ownership
- `wrap` - Wrap domain in NameWrapper
- `unwrap` - Unwrap domain from NameWrapper
- `renew` - Renew domain registration

### Subdomain Operations
- `mintSubdomain` - Create subdomain
- `removeSubdomain` - Remove subdomain
- `transferSubdomain` - Transfer subdomain ownership

### Record Operations
- `setAddr` - Set address record (ETH or multi-chain)
- `setText` - Set text record (metadata)
- `removeText` - Remove text record
- `setContentHash` - Set content hash (IPFS, IPNS, etc.)
- `setTTL` - Set TTL
- `setABI` - Set ABI record
- `setPubkey` - Set public key
- `setZonehash` - Set DNS zone hash
- `setResolver` - Set resolver address

### Delegation Operations
- `delegateTo` - Add delegate with permissions
- `delegateAuthSelect` - Set delegate permissions using permission keys
- `removeDelegate` - Remove delegate
- `updateDelegate` - Update delegate permissions
- `lockDelegate` - Lock delegate (prevent removal)
- `unlockDelegate` - Unlock delegate
- `enableDelegate` - Enable disabled delegate
- `disableDelegate` - Disable delegate

### Wrapper Operations
- `setFuses` - Set permission fuses on wrapped domain

### Reverse Record Operations
- `setReverseRecord` - Set ENS name for an address

### Approval Operations
- `setApprovalForAll` - Approve/revoke operator for all domains

## Usage Examples

### Parse a Single Action

```typescript
import { parseAction, parseAndValidateAction } from './lib/schemas';

// Parse without validation
const parsed = parseAction('+mintSubdomain: [app]@subname@[example.eth]@parent');
console.log(parsed);
// {
//   action: 'mintSubdomain',
//   operator: '+',
//   parameters: {
//     subname: 'app',
//     parent: 'example.eth'
//   }
// }

// Parse with validation against schema
const validated = parseAndValidateAction('setText: [example.eth]@domain@[description]@key = [My domain]@value');
```

### Parse Multiple Actions

```typescript
import { parseActions, parseAndValidateActions } from './lib/schemas';

const actions = `
+mintSubdomain: [app]@subname@[example.eth]@parent
setText: [example.eth]@domain@[description]@key = [My domain]@value
+delegateTo: [example.eth]@domain = [0x742d...]@delegate@[7]@permissions
`;

const parsed = parseAndValidateActions(actions);
```

### Use Templates

```typescript
import { 
  getTemplate, 
  generateProfilesFromTemplate 
} from './lib/schemas';

// Get a template
const template = getTemplate('setup-new-domain');

// Generate profiles for multiple domains
const profiles = generateProfilesFromTemplate(
  template,
  ['example1.eth', 'example2.eth', 'example3.eth'],
  {
    'example1.eth': {
      address: '0x123...',
      description: 'Domain 1',
    },
    'example2.eth': {
      address: '0x456...',
      description: 'Domain 2',
    },
  }
);
```

### Export to Custom Schema

```typescript
import { 
  exportProfiles, 
  buildCustomSchema 
} from './lib/schemas';

// Export profiles to bracket notation
const exported = exportProfiles(profiles, { format: 'bracket' });
console.log(exported.content);

// Export to JSON
const jsonExport = exportProfiles(profiles, { 
  format: 'json',
  includeMetadata: true 
});

// Build custom schema
const schema = buildCustomSchema(parsedActions, true);
```

### Create Custom Template

```typescript
import { createTemplateFromActions } from './lib/schemas';

const actions = [
  parseAction('setText: [example.eth]@domain@[description]@key = [My domain]@value'),
  parseAction('setText: [example.eth]@domain@[url]@key = [https://example.com]@value'),
];

const template = createTemplateFromActions(
  'my-custom-template',
  'My Custom Template',
  'Description of template',
  'custom',
  actions
);
```

## Template Variables

Templates support variable placeholders using `{{variable}}` syntax:

```bash
setText: [{{domain}}]@domain@[{{key}}]@key = [{{value}}]@value
```

When generating profiles, variables are replaced with:
1. Domain-specific mappings (if provided)
2. Template default values
3. The domain name itself (for `{{domain}}`)

## Permission Keys

For delegation operations, use these permission keys:

- `MANAGE_SUBDOMAINS` - Create and manage subdomains
- `SET_ADDR_RECORD` - Set address records
- `SET_TEXT_RECORD` - Set text records
- `SET_CONTENT_HASH` - Set content hash
- `SET_PUBKEY` - Set public key
- `SET_ABI` - Set ABI
- `SET_ZONEHASH` - Set zone hash
- `SET_TTL` - Set TTL
- `SET_RESOLVER` - Set resolver
- `SET_OWNER` - Set owner
- `SET_FUSES` - Set fuses

Example:
```bash
delegateAuthSelect: [example.eth]@domain@[0x742d...]@delegate = [MANAGE_SUBDOMAINS,SET_TEXT_RECORD]@permissionKeys
```

## Export Formats

Supported export formats:

- `bracket` - Bracket notation (default)
- `json` - JSON format
- `yaml` - YAML format
- `csv` - CSV format

## Data Point Export

Each data point in a profile can be exported individually:

```typescript
import { exportDataPoint } from './lib/schemas';

const exported = exportDataPoint(
  'example.eth',
  'setText',
  { domain: 'example.eth', key: 'description', value: 'My domain' },
  '='
);
```

## Import from Custom Schema

```typescript
import { importFromCustomSchema } from './lib/schemas';

// From JSON schema
const jsonSchema = `{
  "actions": [
    {
      "action": "setText",
      "operator": "=",
      "parameters": {
        "domain": "example.eth",
        "key": "description",
        "value": "My domain"
      }
    }
  ]
}`;

const actions = importFromCustomSchema(jsonSchema);

// From bracket notation
const bracketSchema = `setText: [example.eth]@domain@[description]@key = [My domain]@value`;
const actions2 = importFromCustomSchema(bracketSchema);
```

## Complete Example

```typescript
import {
  parseAndValidateActions,
  generateProfilesFromTemplate,
  exportProfiles,
  getTemplate,
} from './lib/schemas';

// 1. Parse actions from bracket notation
const actionString = `
+mintSubdomain: [app]@subname@[example.eth]@parent = [0x742d...]@owner
setText: [example.eth]@domain@[description]@key = [My domain]@value
+delegateTo: [example.eth]@domain = [0x742d...]@delegate@[7]@permissions
`;

const actions = parseAndValidateActions(actionString);

// 2. Use template for batch operations
const template = getTemplate('setup-new-domain');
const profiles = generateProfilesFromTemplate(
  template,
  ['example1.eth', 'example2.eth'],
  {
    'example1.eth': { address: '0x123...' },
    'example2.eth': { address: '0x456...' },
  }
);

// 3. Export to custom schema
const exported = exportProfiles(profiles, {
  format: 'json',
  includeMetadata: true,
});

console.log(exported.content);
```

## File Structure

```
src/lib/schemas/
├── ens-console-schema.ts      # Schema definitions for all actions
├── ens-action-parser.ts        # Bracket notation parser
├── ens-action-template.ts      # Template system
├── ens-schema-exporter.ts      # Export/build utilities
├── index.ts                    # Main entry point
└── README.md                   # This file
```


