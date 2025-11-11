#!/usr/bin/env node

/**
 * Documentation Population Script
 * 
 * Populates the documentation structure (created by generate-documentation.js) with
 * actual content from existing documentation files in the project.
 * 
 * This script:
 * - Scans existing .md files from project root and docs/ directory
 * - Extracts API routes from server/api/routes/
 * - Extracts code examples and function definitions
 * - Categorizes and merges content into appropriate documentation files
 * - Preserves existing content while enhancing it
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const PROJECT_ROOT = path.join(__dirname, '..');
const SERVER_ROUTES_DIR = path.join(PROJECT_ROOT, 'server', 'api', 'routes');
const SRC_LIB_DIR = path.join(PROJECT_ROOT, 'src', 'lib');

// Files that should not be overwritten (legal/policy docs)
const PRESERVE_FILES = [
  'PRIVACY-POLICY.md',
  'USER-AGREEMENTS.md',
  'TERMS-OF-AGREEMENT.md',
  'USAGE-POLICY.md',
  'WEB3-PROVIDER-DISCLOSURE.md',
  'FINANCIAL-RISK-DISCLOSURE.md',
  'LEGAL-COMPLIANCE.md',
];

// Helper function to read file if exists
function readFileIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return null;
  }
}

// Helper function to write file
function writeFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (e) {
    console.error(`[ERROR] Failed to write ${filePath}:`, e.message);
    return false;
  }
}

// Find all markdown files in a directory
function findMarkdownFiles(dir, recursive = true) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && recursive) {
      files.push(...findMarkdownFiles(fullPath, recursive));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Extract API routes with more detail
function extractAPIRoutes() {
  const routes = [];
  
  if (!fs.existsSync(SERVER_ROUTES_DIR)) {
    return routes;
  }
  
  const files = fs.readdirSync(SERVER_ROUTES_DIR);
  
  for (const file of files) {
    if (!file.endsWith('.ts')) continue;
    
    const filePath = path.join(SERVER_ROUTES_DIR, file);
    const content = readFileIfExists(filePath);
    if (!content) continue;
    
    const routeFile = file.replace('.ts', '');
    
    // Extract route definitions with more context
    // Handle different router variable names (router, authRouter, domainsRouter, etc.)
    const routePattern = /(?:router|authRouter|domainsRouter|marketplaceRouter|contractsRouter|daosRouter|integrationsRouter|configRouter)\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = routePattern.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const routePath = match[2];
      
      // Try to extract comments before the route
      const beforeRoute = content.substring(0, match.index);
      const commentMatch = beforeRoute.match(/\/\*\*[\s\S]*?\*\/|\/\/.*$/m);
      let description = '';
      if (commentMatch) {
        description = commentMatch[0]
          .replace(/\/\*\*|\*\//g, '')
          .replace(/\*/g, '')
          .replace(/\/\//g, '')
          .trim();
      }
      
      // Check for auth middleware in the file
      const usesAuth = content.includes('authMiddleware') || 
                       content.includes('adminAuthMiddleware') ||
                       content.includes('verifySignature') ||
                       content.includes('.use(authMiddleware)') ||
                       content.includes('.use(adminAuthMiddleware)');
      
      // Check for validation
      const usesValidation = content.includes('validate(') || 
                           content.includes('schemas.');
      
      // Determine the base path from the router file name
      const basePath = routeFile === 'auth' ? '' : `/${routeFile}`;
      const fullPath = `/api${basePath}${routePath.startsWith('/') ? routePath : '/' + routePath}`;
      
      routes.push({
        method,
        path: routePath,
        file: routeFile,
        description: description || `${method} ${routePath}`,
        requiresAuth: usesAuth,
        requiresValidation: usesValidation,
        fullPath: fullPath,
      });
    }
  }
  
  return routes;
}

// Extract code examples from documentation
function extractCodeExamples(docContent) {
  const examples = [];
  const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  
  while ((match = codeBlockPattern.exec(docContent)) !== null) {
    const language = match[1] || 'text';
    const code = match[2].trim();
    
    if (code.length > 20) { // Only include substantial code blocks
      examples.push({
        language,
        code,
      });
    }
  }
  
  return examples;
}

