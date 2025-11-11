#!/usr/bin/env node

/**
 * Project Refactor and Organize Script
 * 
 * Organizes the project structure, renames files for semantic purposes,
 * updates imports and refactors where needed, checks for errors, and fixes issues.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const SERVER_DIR = path.join(PROJECT_ROOT, 'server');
const BACKUP_DIR = path.join(PROJECT_ROOT, '.refactor-backup');

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const NO_BACKUP = args.includes('--no-backup');
const FIX_ERRORS = args.includes('--fix-errors');
const CHECK_ONLY = args.includes('--check-only');
const VERBOSE = args.includes('--verbose');

// Change log
const changes = {
  renamed: [],
  moved: [],
  importsUpdated: [],
  errors: [],
  warnings: []
};

// File extension patterns
const TS_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const CONFIG_FILES = ['tsconfig.json', 'package.json', 'vite.config.ts', 'vitest.config.ts'];

/**
 * Get all TypeScript/JavaScript files in a directory
 */
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, build, dist, and backup directories
      if (!['node_modules', 'build', 'dist', '.refactor-backup', '.git'].includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else if (TS_EXTENSIONS.some(ext => file.endsWith(ext))) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Read file content
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return null;
  }
}

/**
 * Write file content
 */
function writeFile(filePath, content) {
  if (!DRY_RUN) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}

/**
 * Check if a file name follows semantic naming conventions
 */
function needsRename(filePath) {
  const fileName = path.basename(filePath);
  const dir = path.dirname(filePath);
  const ext = path.extname(fileName);
  const baseName = fileName.slice(0, -ext.length);
  
  // Skip config files and index files
  if (CONFIG_FILES.includes(fileName) || baseName === 'index') {
    return false;
  }
  
  // UI components in ui/ directory should stay kebab-case (shadcn/ui convention)
  const isUIDir = dir.includes('/ui/') || dir.endsWith('/ui');
  if (isUIDir) {
    // UI components should be kebab-case
    const isKebabCase = /^[a-z]+(-[a-z]+)*$/.test(baseName);
    if (!isKebabCase && !baseName.includes('.')) {
      return { shouldRename: true, suggestedName: toKebabCase(baseName) + ext };
    }
    return false;
  }
  
  // Skip entry points and common files
  const entryFiles = ['main', 'index', 'app', 'types', 'config'];
  if (entryFiles.includes(baseName.toLowerCase())) {
    return false;
  }
  
  // Hooks should be camelCase (useXxx pattern) - React convention
  const isHook = baseName.startsWith('use') && /^use[A-Z][a-zA-Z0-9]*$/.test(baseName);
  if (isHook) {
    return false; // Hooks are fine in camelCase
  }
  
  // Check if it's a component (PascalCase expected)
  const isComponent = ext === '.tsx' || ext === '.jsx';
  const isComponentDir = dir.includes('components') || dir.includes('Component');
  
  if (isComponent || isComponentDir) {
    // Components should be PascalCase (except UI components)
    const isPascalCase = /^[A-Z][a-zA-Z0-9]*$/.test(baseName);
    if (!isPascalCase && !baseName.includes('.')) {
      return { shouldRename: true, suggestedName: toPascalCase(baseName) + ext };
    }
  } else {
    // Utilities, services, etc. should be kebab-case
    const isKebabCase = /^[a-z]+(-[a-z]+)*$/.test(baseName);
    if (!isKebabCase && !baseName.includes('.')) {
      return { shouldRename: true, suggestedName: toKebabCase(baseName) + ext };
    }
  }
  
  return false;
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str) {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/\s/g, '');
}

/**
 * Convert string to kebab-case
 */
function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Extract all imports from a file
 */
function extractImports(content) {
  const imports = [];
  const importRegex = /import\s+(?:(?:(?:[\w*{}\s,]+)\s+from\s+)?['"]([^'"]+)['"])|(?:['"]([^'"]+)['"])/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1] || match[2];
    if (importPath && !importPath.startsWith('http')) {
      imports.push({
        fullMatch: match[0],
        path: importPath,
        index: match.index
      });
    }
  }
  
  return imports;
}

/**
 * Update import path in content
 */
