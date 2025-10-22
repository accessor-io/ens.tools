# Tooling Organization

## New Structure

### Components by Feature Domain

```
src/components/
├── ui/                     # UI primitives (shadcn/ui)
├── workflows/              # Workflow components
│   ├── PreflightChecker.tsx
│   ├── UnifiedContractRegistration.tsx
│   ├── ContractRegistration.tsx
│   └── ENSIP19Registration.tsx
├── domains/                # Domain management
│   ├── DomainManagement.tsx
│   └── DomainProfile.tsx
├── registry/               # Contract registry
│   ├── ContractRegistry.tsx
│   ├── DAORegistry.tsx
│   ├── ENSContractsRegistry.tsx
│   └── IntegrationRegistry.tsx
├── metadata/               # Metadata editing
│   ├── MetadataEditor.tsx
│   ├── MetadataTools.tsx
│   ├── SchemaPreviewEditor.tsx
│   └── SchemaPreviewView.tsx
├── security/               # Security & monitoring
│   ├── SecurityMonitor.tsx
│   ├── AuditLog.tsx
│   └── AuditLogTray.tsx
├── governance/             # Governance
│   └── GovernancePanel.tsx
└── reference/              # Documentation/reference
    ├── ProtocolReference.tsx
    ├── ProtocolSection.tsx
    ├── BestPractices.tsx
    ├── BestPracticesView.tsx
    └── NamingToolkit.tsx
```

### Library by Feature Domain

```
src/lib/
├── ens/                    # ENS core operations
│   ├── ens-write-operations.ts
│   ├── ens-helpers.ts
│   ├── ens-utils.ts
│   ├── ens-contracts.ts
│   ├── ens-addresses.ts
│   ├── ens-status-indicators.ts
│   └── transfer-domain.ts
├── delegation/             # Delegation & permissions
│   ├── permission-service.ts
│   ├── delegation-planner.ts
│   ├── safe-transaction-bundler.ts
│   └── post-verification-service.ts
├── metadata/               # Metadata management
│   ├── metadata-schemas.ts
│   ├── metadata-templates.ts
│   ├── ensip19-utils.ts
│   ├── ensip19-validator.ts
│   ├── ensip19-hierarchical.ts
│   └── ensip19-schema.json
├── security/               # Security features
│   └── audit-log-service.ts
└── services/                # General services
    ├── address-display-service.ts
    ├── notification-service.ts
    ├── user-config-service.ts
    ├── event-tracker.ts
    └── web3-provider.tsx
```

## Benefits

### 1. Clear Feature Boundaries
- Components organized by domain
- Easy to find related functionality
- Clear separation of concerns

### 2. Simplified Imports
- Use index files for cleaner imports
- Import entire modules: `import { PreflightChecker } from '@/components/workflows'`
- Type-safe barrel exports

### 3. Better Scalability
- Easy to add new features to appropriate domain
- Clear ownership of functionality
- Reduced file clutter

### 4. Improved Developer Experience
- Faster file discovery
- Clear code organization
- Better IntelliSense support

## Migration Guide

### Old Imports
```typescript
import { PreflightChecker } from '../components/PreflightChecker';
import { DomainManagement } from '../components/DomainManagement';
import { permissionService } from '../lib/permission-service';
```

### New Imports
```typescript
import { PreflightChecker } from '@/components/workflows';
import { DomainManagement } from '@/components/domains';
import { permissionService } from '@/lib/delegation';
```

## Index Files

Each module now has an `index.ts` file that exports all public APIs:

- `src/lib/ens/index.ts` - ENS operations
- `src/lib/delegation/index.ts` - Delegation services
- `src/lib/metadata/index.ts` - Metadata management
- `src/lib/services/index.ts` - General services
- `src/lib/security/index.ts` - Security features
- `src/components/workflows/index.ts` - Workflow components
- `src/components/domains/index.ts` - Domain components
- `src/components/registry/index.ts` - Registry components
- `src/components/metadata/index.ts` - Metadata components
- `src/components/security/index.ts` - Security components
- `src/components/governance/index.ts` - Governance components
- `src/components/reference/index.ts` - Reference components

## Architecture

### Feature-Based Organization
- Group by functionality, not by type
- Co-locate related code
- Clear module boundaries

### Benefits Over Flat Structure
- Easier navigation
- Better code discoverability
- Reduced cognitive load
- Clearer dependencies

### Future Improvements
- Add path aliases in tsconfig.json
- Create barrel exports for re-exports
- Add module-level documentation
- Implement feature flags per module