// Extract function definitions from source files
function extractFunctions(filePath) {
  const content = readFileIfExists(filePath);
  if (!content) return [];
  
  const functions = [];
  
  // Match exported functions
  const functionPattern = /export\s+(?:async\s+)?function\s+(\w+)\s*\([^)]*\)/g;
  let match;
  
  while ((match = functionPattern.exec(content)) !== null) {
    const funcName = match[1];
    const startIndex = match.index;
    const endIndex = Math.min(startIndex + 500, content.length);
    const funcContext = content.substring(startIndex, endIndex);
    
    // Try to extract JSDoc comment
    const beforeFunc = content.substring(Math.max(0, startIndex - 500), startIndex);
    const jsdocMatch = beforeFunc.match(/\/\*\*[\s\S]*?\*\/\s*$/);
    let description = '';
    if (jsdocMatch) {
      description = jsdocMatch[0]
        .replace(/\/\*\*|\*\//g, '')
        .replace(/\*/g, '')
        .trim();
    }
    
    functions.push({
      name: funcName,
      description: description || `Function: ${funcName}`,
      file: path.relative(PROJECT_ROOT, filePath),
    });
  }
  
  return functions;
}

// Categorize documentation content
function categorizeDocumentation(docPath, content) {
  const filename = path.basename(docPath, '.md');
  const lowerContent = content.toLowerCase();
  
  const categories = {
    projectOverview: false,
    functionality: false,
    conditions: false,
    help: false,
    bestPractices: false,
    businessLogic: false,
    codeUsage: false,
    terminalUsage: false,
    apiReference: false,
  };
  
  // Determine categories based on filename and content
  if (filename.includes('overview') || filename.includes('readme') || 
      filename.includes('architecture') || filename.includes('introduction')) {
    categories.projectOverview = true;
  }
  
  if (filename.includes('functionality') || filename.includes('implementation') ||
      filename.includes('feature') || filename.includes('process') ||
      lowerContent.includes('function') || lowerContent.includes('method') ||
      lowerContent.includes('process')) {
    categories.functionality = true;
  }
  
  if (filename.includes('condition') || filename.includes('error') ||
      filename.includes('edge') || filename.includes('result') ||
      lowerContent.includes('error') || lowerContent.includes('exception') ||
      lowerContent.includes('edge case')) {
    categories.conditions = true;
  }
  
  if (filename.includes('help') || filename.includes('guide') ||
      filename.includes('quickstart') || filename.includes('tutorial') ||
      lowerContent.includes('how to') || lowerContent.includes('guide')) {
    categories.help = true;
  }
  
  if (filename.includes('best-practice') || filename.includes('practice') ||
      lowerContent.includes('best practice') || lowerContent.includes('recommended')) {
    categories.bestPractices = true;
  }
  
  if (filename.includes('business') || filename.includes('logic') ||
      filename.includes('rule') || lowerContent.includes('business logic') ||
      lowerContent.includes('business rule')) {
    categories.businessLogic = true;
  }
  
  if (filename.includes('code') || filename.includes('usage') ||
      filename.includes('example') || filename.includes('api') ||
      lowerContent.includes('code example') || lowerContent.includes('usage example') ||
      lowerContent.includes('```')) {
    categories.codeUsage = true;
  }
  
  if (filename.includes('terminal') || filename.includes('cli') ||
      filename.includes('command') || lowerContent.includes('npm run') ||
      lowerContent.includes('command line')) {
    categories.terminalUsage = true;
  }
  
  if (filename.includes('api') || filename.includes('endpoint') ||
      filename.includes('route') || lowerContent.includes('api endpoint') ||
      lowerContent.includes('http method')) {
    categories.apiReference = true;
  }
  
  return categories;
}

// Merge content into target file
function mergeContent(targetPath, newContent, preserveExisting = true) {
  if (!fs.existsSync(targetPath)) {
    return newContent;
  }
  
  if (!preserveExisting) {
    return newContent;
  }
  
  const existing = readFileIfExists(targetPath) || '';
  
  // Check if content already exists to avoid duplicates
  if (existing.includes(newContent.substring(0, 100))) {
    return existing; // Content already present
  }
  
  // Append new content with a separator
  return existing + '\n\n---\n\n' + newContent;
}

