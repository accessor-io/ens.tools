# Encryption Setup Guide

This application now uses encryption for all user data stored in the database and localStorage.

## Overview

### Client-Side Encryption
- **Location**: Browser localStorage
- **Algorithm**: AES-256 via crypto-js
- **Key Derivation**: User address + session secret
- **Auto-migration**: Automatically migrates unencrypted data to encrypted format

### Server-Side Encryption
- **Location**: PostgreSQL database (`user_configs` table)
- **Algorithm**: AES-256-GCM (via Node.js crypto)
- **Key Derivation**: User address + environment key
- **Format**: Base64-encoded encrypted strings

## Environment Variables

### Required (Production)

Set these environment variables for secure encryption:

```bash
# Primary encryption key (strongly recommended in production)
ENCRYPTION_KEY=your-256-bit-encryption-key-here

# Optional: Fallback key (used if ENCRYPTION_KEY not set)
FALLBACK_ENCRYPTION_KEY=fallback-key-for-development
```

### Generating Encryption Keys

Generate a secure encryption key:

```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Using Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

## Security Notes

### Key Management
1. **Never commit encryption keys to version control**
2. Store keys securely (e.g., environment variables, secrets manager)
3. Rotate keys periodically
4. Use different keys for development and production

### Data Migration
- Old unencrypted data is automatically detected and migrated
- Migration happens transparently on first read
- No manual migration required

### Client-Side Secrets
- Session secrets are generated per browser session
- Stored in localStorage (`ens_config_encryption_secret`)
- Regenerated on each new session

## Database Migration

The `user_configs` table column type has changed:

```sql
-- Old (unencrypted JSONB)
config_json JSONB NOT NULL

-- New (encrypted TEXT)
config_json TEXT NOT NULL
```

To migrate existing data:

```sql
-- Backup first!
CREATE TABLE user_configs_backup AS SELECT * FROM user_configs;

-- Alter column type
ALTER TABLE user_configs 
ALTER COLUMN config_json TYPE TEXT USING config_json::text;
```

Note: Existing unencrypted data will be automatically encrypted on first read/write.

## Usage

### Client-Side

```typescript
import { EncryptionService } from './lib/security/encryption-service';

// Encrypt data
const encrypted = EncryptionService.encrypt('sensitive data', userAddress);

// Decrypt data
const decrypted = EncryptionService.decrypt(encrypted, userAddress);

// Encrypt JSON
const encryptedJSON = EncryptionService.encryptJSON({ key: 'value' }, userAddress);

// Decrypt JSON
const decryptedJSON = EncryptionService.decryptJSON(encryptedJSON, userAddress);
```

### Server-Side

```typescript
import { ServerEncryptionService } from '../utils/encryption';

// Encrypt data
const encrypted = ServerEncryptionService.encrypt('sensitive data', userAddress);

// Decrypt data
const decrypted = ServerEncryptionService.decrypt(encrypted, userAddress);

// Encrypt JSON
const encryptedJSON = ServerEncryptionService.encryptJSON({ key: 'value' }, userAddress);

// Decrypt JSON
const decryptedJSON = ServerEncryptionService.decryptJSON(encryptedJSON, userAddress);

// Check if data is encrypted
const isEncrypted = ServerEncryptionService.isEncrypted(data);
```

## Testing

### Test Encryption/Decryption

```typescript
// Client
const testData = { test: 'value' };
const encrypted = EncryptionService.encryptJSON(testData, '0x123...');
const decrypted = EncryptionService.decryptJSON(encrypted, '0x123...');
console.assert(JSON.stringify(testData) === JSON.stringify(decrypted));

// Server
const testData = { test: 'value' };
const encrypted = ServerEncryptionService.encryptJSON(testData, '0x123...');
const decrypted = ServerEncryptionService.decryptJSON(encrypted, '0x123...');
console.assert(JSON.stringify(testData) === JSON.stringify(decrypted));
```

## Troubleshooting

### "Failed to decrypt data"
- Check that encryption keys match between environments
- Verify user address is consistent
- Check for corrupted data in database

### "Decryption failed - invalid key"
- Client: Clear localStorage and reconnect wallet
- Server: Verify ENCRYPTION_KEY environment variable is set correctly

### Migration Issues
- Old unencrypted data should automatically migrate
- If issues persist, clear user config and reconfigure

## Production Checklist

- [ ] Set `ENCRYPTION_KEY` environment variable
- [ ] Use secure key storage (AWS Secrets Manager, HashiCorp Vault, etc.)
- [ ] Different keys for dev/staging/production
- [ ] Regular key rotation plan
- [ ] Backup encryption keys securely
- [ ] Monitor for decryption errors in logs
- [ ] Test encryption/decryption in production-like environment