function updateImportPath(content, oldPath, newPath) {
  // Handle relative imports
  const patterns = [
    new RegExp(`(['"])${escapeRegex(oldPath)}(['"])`, 'g'),
    new RegExp(`(['"])${escapeRegex(oldPath.replace(/\.tsx?$/, ''))}(['"])`, 'g'),
    new RegExp(`(['"])${escapeRegex(oldPath.replace(/\.tsx?$/, ''))}/index(['"])`, 'g')
  ];
  
  let updated = content;
  patterns.forEach(pattern => {
    updated = updated.replace(pattern, (match, quote1, quote2) => {
      return quote1 + newPath + quote2;
    });
  });
  
  return updated;
}

/**
 * Escape regex special characters
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Calculate relative path between two files
 */
function getRelativePath(from, to) {
  const relative = path.relative(path.dirname(from), to);
  return relative.startsWith('.') ? relative : './' + relative;
}

/**
 * Create backup
 */
function createBackup() {
  if (NO_BACKUP || DRY_RUN) return;
  
  console.log('Creating backup...');
  if (fs.existsSync(BACKUP_DIR)) {
    fs.rmSync(BACKUP_DIR, { recursive: true });
  }
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  
  // Backup src and server directories
  ['src', 'server'].forEach(dir => {
    const sourceDir = path.join(PROJECT_ROOT, dir);
    if (fs.existsSync(sourceDir)) {
      const destDir = path.join(BACKUP_DIR, dir);
      copyDirectory(sourceDir, destDir);
    }
  });
  
  console.log('Backup created at:', BACKUP_DIR);
}

/**
 * Copy directory recursively
 */
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      if (!['node_modules', 'build', 'dist'].includes(entry.name)) {
        copyDirectory(srcPath, destPath);
      }
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Rename file and update all imports
 */
function renameFile(oldPath, newPath) {
  if (oldPath === newPath) return;
  
  const relativeOld = path.relative(PROJECT_ROOT, oldPath);
  const relativeNew = path.relative(PROJECT_ROOT, newPath);
  
  if (VERBOSE) {
    console.log(`Renaming: ${relativeOld} -> ${relativeNew}`);
  }
  
  if (!DRY_RUN) {
    // Ensure destination directory exists
    const destDir = path.dirname(newPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    // Move file
    fs.renameSync(oldPath, newPath);
    changes.renamed.push({ from: relativeOld, to: relativeNew });
    
    // Update all imports
    updateAllImports(oldPath, newPath);
  } else {
    changes.renamed.push({ from: relativeOld, to: relativeNew });
  }
}

/**
 * Resolve import path to actual file
 */
function resolveImportPath(importPath, fromFile) {
  if (importPath.startsWith('.')) {
    // Relative import
    const resolved = path.resolve(path.dirname(fromFile), importPath);
    
    // Try with different extensions
    for (const ext of ['.ts', '.tsx', '.js', '.jsx', '']) {
      const withExt = resolved + ext;
      if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
        return withExt;
      }
      
      // Try index file
      const indexFile = path.join(resolved, 'index' + ext);
      if (fs.existsSync(indexFile) && fs.statSync(indexFile).isFile()) {
        return indexFile;
      }
    }
    
    return resolved;
  } else {
    // Absolute import (from src/, server/, etc.)
    const possiblePaths = [
      path.join(PROJECT_ROOT, 'src', importPath),
      path.join(PROJECT_ROOT, 'server', importPath),
      path.join(PROJECT_ROOT, importPath)
    ];
    
    for (const basePath of possiblePaths) {
      for (const ext of ['.ts', '.tsx', '.js', '.jsx', '']) {
        const withExt = basePath + ext;
        if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
          return withExt;
        }
        
        // Try index file
        const indexFile = path.join(basePath, 'index' + ext);
        if (fs.existsSync(indexFile) && fs.statSync(indexFile).isFile()) {
          return indexFile;
        }
      }
    }
    
    return null;
  }
}

/**
 * Update all imports referencing a file
 */