// Generate API Reference content
function generateAPIReference(routes) {
  let content = `# API Reference\n\n`;
  content += `This document provides a reference for all API endpoints in the ENS Tools platform.\n\n`;
  content += `## Overview\n\n`;
  content += `The API is organized by resource type. All endpoints require authentication unless otherwise specified.\n\n`;
  content += `**Base URL**: \`/api\`\n\n`;
  content += `**Authentication**: Most endpoints require a valid JWT token in the Authorization header.\n\n`;
  
  // Group routes by file
  const routesByFile = {};
  for (const route of routes) {
    if (!routesByFile[route.file]) {
      routesByFile[route.file] = [];
    }
    routesByFile[route.file].push(route);
  }
  
  // Generate sections for each route file
  for (const [file, fileRoutes] of Object.entries(routesByFile)) {
    content += `\n## ${file.charAt(0).toUpperCase() + file.slice(1)} Routes\n\n`;
    
    for (const route of fileRoutes) {
      content += `### ${route.method} ${route.path}\n\n`;
      if (route.description) {
        content += `${route.description}\n\n`;
      }
      content += `**Endpoint**: \`${route.fullPath}\`\n\n`;
      content += `**Method**: \`${route.method}\`\n\n`;
      if (route.requiresAuth) {
        content += `**Authentication**: Required\n\n`;
      }
      if (route.requiresValidation) {
        content += `**Validation**: Required\n\n`;
      }
      content += `---\n\n`;
    }
  }
  
  return content;
}

// Main execution
console.log('Populating documentation structure...\n');

// Step 1: Find all existing documentation files
console.log('[INFO] Scanning for existing documentation files...');
const rootDocs = findMarkdownFiles(PROJECT_ROOT, false).filter(f => 
  !f.includes('node_modules') && !f.includes('docs/')
);
const docsDirFiles = findMarkdownFiles(DOCS_DIR, false);

console.log(`[INFO] Found ${rootDocs.length} documentation files in project root`);
console.log(`[INFO] Found ${docsDirFiles.length} documentation files in docs/ directory`);

// Step 2: Extract API routes
console.log('[INFO] Extracting API routes...');
const apiRoutes = extractAPIRoutes();
console.log(`[INFO] Extracted ${apiRoutes.length} API endpoints`);

// Step 3: Process existing documentation
const categorizedContent = {
  projectOverview: [],
  functionality: [],
  conditions: [],
  help: [],
  bestPractices: [],
  businessLogic: [],
  codeUsage: [],
  terminalUsage: [],
  apiReference: [],
};

for (const docPath of [...rootDocs, ...docsDirFiles]) {
  const content = readFileIfExists(docPath);
  if (!content) continue;
  
  const categories = categorizeDocumentation(docPath, content);
  const codeExamples = extractCodeExamples(content);
  
  const docInfo = {
    path: docPath,
    filename: path.basename(docPath),
    content,
    codeExamples,
  };
  
  // Add to appropriate categories
  if (categories.projectOverview) {
    categorizedContent.projectOverview.push(docInfo);
  }
  if (categories.functionality) {
    categorizedContent.functionality.push(docInfo);
  }
  if (categories.conditions) {
    categorizedContent.conditions.push(docInfo);
  }
  if (categories.help) {
    categorizedContent.help.push(docInfo);
  }
  if (categories.bestPractices) {
    categorizedContent.bestPractices.push(docInfo);
  }
  if (categories.businessLogic) {
    categorizedContent.businessLogic.push(docInfo);
  }
  if (categories.codeUsage) {
    categorizedContent.codeUsage.push(docInfo);
  }
  if (categories.terminalUsage) {
    categorizedContent.terminalUsage.push(docInfo);
  }
  if (categories.apiReference) {
    categorizedContent.apiReference.push(docInfo);
  }
}

// Step 4: Extract functions from source files
console.log('[INFO] Extracting function definitions...');
const allFunctions = [];

