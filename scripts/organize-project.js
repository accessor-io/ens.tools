#!/usr/bin/env node

/**
 * Project Organization Script
 * 
 * Organizes the project structure, renames files for semantic clarity,
 * updates all imports, refactors code, checks for errors, and fixes issues.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');
const BACKUP_DIR = path.join(PROJECT_ROOT, '.backup-organize');

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const NO_BACKUP = args.includes('--no-backup');
const FIX_ERRORS = args.includes('--fix-errors');
const CHECK_ONLY = args.includes('--check-only');
const VERBOSE = args.includes('--verbose');

// Track changes
const changes = {
  renamed: [],
  moved: [],
  importsUpdated: [],
  errors: [],
  fixed: [],
};

// Helper functions
function log(message, level = 'info') {
  if (level === 'verbose' && !VERBOSE) return;
  const prefix = {
    info: 'ℹ',
    success: '✓',
    warning: '⚠',
    error: '✗',
  }[level] || '•';
  console.log(`${prefix} ${message}`);
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return null;
  }
}

function writeFile(filePath, content) {
  if (DRY_RUN) {
    log(`Would write: ${filePath}`, 'verbose');
    return;
  }
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

function moveFile(from, to) {
  if (DRY_RUN) {
    log(`Would move: ${from} -> ${to}`, 'verbose');
    changes.moved.push({ from, to });
    return;
  }
  const dir = path.dirname(to);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.renameSync(from, to);
  changes.moved.push({ from, to });
}

function renameFile(from, to) {
  if (from === to) return;
  if (DRY_RUN) {
    log(`Would rename: ${from} -> ${to}`, 'verbose');
    changes.renamed.push({ from, to });
    return;
  }
  const dir = path.dirname(to);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.renameSync(from, to);
  changes.renamed.push({ from, to });
}

function createBackup() {
  if (NO_BACKUP || DRY_RUN) return;
  log('Creating backup...', 'info');
  try {
    if (fs.existsSync(BACKUP_DIR)) {
      fs.rmSync(BACKUP_DIR, { recursive: true });
    }
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    execSync(`cp -r ${SRC_DIR} ${BACKUP_DIR}/src`, { stdio: 'ignore' });
    log('Backup created', 'success');
  } catch (e) {
    log(`Backup failed: ${e.message}`, 'warning');
  }
}

// Get all TypeScript/TSX files
function getAllSourceFiles(dir = SRC_DIR, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        getAllSourceFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

// Get all markdown files in src
function getMarkdownFiles(dir = SRC_DIR, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        getMarkdownFiles(filePath, fileList);
      }
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

// Convert to kebab-case
function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

// Convert to PascalCase
function toPascalCase(str) {
  return str
    .split(/[-_\s]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

// Check if file should be renamed
function shouldRenameFile(filePath) {
  const fileName = path.basename(filePath);
  const dir = path.dirname(filePath);
  const relativePath = path.relative(SRC_DIR, filePath);
  
  // Skip index files, config files, and test files
  if (fileName === 'index.ts' || fileName === 'index.tsx' || 
      fileName.includes('.config.') || fileName.includes('.test.') ||
      fileName.includes('.spec.')) {
    return null;
  }
  
  // Component files should be PascalCase
  if (relativePath.includes('/components/') && !relativePath.includes('/ui/')) {
    if (!/^[A-Z]/.test(fileName.replace(/\.(ts|tsx)$/, ''))) {
      const baseName = fileName.replace(/\.(ts|tsx)$/, '');
      const newName = toPascalCase(baseName) + path.extname(fileName);
      return path.join(dir, newName);
    }
  }
  
  // Utility/service files should be kebab-case
  if (relativePath.includes('/lib/') || relativePath.includes('/utils/') || 
      relativePath.includes('/services/')) {
    if (!/^[a-z-]/.test(fileName.replace(/\.(ts|tsx)$/, ''))) {
      const baseName = fileName.replace(/\.(ts|tsx)$/, '');
      const newName = toKebabCase(baseName) + path.extname(fileName);
      return path.join(dir, newName);
    }
  }
  
  return null;
}

// Update imports in a file
function updateImportsInFile(filePath, renameMap) {
  let content = readFile(filePath);
  if (!content) return false;
  
  let updated = false;
  const lines = content.split('\n');
  const newLines = lines.map(line => {
    // Match import statements
    const importMatch = line.match(/from\s+['"]([^'"]+)['"]/);
    if (!importMatch) return line;
    
    const importPath = importMatch[1];
    let newPath = importPath;
    
    // Check if this import needs updating
    for (const [oldPath, newPathValue] of Object.entries(renameMap)) {
      if (importPath === oldPath || importPath.startsWith(oldPath + '/')) {
        newPath = importPath.replace(oldPath, newPathValue);
        updated = true;
        break;
      }
      
      // Handle relative paths
      if (importPath.startsWith('.')) {
        const currentDir = path.dirname(filePath);
        const absoluteOldPath = path.resolve(currentDir, oldPath);
        const absoluteFileOldPath = path.resolve(SRC_DIR, oldPath);
        
        if (absoluteOldPath === absoluteFileOldPath) {
          const absoluteNewPath = path.resolve(SRC_DIR, newPathValue);
          const relativeNewPath = path.relative(currentDir, absoluteNewPath);
          newPath = relativeNewPath.startsWith('.') ? relativeNewPath : './' + relativeNewPath;
          updated = true;
          break;
        }
      }
    }
    
    if (newPath !== importPath) {
      return line.replace(importMatch[0], `from '${newPath}'`);
    }
    return line;
  });
  
  if (updated) {
    writeFile(filePath, newLines.join('\n'));
    changes.importsUpdated.push(filePath);
    return true;
  }
  
  return false;
}

// Move markdown files to docs
function organizeMarkdownFiles() {
  log('Organizing markdown files...', 'info');
  const mdFiles = getMarkdownFiles();
  
  mdFiles.forEach(filePath => {
    const fileName = path.basename(filePath);
    const relativePath = path.relative(SRC_DIR, filePath);
    const newPath = path.join(DOCS_DIR, relativePath);
    
    // Skip README files in lib directories
    if (fileName === 'README.md' && relativePath.includes('/lib/')) {
      return;
    }
    
    moveFile(filePath, newPath);
    log(`Moved: ${relativePath} -> docs/${relativePath}`, 'success');
  });
}

// Rename files for semantic clarity
function renameFiles() {
  log('Renaming files for semantic clarity...', 'info');
  const files = getAllSourceFiles();
  const renameMap = {};
  
  // First pass: identify files to rename
  files.forEach(filePath => {
    const newPath = shouldRenameFile(filePath);
    if (newPath && newPath !== filePath) {
      const relativeOld = path.relative(SRC_DIR, filePath);
      const relativeNew = path.relative(SRC_DIR, newPath);
      renameMap[relativeOld] = relativeNew;
    }
  });
  
  // Second pass: rename files
  Object.entries(renameMap).forEach(([oldPath, newPath]) => {
    const oldFullPath = path.join(SRC_DIR, oldPath);
    const newFullPath = path.join(SRC_DIR, newPath);
    
    if (fileExists(oldFullPath) && !fileExists(newFullPath)) {
      renameFile(oldFullPath, newFullPath);
      log(`Renamed: ${oldPath} -> ${newPath}`, 'success');
    }
  });
  
  // Third pass: update imports
  if (Object.keys(renameMap).length > 0) {
    log('Updating imports...', 'info');
    const allFiles = getAllSourceFiles();
    allFiles.forEach(filePath => {
      updateImportsInFile(filePath, renameMap);
    });
  }
  
  return renameMap;
}

// Update relative imports to use proper paths
function fixImportPaths() {
  log('Fixing import paths...', 'info');
  const files = getAllSourceFiles();
  let updatedCount = 0;
  
  files.forEach(filePath => {
    let content = readFile(filePath);
    if (!content) return;
    
    let fileUpdated = false;
    const lines = content.split('\n');
    const newLines = lines.map(line => {
      const importMatch = line.match(/from\s+['"](\.\.?\/[^'"]+)['"]/);
      if (!importMatch) return line;
      
      const importPath = importMatch[1];
      const currentDir = path.dirname(filePath);
      let targetPath = path.resolve(currentDir, importPath);
      
      // Remove file extension if present
      targetPath = targetPath.replace(/\.(ts|tsx|js|jsx)$/, '');
      
      // Check if target exists
      if (!fileExists(targetPath)) {
        // Try to find the file with extensions
        const possiblePaths = [
          targetPath + '.ts',
          targetPath + '.tsx',
          targetPath + '.js',
          targetPath + '.jsx',
          path.join(targetPath, 'index.ts'),
          path.join(targetPath, 'index.tsx'),
          path.join(targetPath, 'index.js'),
          path.join(targetPath, 'index.jsx'),
        ];
        
        const found = possiblePaths.find(p => fileExists(p));
        if (found) {
          const relativePath = path.relative(currentDir, found.replace(/\.(ts|tsx|js|jsx)$/, ''));
          let newImport = relativePath.startsWith('.') ? relativePath : './' + relativePath;
          // Normalize path separators
          newImport = newImport.replace(/\\/g, '/');
          updatedCount++;
          fileUpdated = true;
          return line.replace(importMatch[0], `from '${newImport}'`);
        } else {
          // Only log as error if it's not a node_modules import
          if (!importPath.includes('node_modules')) {
            changes.errors.push({
              file: filePath,
              error: `Import not found: ${importPath}`,
            });
          }
        }
      }
      
      return line;
    });
    
    if (fileUpdated) {
      writeFile(filePath, newLines.join('\n'));
    }
  });
  
  if (updatedCount > 0) {
    log(`Fixed ${updatedCount} import paths`, 'success');
  }
}

// Run TypeScript type checking
function checkTypeScript() {
  log('Running TypeScript type check...', 'info');
  try {
    const result = execSync('npx tsc --noEmit', {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    log('TypeScript check passed', 'success');
    return true;
  } catch (e) {
    const errors = (e.stdout || e.stderr || '').toString();
    if (errors.trim()) {
      log('TypeScript errors found:', 'warning');
      // Only show first few errors to avoid overwhelming output
      const errorLines = errors.split('\n').slice(0, 20);
      console.log(errorLines.join('\n'));
      if (errors.split('\n').length > 20) {
        console.log('... (more errors truncated)');
      }
      changes.errors.push({
        file: 'TypeScript compilation',
        error: `Found ${errors.split('error TS').length - 1} TypeScript errors`,
      });
    }
    return false;
  }
}

// Fix common errors
function fixCommonErrors() {
  if (!FIX_ERRORS) return;
  
  log('Fixing common errors...', 'info');
  const files = getAllSourceFiles();
  let fixedCount = 0;
  
  files.forEach(filePath => {
    let content = readFile(filePath);
    if (!content) return;
    
    let updated = false;
    const lines = content.split('\n');
    const newLines = lines.map(line => {
      // Fix double imports
      if (line.trim().startsWith('import ') && line.includes('import ')) {
        updated = true;
        fixedCount++;
        return line.replace(/import\s+.*?import\s+/, 'import ');
      }
      
      // Fix missing semicolons in imports
      if (line.trim().startsWith('import ') && !line.trim().endsWith(';') && line.includes("from")) {
        updated = true;
        fixedCount++;
        return line + ';';
      }
      
      return line;
    });
    
    if (updated) {
      writeFile(filePath, newLines.join('\n'));
      changes.fixed.push(filePath);
    }
  });
  
  if (fixedCount > 0) {
    log(`Fixed ${fixedCount} common errors`, 'success');
  }
}

// Generate summary report
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('ORGANIZATION SUMMARY');
  console.log('='.repeat(60));
  
  if (changes.moved.length > 0) {
    console.log(`\nFiles moved: ${changes.moved.length}`);
    changes.moved.forEach(({ from, to }) => {
      console.log(`  ${path.relative(SRC_DIR, from)} -> ${path.relative(DOCS_DIR, to)}`);
    });
  }
  
  if (changes.renamed.length > 0) {
    console.log(`\nFiles renamed: ${changes.renamed.length}`);
    changes.renamed.forEach(({ from, to }) => {
      console.log(`  ${path.relative(SRC_DIR, from)} -> ${path.relative(SRC_DIR, to)}`);
    });
  }
  
  if (changes.importsUpdated.length > 0) {
    console.log(`\nFiles with updated imports: ${changes.importsUpdated.length}`);
  }
  
  if (changes.fixed.length > 0) {
    console.log(`\nFiles fixed: ${changes.fixed.length}`);
  }
  
  if (changes.errors.length > 0) {
    console.log(`\nErrors found: ${changes.errors.length}`);
    changes.errors.forEach(({ file, error }) => {
      console.log(`  ${file}: ${error.substring(0, 100)}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
}

// Main execution
function main() {
  console.log('Project Organization Script');
  console.log('='.repeat(60));
  
  if (DRY_RUN) {
    log('DRY RUN MODE - No changes will be made', 'warning');
  }
  
  if (CHECK_ONLY) {
    log('CHECK ONLY MODE - Only checking for issues', 'info');
  }
  
  try {
    // Ensure docs directory exists
    if (!fs.existsSync(DOCS_DIR)) {
      fs.mkdirSync(DOCS_DIR, { recursive: true });
    }
    
    // Create backup
    if (!CHECK_ONLY) {
      createBackup();
    }
    
    // Organize markdown files
    if (!CHECK_ONLY) {
      organizeMarkdownFiles();
    }
    
    // Rename files
    if (!CHECK_ONLY) {
      renameFiles();
    }
    
    // Fix import paths
    if (!CHECK_ONLY) {
      fixImportPaths();
    }
    
    // Fix common errors
    if (!CHECK_ONLY && FIX_ERRORS) {
      fixCommonErrors();
    }
    
    // Check TypeScript
    checkTypeScript();
    
    // Generate report
    generateReport();
    
    if (DRY_RUN) {
      log('\nDry run complete. Run without --dry-run to apply changes.', 'info');
    } else if (CHECK_ONLY) {
      log('\nCheck complete.', 'info');
    } else {
      log('\nOrganization complete!', 'success');
      if (changes.errors.length > 0) {
        log('Some errors were found. Please review and fix manually.', 'warning');
      }
    }
    
  } catch (error) {
    log(`Error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { main };