function updateAllImports(oldPath, newPath) {
  const allFiles = [
    ...getAllFiles(SRC_DIR),
    ...getAllFiles(SERVER_DIR)
  ];
  
  const oldRelative = path.relative(PROJECT_ROOT, oldPath);
  const newRelative = path.relative(PROJECT_ROOT, newPath);
  
  // Remove extensions for import matching
  const oldPathNoExt = oldRelative.replace(/\.(tsx?|jsx?)$/, '');
  const newPathNoExt = newRelative.replace(/\.(tsx?|jsx?)$/, '');
  const oldFileName = path.basename(oldPathNoExt);
  const newFileName = path.basename(newPathNoExt);
  
  // Update barrel exports (index.ts files)
  const oldDir = path.dirname(oldPath);
  const newDir = path.dirname(newPath);
  const oldIndexPath = path.join(oldDir, 'index.ts');
  const newIndexPath = path.join(newDir, 'index.ts');
  
  // Update old index.ts if it exists
  if (fs.existsSync(oldIndexPath) && oldIndexPath !== newIndexPath) {
    let indexContent = readFile(oldIndexPath);
    if (indexContent) {
      // Update exports that reference the old file
      const exportPattern = new RegExp(`from\\s+['"]\\./${escapeRegex(oldFileName)}(['"])`, 'g');
      indexContent = indexContent.replace(exportPattern, `from './${newFileName}$1`);
      writeFile(oldIndexPath, indexContent);
    }
  }
  
  // Update new index.ts if it exists
  if (fs.existsSync(newIndexPath)) {
    let indexContent = readFile(newIndexPath);
    if (indexContent) {
      // Update exports that reference the old file name
      const exportPattern = new RegExp(`from\\s+['"]\\./${escapeRegex(oldFileName)}(['"])`, 'g');
      if (exportPattern.test(indexContent)) {
        indexContent = indexContent.replace(exportPattern, `from './${newFileName}$1`);
        writeFile(newIndexPath, indexContent);
      }
    }
  }
  
  allFiles.forEach(file => {
    const content = readFile(file);
    if (!content) return;
    
    const imports = extractImports(content);
    let updated = content;
    let hasChanges = false;
    
    imports.forEach(imp => {
      let importPath = imp.path;
      const resolvedPath = resolveImportPath(importPath, file);
      
      if (resolvedPath && path.resolve(resolvedPath) === path.resolve(oldPath)) {
        // This import points to the old file
        const newRelativePath = getRelativePath(file, newPath).replace(/\.(tsx?|jsx?)$/, '');
        const newImportPath = importPath.startsWith('.') 
          ? newRelativePath 
          : importPath.replace(oldPathNoExt, newPathNoExt);
        
        updated = updated.replace(imp.fullMatch, imp.fullMatch.replace(importPath, newImportPath));
        hasChanges = true;
      } else if (importPath.includes(oldPathNoExt) || importPath.includes(oldFileName)) {
        // Handle imports that reference the old path in the string
        const newImportPath = importPath
          .replace(oldPathNoExt, newPathNoExt)
          .replace(oldFileName, newFileName);
        
        if (newImportPath !== importPath) {
          updated = updated.replace(imp.fullMatch, imp.fullMatch.replace(importPath, newImportPath));
          hasChanges = true;
        }
      }
    });
    
    if (hasChanges) {
      writeFile(file, updated);
      changes.importsUpdated.push(path.relative(PROJECT_ROOT, file));
    }
  });
}

/**
 * Check TypeScript errors
 */
