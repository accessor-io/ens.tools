
# ens.tools

ENS domain management and configuration tools. The original project is available at https://www.figma.com/design/AaNSxswYsWWk70qHde0pCg/ENS-Contract-Naming-Best-Practices.

## Project Structure

This project uses a monorepo structure with npm workspaces, incorporating packages from the `ens-granular-monorepo`:

- **Main Application**: React/Vite application in `src/`
- **Contracts Package** (`@ens-granular/contracts`): Smart contracts for ENS granular delegation
- **CLI Package** (`@ens-granular/cli`): Command-line interface for ENS management

See [MONOREPO-INTEGRATION.md](./MONOREPO-INTEGRATION.md) for details.

## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.

## Available Scripts

### Main Application
- `npm run dev` - Start development server
- `npm run build` - Build application
- `npm test` - Run tests

### Contracts Package
- `npm run contracts:build` - Compile contracts
- `npm run contracts:test` - Run contract tests

### CLI Package
- `npm run cli:build` - Build CLI
- `npm run cli:dev` - Run CLI in development mode

### All Packages
- `npm run build:all` - Build all packages
- `npm run test:all` - Test all packages

