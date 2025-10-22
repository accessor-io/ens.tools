# Audit Log & User Configuration System

## Overview

Implemented a user-based configuration system with encrypted storage and event tracking for all user actions in the ENS management application.

## Components

### 1. User Configuration Service (`src/lib/user-config-service.ts`)

Encrypted per-address configuration storage that automatically saves and loads user settings.

**Features:**
- AES encryption using crypto-js
- Per-address configuration isolation
- Automatic saving/loading
- Default configuration fallback

**Configuration Options:**
- Display options (theme, compact mode, advanced settings, refresh interval)
- Domain groups (custom categorization)
- Domain assignments (group and project assignments)
- Audit log settings (enabled/disabled, max entries)
- Notification preferences (on-chain and external notifications)

**Usage:**
```typescript
import { userConfigService } from './lib/user-config-service';

// Get config for connected address
const config = userConfigService.getUserConfig(address);

// Update config
userConfigService.updateUserConfig(address, {
  displayOptions: { theme: 'dark' }
});

// Save complete config
userConfigService.setUserConfig(address, config);
```

### 2. Event Tracker (`src/lib/event-tracker.ts`)

Centralized event tracking system that captures all user actions and automatically logs them to the audit log based on user preferences.

**Tracked Events:**
- Wallet connection/disconnection
- View changes
- Domain searches and views
- Domain grouping and project assignments
- Group management (create, update, delete)
- ENS operations (text records, subdomains, transfers, fuses)
- Contract registration and metadata updates
- Transaction status (signed, confirmed, failed)
- Settings changes

**Event Processing:**
- Asynchronous queue-based processing
- Automatic audit log integration
- Respects user audit log preferences
- Event listener subscriptions for real-time updates

**Usage:**
```typescript
import { eventTracker } from './lib/event-tracker';

// Track specific actions
eventTracker.trackWalletConnected(address);
eventTracker.trackDomainSearch(query, resultCount, address);
eventTracker.trackTextRecordSet(domain, key, value, address);
eventTracker.trackTransactionConfirmed(txHash, address);

// Subscribe to events
const unsubscribe = eventTracker.subscribe('transaction_confirmed', (data) => {
  console.log('Transaction confirmed:', data);
});
```

### 3. Audit Log Tray (`src/components/AuditLogTray.tsx`)

Bottom-mounted expandable audit log that displays recent user actions.

**Features:**
- Collapsed/expanded state
- Real-time updates via subscription
- Unread count badge
- Export to CSV
- Clear log functionality
- Status icons and badges
- Relative timestamps
- Domain context display

### 4. Integration Points

**App.tsx:**
- Loads user config on wallet connection
- Tracks view changes
- Mounts audit log tray at bottom

**WalletConnect.tsx:**
- Tracks wallet connection/disconnection
- Integrated with event tracker

**DomainManagement.tsx:**
- Tracks domain searches
- Tracks filter applications
- Ready for group/project tracking

**DomainProfile.tsx:**
- Tracks domain views
- Tracks text record updates
- Tracks transaction failures

## Installation

Install crypto-js dependency:

```bash
npm install crypto-js @types/crypto-js
```

## Data Flow

```
User Action
    ↓
Event Tracker
    ↓
User Config Check (audit log enabled?)
    ↓
Audit Log Service (if enabled)
    ↓
Audit Log Tray (real-time display)
```

## Storage

### Configuration Storage
- Key: `ens_config_{address}`
- Format: Encrypted JSON
- Encryption: AES-256 via crypto-js

### Audit Log Storage
- Key: `ens_audit_log`
- Format: JSON array
- No encryption (already encrypted via user config)

### Encryption Key Storage
- Key: `ens_config_key`
- Format: Random 256-bit key
- Generated once per browser session

## Security Considerations

1. **Per-Address Isolation**: Each wallet address has separate encrypted configuration
2. **No Private Keys**: Never stored or accessed
3. **Local Storage Only**: No server-side storage
4. **Encryption**: All configuration data is encrypted
5. **Automatic Cleanup**: Old data can be cleared on disconnect

## User Preferences

Users can control:
- Whether audit logging is enabled
- Maximum number of audit log entries
- Notification preferences
- Display preferences
- Domain organization (groups, projects)

## Event Types

All tracked events include:
- Event type
- Timestamp
- Wallet address (actor)
- Domain context (if applicable)
- Additional metadata
- Status (success, warning, failed, info)

## Future Enhancements

1. **Multi-Chain Support**: Track events across multiple chains
2. **Server Sync**: Optional cloud backup with encryption
3. **Advanced Filtering**: Filter by event type, domain, date range
4. **Analytics**: Aggregate statistics and insights
5. **Export Formats**: JSON, CSV, PDF
6. **Search**: Full-text search across audit log
7. **Retention Policies**: Automatic cleanup based on age

