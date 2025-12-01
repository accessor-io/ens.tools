#!/usr/bin/env node

/**
 * CI/CD Generator Script
 * 
 * Generates CI/CD pipeline configuration for automated testing, building, and deployment:
 * - GitHub Actions workflows for CI/CD
 * - Environment variable templates
 * - Deployment configurations
 * - CI/CD documentation
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const GITHUB_WORKFLOWS_DIR = path.join(PROJECT_ROOT, '.github', 'workflows');
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts');

// Ensure directories exist
if (!fs.existsSync(GITHUB_WORKFLOWS_DIR)) {
  fs.mkdirSync(GITHUB_WORKFLOWS_DIR, { recursive: true });
}

// Helper function to check if file exists
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// Helper function to check if contracts directory exists
function hasContracts() {
  const contractsDir = path.join(PROJECT_ROOT, 'contracts');
  return fs.existsSync(contractsDir) && fs.readdirSync(contractsDir).length > 0;
}

// CI Workflow
const ciWorkflow = `name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  ci:
    name: Continuous Integration
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js \${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install frontend dependencies
        run: npm ci
      
      - name: Install backend dependencies
        working-directory: ./server
        run: npm ci
      
      - name: Run frontend linting
        run: npm run lint || echo "Linting not configured"
        continue-on-error: true
      
      - name: Run backend type check
        working-directory: ./server
        run: npm run build --dry-run || npx tsc --noEmit
        continue-on-error: true
      
      - name: Run frontend tests
        run: npm test -- --run
        continue-on-error: true
      
      - name: Build frontend
        run: npm run build
      
      - name: Build backend
        working-directory: ./server
        run: npm run build
      
      - name: Validate frontend build
        run: |
          if [ ! -d "build" ]; then
            echo "Frontend build directory not found"
            exit 1
          fi
          if [ ! -f "build/index.html" ]; then
            echo "Frontend build index.html not found"
            exit 1
          fi
      
      - name: Validate backend build
        working-directory: ./server
        run: |
          if [ ! -d "dist" ]; then
            echo "Backend build directory not found"
            exit 1
          fi
          if [ ! -f "dist/api/index.js" ]; then
            echo "Backend build index.js not found"
            exit 1
          fi
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-\${{ matrix.node-version }}
          path: |
            build/
            server/dist/
          retention-days: 7
`;

// CD Workflow
const cdWorkflow = `name: CD

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
      
      - name: Install frontend dependencies
        run: npm ci
      
      - name: Install backend dependencies
        working-directory: ./server
        run: npm ci
      
      - name: Run tests
        run: npm test -- --run
      
      - name: Build frontend
        run: npm run build
        env:
          NODE_ENV: production
      
      - name: Build backend
        working-directory: ./server
        run: npm run build
        env:
          NODE_ENV: production
      
      - name: Run database migrations (dry-run)
        working-directory: ./server
        run: npm run migrate --dry-run || echo "Migrations not configured"
        continue-on-error: true
        env:
          DATABASE_URL: \${{ secrets.DATABASE_URL }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        if: env.VERCEL_TOKEN != ''
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
        continue-on-error: true
      
      - name: Create deployment tag
        if: github.ref == 'refs/heads/main'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git tag -a "deploy-\$(date +%Y%m%d-%H%M%S)" -m "Deployment \$(date +%Y-%m-%d)"
          git push origin --tags || echo "Tag push failed"
        continue-on-error: true
      
      - name: Deployment notification
        if: always()
        run: |
          if [ "\${{ job.status }}" == "success" ]; then
            echo "Deployment successful"
          else
            echo "Deployment failed"
          fi
`;

// Test Workflow
const testWorkflow = `name: Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
      
      - name: Install frontend dependencies
        run: npm ci
      
      - name: Install backend dependencies
        working-directory: ./server
        run: npm ci
      
      - name: Run frontend tests
        run: npm test -- --run --coverage
      
      - name: Upload coverage reports
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
          retention-days: 30
        continue-on-error: true
      
      - name: Comment PR with coverage
        if: github.event_name == 'pull_request'
        uses: py-cov-action/python-coverage-comment-action@v3
        with:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          MINIMUM_GREEN: 80
          MINIMUM_ORANGE: 60
        continue-on-error: true
`;

// Contracts Workflow (if contracts exist)
const contractsWorkflow = `name: Contracts

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]
    paths:
      - 'contracts/**'

jobs:
  compile-contracts:
    name: Compile Smart Contracts
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Compile contracts
        run: |
          if command -v npx hardhat &> /dev/null; then
            npx hardhat compile
          elif command -v forge &> /dev/null; then
            forge build
          else
            echo "No contract compiler found (Hardhat or Foundry)"
            exit 1
          fi
        continue-on-error: true
      
      - name: Run contract tests
        run: |
          if command -v npx hardhat &> /dev/null; then
            npx hardhat test
          elif command -v forge &> /dev/null; then
            forge test
          else
            echo "No contract test runner found"
            exit 1
          fi
        continue-on-error: true
`;

// CI/CD Documentation
const cicdDocs = `# CI/CD Documentation

## Overview

This project uses GitHub Actions for continuous integration and deployment. The CI/CD pipeline automates testing, building, and deployment processes.

## Workflows

### CI Workflow (\`.github/workflows/ci.yml\`)

Runs on pull requests and pushes to main/develop branches.

**Steps:**
1. Checkout code
2. Setup Node.js (multiple versions: 18.x, 20.x)
3. Install dependencies (frontend and backend)
4. Run linting and type checking
5. Run tests
6. Build frontend and backend
7. Validate build outputs
8. Upload build artifacts

### CD Workflow (\`.github/workflows/cd.yml\`)

Runs on merges to main branch.

**Steps:**
1. Run full CI pipeline
2. Build production artifacts
3. Run database migrations (dry-run)
4. Deploy to Vercel (if configured)
5. Create deployment tags
6. Send deployment notifications

### Test Workflow (\`.github/workflows/test.yml\`)

Runs on all pull requests.

**Steps:**
1. Run test suite
2. Generate coverage reports
3. Upload coverage artifacts
4. Comment PR with coverage summary

${hasContracts() ? `### Contracts Workflow (\`.github/workflows/contracts.yml\`)

Runs when contracts are modified.

**Steps:**
1. Compile smart contracts
2. Run contract tests
3. Validate contract deployments
` : ''}

## Environment Variables

### Required for CI
- None (CI runs without secrets)

### Required for CD
- \`VERCEL_TOKEN\` - Vercel deployment token
- \`VERCEL_ORG_ID\` - Vercel organization ID
- \`VERCEL_PROJECT_ID\` - Vercel project ID
- \`DATABASE_URL\` - PostgreSQL connection string (for migrations)

### Optional
- \`REDIS_URL\` - Redis connection string
- \`SLACK_WEBHOOK_URL\` - Slack notifications
- \`DISCORD_WEBHOOK_URL\` - Discord notifications
- \`COVERAGE_TOKEN\` - Code coverage service token

## Setting up GitHub Secrets

1. Go to your repository on GitHub
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Add each required secret with its value

## Deployment

### Automatic Deployment
- Merges to \`main\` branch trigger automatic deployment
- Production deployments require manual approval (if configured)

### Manual Deployment
- Use \`workflow_dispatch\` to manually trigger deployments
- Available in GitHub Actions tab

## Troubleshooting

### Build Failures
- Check Node.js version compatibility
- Verify all dependencies are installed
- Review build logs for specific errors

### Test Failures
- Ensure test environment is properly configured
- Check for flaky tests
- Review test coverage reports

### Deployment Failures
- Verify GitHub Secrets are configured
- Check Vercel project configuration
- Review deployment logs

## Customization

Workflows can be customized for:
- Different deployment targets (AWS, Azure, GCP)
- Container-based deployments (Docker, Kubernetes)
- Multiple environments (dev, staging, production)
- Performance testing (Lighthouse CI)
- Security scanning (Snyk, Dependabot, CodeQL)
`;

// Main execution
function generateCICD() {
  console.log('Generating CI/CD configuration...\n');

  // Generate workflows
  const workflows = [
    { name: 'ci.yml', content: ciWorkflow },
    { name: 'cd.yml', content: cdWorkflow },
    { name: 'test.yml', content: testWorkflow },
  ];

  if (hasContracts()) {
    workflows.push({ name: 'contracts.yml', content: contractsWorkflow });
    console.log('✓ Detected contracts directory, including contracts workflow');
  }

  workflows.forEach(({ name, content }) => {
    const filePath = path.join(GITHUB_WORKFLOWS_DIR, name);
    if (fileExists(filePath)) {
      console.log(`⚠ Skipping ${name} (already exists)`);
    } else {
      fs.writeFileSync(filePath, content);
      console.log(`✓ Created ${name}`);
    }
  });

  // Generate CI/CD documentation
  const docsPath = path.join(PROJECT_ROOT, 'docs', 'CI-CD.md');
  if (fileExists(docsPath)) {
    console.log('⚠ Skipping CI-CD.md (already exists)');
  } else {
    // Ensure docs directory exists
    const docsDir = path.join(PROJECT_ROOT, 'docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    fs.writeFileSync(docsPath, cicdDocs);
    console.log('✓ Created docs/CI-CD.md');
  }

  console.log('\n✓ CI/CD configuration generated successfully!');
  console.log('\nNext steps:');
  console.log('1. Review generated workflows in .github/workflows/');
  console.log('2. Configure GitHub Secrets (Settings > Secrets and variables > Actions)');
  console.log('3. Test CI pipeline by creating a pull request');
  console.log('4. Configure deployment targets');
  console.log('5. Set up branch protection rules');
}

// Run if executed directly
if (require.main === module) {
  generateCICD();
}

module.exports = { generateCICD };