// Helper to find TypeScript files
function findTypeScriptFiles(dir, recursive = true) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && recursive) {
      files.push(...findTypeScriptFiles(fullPath, recursive));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

if (fs.existsSync(SRC_LIB_DIR)) {
  const libFiles = findTypeScriptFiles(SRC_LIB_DIR, true);
  
  for (const file of libFiles) {
    const functions = extractFunctions(file);
    allFunctions.push(...functions);
  }
}
console.log(`[INFO] Extracted ${allFunctions.length} function definitions`);

// Step 5: Update documentation files
console.log('\n[INFO] Updating documentation files...\n');

// Update PROJECT-OVERVIEW.md
const projectOverviewPath = path.join(DOCS_DIR, 'PROJECT-OVERVIEW.md');
if (categorizedContent.projectOverview.length > 0) {
  let overviewContent = '\n## Additional Information from Existing Documentation\n\n';
  for (const doc of categorizedContent.projectOverview) {
    overviewContent += `### From ${doc.filename}\n\n`;
    // Extract first few paragraphs
    const paragraphs = doc.content.split('\n\n').slice(0, 3).join('\n\n');
    overviewContent += paragraphs + '\n\n';
  }
  
  const existing = readFileIfExists(projectOverviewPath) || '';
  if (!existing.includes('Additional Information')) {
    writeFile(projectOverviewPath, mergeContent(projectOverviewPath, overviewContent));
    console.log('[OK] Updated PROJECT-OVERVIEW.md');
  }
}

// Update FUNCTIONALITY.md
const functionalityPath = path.join(DOCS_DIR, 'FUNCTIONALITY.md');
if (categorizedContent.functionality.length > 0) {
  let functionalityContent = '\n## Additional Processes and Functions\n\n';
  
  // Add functions
  if (allFunctions.length > 0) {
    functionalityContent += '### Extracted Functions\n\n';
    for (const func of allFunctions.slice(0, 20)) { // Limit to first 20
      functionalityContent += `- **${func.name}** (${func.file})\n`;
      if (func.description) {
        functionalityContent += `  ${func.description}\n`;
      }
    }
    functionalityContent += '\n';
  }
  
  for (const doc of categorizedContent.functionality) {
    functionalityContent += `### From ${doc.filename}\n\n`;
    const paragraphs = doc.content.split('\n\n').slice(0, 5).join('\n\n');
    functionalityContent += paragraphs + '\n\n';
  }
  
  const existing = readFileIfExists(functionalityPath) || '';
  if (!existing.includes('Additional Processes')) {
    writeFile(functionalityPath, mergeContent(functionalityPath, functionalityContent));
    console.log('[OK] Updated FUNCTIONALITY.md');
  }
}

// Update CODE-USAGE.md
const codeUsagePath = path.join(DOCS_DIR, 'CODE-USAGE.md');
let codeUsageContent = '\n## Code Examples from Existing Documentation\n\n';
let exampleCount = 0;

for (const doc of categorizedContent.codeUsage) {
  if (doc.codeExamples.length > 0) {
    codeUsageContent += `### Examples from ${doc.filename}\n\n`;
    for (const example of doc.codeExamples.slice(0, 3)) { // Limit examples per doc
      codeUsageContent += `\`\`\`${example.language}\n${example.code}\n\`\`\`\n\n`;
      exampleCount++;
    }
  }
}

if (exampleCount > 0) {
  const existing = readFileIfExists(codeUsagePath) || '';
  if (!existing.includes('Code Examples from Existing')) {
    writeFile(codeUsagePath, mergeContent(codeUsagePath, codeUsageContent));
    console.log(`[OK] Updated CODE-USAGE.md with ${exampleCount} examples`);
  }
}

// Update API-REFERENCE.md (regenerate completely)
const apiReferencePath = path.join(DOCS_DIR, 'API-REFERENCE.md');
if (apiRoutes.length > 0) {
  const apiContent = generateAPIReference(apiRoutes);
  writeFile(apiReferencePath, apiContent);
  console.log(`[OK] Updated API-REFERENCE.md with ${apiRoutes.length} endpoints`);
}

// Update HELP-AND-SUGGESTIONS.md
const helpPath = path.join(DOCS_DIR, 'HELP-AND-SUGGESTIONS.md');
if (categorizedContent.help.length > 0) {
  let helpContent = '\n## Additional Help Content\n\n';
  for (const doc of categorizedContent.help) {
    helpContent += `### From ${doc.filename}\n\n`;
    const paragraphs = doc.content.split('\n\n').slice(0, 5).join('\n\n');
    helpContent += paragraphs + '\n\n';
  }
  
  const existing = readFileIfExists(helpPath) || '';
  if (!existing.includes('Additional Help Content')) {
    writeFile(helpPath, mergeContent(helpPath, helpContent));
    console.log('[OK] Updated HELP-AND-SUGGESTIONS.md');
  }
}

// Update BEST-PRACTICES.md
const bestPracticesPath = path.join(DOCS_DIR, 'BEST-PRACTICES.md');
if (categorizedContent.bestPractices.length > 0) {
  let bestPracticesContent = '\n## Additional Best Practices\n\n';
  for (const doc of categorizedContent.bestPractices) {
    bestPracticesContent += `### From ${doc.filename}\n\n`;
    const paragraphs = doc.content.split('\n\n').slice(0, 5).join('\n\n');
    bestPracticesContent += paragraphs + '\n\n';
  }
  
  const existing = readFileIfExists(bestPracticesPath) || '';
  if (!existing.includes('Additional Best Practices')) {
    writeFile(bestPracticesPath, mergeContent(bestPracticesPath, bestPracticesContent));
    console.log('[OK] Updated BEST-PRACTICES.md');
  }
}

// Update CONDITIONS-AND-RESULTS.md
const conditionsPath = path.join(DOCS_DIR, 'CONDITIONS-AND-RESULTS.md');
if (categorizedContent.conditions.length > 0) {
  let conditionsContent = '\n## Additional Conditions and Edge Cases\n\n';
  for (const doc of categorizedContent.conditions) {
    conditionsContent += `### From ${doc.filename}\n\n`;
    const paragraphs = doc.content.split('\n\n').slice(0, 5).join('\n\n');
    conditionsContent += paragraphs + '\n\n';
  }
  
  const existing = readFileIfExists(conditionsPath) || '';
  if (!existing.includes('Additional Conditions')) {
    writeFile(conditionsPath, mergeContent(conditionsPath, conditionsContent));
    console.log('[OK] Updated CONDITIONS-AND-RESULTS.md');
  }
}

// Update BUSINESS-LOGIC.md
const businessLogicPath = path.join(DOCS_DIR, 'BUSINESS-LOGIC.md');
if (categorizedContent.businessLogic.length > 0) {
  let businessLogicContent = '\n## Additional Business Rules\n\n';
  for (const doc of categorizedContent.businessLogic) {
    businessLogicContent += `### From ${doc.filename}\n\n`;
    const paragraphs = doc.content.split('\n\n').slice(0, 5).join('\n\n');
    businessLogicContent += paragraphs + '\n\n';
  }
  
  const existing = readFileIfExists(businessLogicPath) || '';
  if (!existing.includes('Additional Business Rules')) {
    writeFile(businessLogicPath, mergeContent(businessLogicPath, businessLogicContent));
    console.log('[OK] Updated BUSINESS-LOGIC.md');
  }
}

// Update TERMINAL-USAGE.md
const terminalUsagePath = path.join(DOCS_DIR, 'TERMINAL-USAGE.md');
if (categorizedContent.terminalUsage.length > 0) {
  let terminalContent = '\n## Additional Terminal Commands\n\n';
  for (const doc of categorizedContent.terminalUsage) {
    terminalContent += `### From ${doc.filename}\n\n`;
    const paragraphs = doc.content.split('\n\n').slice(0, 5).join('\n\n');
    terminalContent += paragraphs + '\n\n';
  }
  
  const existing = readFileIfExists(terminalUsagePath) || '';
  if (!existing.includes('Additional Terminal Commands')) {
    writeFile(terminalUsagePath, mergeContent(terminalUsagePath, terminalContent));
    console.log('[OK] Updated TERMINAL-USAGE.md');
  }
}

console.log('\n[SUCCESS] Documentation population complete!');
console.log(`\nSummary:`);
console.log(`- Processed ${rootDocs.length + docsDirFiles.length} documentation files`);
console.log(`- Extracted ${apiRoutes.length} API endpoints`);
console.log(`- Extracted ${allFunctions.length} function definitions`);
console.log(`- Updated documentation structure files`);

