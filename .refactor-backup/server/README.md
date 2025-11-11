# Server Architecture

## Overview

The server is separated into distinct layers:

1. **Services Layer** (`server/services/`) - Server-side only, NOT exposed to client
2. **API Layer** (`server/api/`) - Exposed endpoints that communicate with services
3. **Database Layer** (`server/db/`) - Database connections and migrations

## Encryption

### Master Key
- Environment variable: `MASTER_ENCRYPTION_KEY`
- Can decrypt ALL data (admin access)
- Used for administrative operations

### Per-User Keys
- Derived from master key + user address
- Each user has their own encryption key
- Provides privacy in case of data leak
- User data encrypted with user-specific key

## Admin Authentication

### Setup
1. Set `MASTER_ENCRYPTION_KEY` in environment
2. Run database migration: `server/db/migrations/add-admin-support.sql`
3. Add admin users via database or API

### Adding Admin Users

Via SQL:
```sql
INSERT INTO admin_users (address, role) 
VALUES ('0x...', 'admin');
```

Via API (super admin only):
```bash
POST /api/admin/admins
{
  "address": "0x...",
  "role": "admin"
}
```

### Authentication Flow
1. User connects wallet
2. Signs message with Ethereum wallet
3. Server verifies signature
4. Server checks if address is in `admin_users` table
5. Creates session token (24 hour expiry)
6. Returns session token to client

## Environment Variables

```env
# Required
MASTER_ENCRYPTION_KEY=<256-bit-key>
DATABASE_URL=<postgres-connection-string>

# Optional
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=production
```

## API Endpoints

### Admin Endpoints (Protected)
- `GET /api/admin/me` - Get current admin info
- `POST /api/admin/login` - Create session
- `POST /api/admin/logout` - Revoke session
- `GET /api/admin/users` - List all users
- `GET /api/admin/audit-logs` - List all audit logs
- `GET /api/admin/statistics` - Get system statistics
- `GET /api/admin/admins` - List admins (super admin only)
- `POST /api/admin/admins` - Add admin (super admin only)
- `DELETE /api/admin/admins/:address` - Remove admin (super admin only)

## Security

- All admin endpoints require authentication
- Session tokens expire after 24 hours
- Master key stored in environment (never in code)
- Per-user encryption for privacy
- Signature verification for authentication