function checkTypeScriptErrors() {
  console.log('\nChecking TypeScript errors...');
  
  // Check if TypeScript is available
  const tsConfigPath = path.join(PROJECT_ROOT, 'tsconfig.json');
  if (!fs.existsSync(tsConfigPath)) {
    console.log('No tsconfig.json found, skipping TypeScript check.');
    return true;
  }
  
  try {
    // Try using local TypeScript first, then npx
    let command = 'tsc --noEmit';
    try {
      execSync('which tsc', { stdio: 'pipe' });
    } catch (e) {
      // Try with npx, but check if typescript is in node_modules
      const tsPath = path.join(PROJECT_ROOT, 'node_modules', '.bin', 'tsc');
      if (fs.existsSync(tsPath)) {
        command = path.relative(PROJECT_ROOT, tsPath) + ' --noEmit';
      } else {
        command = 'npx --yes tsc --noEmit';
      }
    }
    
    const result = execSync(command, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    if (VERBOSE) {
      console.log(result);
    }
    console.log('No TypeScript errors found.');
    return true;
  } catch (error) {
    // If TypeScript is not installed, that's okay - just warn
    if (error.message && error.message.includes('not the tsc command')) {
      console.log('TypeScript compiler not available. Install with: npm install -D typescript');
      changes.warnings.push('TypeScript compiler not available');
      return true; // Don't treat this as an error
    }
    
    const errorOutput = error.stdout || error.stderr || error.message;
    console.error('TypeScript errors found:');
    console.error(errorOutput);
    changes.errors.push('TypeScript compilation errors');
    return false;
  }
}

/**
 * Organize files by analyzing structure
 */
function organizeFiles() {
  console.log('\nAnalyzing file structure...');
  
  const allFiles = [
    ...getAllFiles(SRC_DIR),
    ...getAllFiles(SERVER_DIR)
  ];
  
  const filesToRename = [];
  
  allFiles.forEach(file => {
    const renameInfo = needsRename(file);
    if (renameInfo && renameInfo.shouldRename) {
      const newPath = path.join(path.dirname(file), renameInfo.suggestedName);
      filesToRename.push({ oldPath: file, newPath });
    }
  });
  
  if (filesToRename.length > 0) {
    console.log(`\nFound ${filesToRename.length} files that need renaming:`);
    filesToRename.forEach(({ oldPath, newPath }) => {
      const relOld = path.relative(PROJECT_ROOT, oldPath);
      const relNew = path.relative(PROJECT_ROOT, newPath);
      console.log(`  ${relOld} -> ${relNew}`);
    });
    
    if (!CHECK_ONLY) {
      console.log('\nApplying renames...');
      filesToRename.forEach(({ oldPath, newPath }) => {
        renameFile(oldPath, newPath);
      });
    }
  } else {
    console.log('No files need renaming.');
  }
}

/**
 * Fix common code issues
 */
function fixCodeIssues() {
  if (!FIX_ERRORS || CHECK_ONLY) return;
  
  console.log('\nFixing common code issues...');
  
  const allFiles = [
    ...getAllFiles(SRC_DIR),
    ...getAllFiles(SERVER_DIR)
  ];
  
  allFiles.forEach(file => {
    let content = readFile(file);
    if (!content) return;
    
    let updated = content;
    let hasChanges = false;
    
    // Remove unused imports (basic check)
    // This is a simplified version - a full implementation would use a parser
    
    // Fix double newlines
    updated = updated.replace(/\n{3,}/g, '\n\n');
    
    if (updated !== content) {
      writeFile(file, updated);
      hasChanges = true;
    }
  });
}

/**
 * Generate report
 */
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('REFACTORING REPORT');
  console.log('='.repeat(60));
  
  if (changes.renamed.length > 0) {
    console.log(`\nRenamed ${changes.renamed.length} files:`);
    changes.renamed.forEach(({ from, to }) => {
      console.log(`  ${from} -> ${to}`);
    });
  }
  
  if (changes.moved.length > 0) {
    console.log(`\nMoved ${changes.moved.length} files:`);
    changes.moved.forEach(({ from, to }) => {
      console.log(`  ${from} -> ${to}`);
    });
  }
  
  if (changes.importsUpdated.length > 0) {
    console.log(`\nUpdated imports in ${changes.importsUpdated.length} files`);
    if (VERBOSE) {
      changes.importsUpdated.forEach(file => {
        console.log(`  ${file}`);
      });
    }
  }
  
  if (changes.errors.length > 0) {
    console.log(`\nErrors found: ${changes.errors.length}`);
    changes.errors.forEach(error => {
      console.log(`  - ${error}`);
    });
  }
  
  if (changes.warnings.length > 0) {
    console.log(`\nWarnings: ${changes.warnings.length}`);
    changes.warnings.forEach(warning => {
      console.log(`  - ${warning}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
}

/**
 * Main execution
 */
function main() {
  console.log('Project Refactor and Organize');
  console.log('='.repeat(60));
  
  if (DRY_RUN) {
    console.log('DRY RUN MODE - No changes will be made');
  }
  
  if (CHECK_ONLY) {
    console.log('CHECK ONLY MODE - Only checking for issues');
  }
  
  // Create backup
  if (!DRY_RUN && !CHECK_ONLY) {
    createBackup();
  }
  
  // Organize files
  organizeFiles();
  
  // Fix code issues
  if (FIX_ERRORS) {
    fixCodeIssues();
  }
  
  // Check for errors
  if (!CHECK_ONLY) {
    checkTypeScriptErrors();
  }
  
  // Generate report
  generateReport();
  
  if (DRY_RUN) {
    console.log('\nThis was a dry run. Use without --dry-run to apply changes.');
  }
  
  if (!NO_BACKUP && !DRY_RUN && !CHECK_ONLY) {
    console.log(`\nBackup available at: ${BACKUP_DIR}`);
  }
}

// Run main
main();

