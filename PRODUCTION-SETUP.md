# ENS Tools Production Setup Guide

## Overview

This guide covers setting up the ENS Tools application for production with a backend API, database, and real blockchain integration.

## Architecture

- **Frontend**: React + Vite app (`src/`)
- **Backend**: Express.js API server (`server/`)
- **Database**: PostgreSQL for persistent storage
- **Cache**: Redis for performance
- **Blockchain**: viem for Ethereum interactions

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+
- MetaMask or compatible Web3 wallet

## Quick Start

### 1. Install Dependencies

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd server
npm install
cd ..
```

### 2. Database Setup

Create a PostgreSQL database:

```bash
createdb ens_tools
```

Run the schema migration:

```bash
cd server
psql ens_tools < db/schema.sql
```

### 3. Environment Configuration

Copy environment files:

```bash
# Backend
cp server/.env.example server/.env

# Frontend
cp .env.example .env
```

Edit `server/.env` with your configuration:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ens_tools
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-secret-key-here
INFURA_PROJECT_ID=your-infura-project-id
THEGRAPH_API_KEY=your-thegraph-api-key
IPFS_GATEWAY=https://ipfs.io/ipfs/
NODE_ENV=development
PORT=3001
```

Edit `.env` (frontend):

```env
VITE_API_URL=http://localhost:3001/api
```

### 4. Start Services

Terminal 1 - Start Redis:

```bash
redis-server
```

Terminal 2 - Start Backend:

```bash
cd server
npm run dev
```

Terminal 3 - Start Frontend:

```bash
npm run dev
```

### 5. Access Application

Open http://localhost:5173 in your browser and connect your wallet.

## Production Deployment

### Backend Deployment

Build the backend:

```bash
cd server
npm run build
npm start
```

Recommended hosting:
- **Railway** - Easy PostgreSQL + Redis hosting
- **Render** - Free tier available
- **AWS/GCP** - For enterprise scale

### Frontend Deployment

Build the frontend:

```bash
npm run build
```

Deploy to:
- **Vercel** - Recommended (built-in Vite support)
- **Netlify** - Simple static hosting
- **AWS S3 + CloudFront** - Enterprise CDN

### Environment Variables (Production)

Backend `.env`:

```env
DATABASE_URL=<production-postgres-url>
REDIS_URL=<production-redis-url>
FRONTEND_URL=https://your-domain.com
JWT_SECRET=<strong-random-secret>
INFURA_PROJECT_ID=<your-infura-id>
THEGRAPH_API_KEY=<your-thegraph-key>
IPFS_GATEWAY=https://ipfs.io/ipfs/
NODE_ENV=production
PORT=3001
```

Frontend `.env`:

```env
VITE_API_URL=https://api.your-domain.com/api
```

## API Endpoints

### Authentication

```
POST   /api/auth/connect        - Connect wallet
POST   /api/auth/disconnect     - Disconnect wallet
```

### Contracts

```
GET    /api/contracts           - List contracts
POST   /api/contracts           - Create contract
PUT    /api/contracts/:id       - Update contract
DELETE /api/contracts/:id       - Delete contract
```

### DAOs

```
GET    /api/daos                - List DAOs
POST   /api/daos               - Create DAO
PUT    /api/daos/:id           - Update DAO
DELETE /api/daos/:id           - Delete DAO
```

### Integrations

```
GET    /api/integrations       - List integrations
POST   /api/integrations      - Create integration
PUT    /api/integrations/:id  - Update integration
DELETE /api/integrations/:id - Delete integration
```

### Audit Log

```
GET    /api/audit-log          - List audit entries
POST   /api/audit-log          - Create audit entry
DELETE /api/audit-log/:id      - Delete audit entry
```

### Config

```
GET    /api/user/config        - Get user config
PUT    /api/user/config        - Update user config
```

### Analytics

```
GET    /api/analytics/metrics  - Get analytics metrics
```

### Domains

```
GET    /api/domains/:name/enhanced - Get enhanced domain data
```

## Database Schema

See `server/db/schema.sql` for complete schema definitions.

Key tables:
- `users` - User accounts
- `contracts` - Contract registry
- `daos` - DAO registry
- `integrations` - Integration registry
- `audit_logs` - Audit trail
- `user_configs` - User preferences
- `domain_cache` - Cached domain data

## Development

### Running Tests

```bash
# Backend tests
cd server
npm test

# Frontend tests
npm test
```

### Code Style

```bash
# Lint backend
cd server
npm run lint

# Lint frontend
npm run lint
```

## Troubleshooting

### Database Connection Issues

1. Verify PostgreSQL is running: `pg_isready`
2. Check DATABASE_URL in `.env`
3. Ensure database exists: `psql -l | grep ens_tools`

### Redis Connection Issues

1. Verify Redis is running: `redis-cli ping`
2. Check REDIS_URL in `.env`
3. Test connection: `redis-cli -u $REDIS_URL ping`

### API Not Responding

1. Check backend logs for errors
2. Verify CORS settings in `server/api/index.ts`
3. Ensure FRONTEND_URL matches your frontend URL

### Wallet Connection Issues

1. Ensure MetaMask or compatible wallet is installed
2. Check browser console for errors
3. Verify wallet is on supported network (Mainnet, Sepolia)

## Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` as template
2. **Use strong JWT_SECRET** - Generate with `openssl rand -hex 32`
3. **Enable HTTPS** - Use SSL certificates in production
4. **Rate Limiting** - Already configured (100 req/15min)
5. **Input Validation** - Sanitize all user inputs
6. **Audit Logging** - All actions are logged to database

## Monitoring

### Health Checks

```bash
# Backend health
curl http://localhost:3001/health

# Frontend health
curl http://localhost:5173
```

### Logs

Backend logs are output to console. In production, use:
- **Winston** for structured logging
- **Sentry** for error tracking
- **DataDog** for APM

## Performance Optimization

1. **Enable Redis caching** - Reduces database load
2. **Use CDN** - Cache static assets
3. **Database Indexing** - Already configured in schema
4. **Connection Pooling** - Configured in `server/db/index.ts`
5. **Bundle Splitting** - Configured in `vite.config.ts`

## Support

For issues or questions:
1. Check existing documentation
2. Review code comments
3. Check GitHub issues
4. Contact development team

## License

MIT License - See LICENSE file for details

