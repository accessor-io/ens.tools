#!/usr/bin/env node

/**
 * Documentation Consolidation Script
 * 
 * Consolidates all documentation files into a single location (docs/ directory).
 * Moves all documentation from root and other locations into docs/.
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const PROJECT_ROOT = path.join(__dirname, '..');

// Files to preserve in root (should not be moved)
const PRESERVE_IN_ROOT = [
  'README.md',
];

// Helper functions
function readFileIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return null;
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function findMarkdownFiles(dir, recursive = false) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Skip certain directories
    if (entry.isDirectory()) {
      const dirName = entry.name;
      if (dirName === 'node_modules' || 
          dirName === '.git' || 
          dirName === 'build' || 
          dirName === 'dist' ||
          dirName === 'docs' ||
          dirName === 'documentation-compiled' ||
          dirName === '.vscode' ||
          dirName === '.idea') {
        continue;
      }
      
      if (recursive) {
        files.push(...findMarkdownFiles(fullPath, recursive));
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function getFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch (e) {
    return 0;
  }
}

function consolidateDocumentation(dryRun = false) {
  console.log('Consolidating documentation into docs/ directory...\n');
  if (dryRun) {
    console.log('[DRY RUN] No files will be modified\n');
  }
  
  ensureDir(DOCS_DIR);
  
  const actions = {
    moved: [],
    skipped: [],
    errors: [],
  };
  
  // Step 1: Move all .md files from root to docs/
  console.log('[INFO] Scanning root directory for documentation files...');
  const rootFiles = findMarkdownFiles(PROJECT_ROOT, false);
  
  for (const rootFile of rootFiles) {
    const filename = path.basename(rootFile);
    
    // Skip files that should stay in root
    if (PRESERVE_IN_ROOT.includes(filename)) {
      console.log(`[SKIP] ${filename} (preserved in root)`);
      actions.skipped.push(rootFile);
      continue;
    }
    
    const targetPath = path.join(DOCS_DIR, filename);
    
    // Check if file already exists in docs/
    if (fs.existsSync(targetPath)) {
      const rootSize = getFileSize(rootFile);
      const targetSize = getFileSize(targetPath);
      
      // If root file is larger or different, ask what to do
      // For now, keep the one in docs/ and remove root
      console.log(`[REMOVE] ${filename} (exists in docs/, keeping docs/ version)`);
      if (!dryRun) {
        try {
          fs.unlinkSync(rootFile);
          actions.moved.push({ from: rootFile, to: 'removed (duplicate)' });
        } catch (e) {
          console.error(`[ERROR] Failed to remove ${rootFile}:`, e.message);
          actions.errors.push({ file: rootFile, error: e.message });
        }
      }
    } else {
      // Move file to docs/
      console.log(`[MOVE] ${filename} -> docs/`);
      if (!dryRun) {
        try {
          fs.renameSync(rootFile, targetPath);
          actions.moved.push({ from: rootFile, to: targetPath });
        } catch (e) {
          console.error(`[ERROR] Failed to move ${rootFile}:`, e.message);
          actions.errors.push({ file: rootFile, error: e.message });
        }
      }
    }
  }
  
  // Step 2: Check for documentation in subdirectories (excluding docs/)
  console.log('\n[INFO] Scanning subdirectories for documentation files...');
  const subdirs = ['server', 'src'];
  
  for (const subdir of subdirs) {
    const subdirPath = path.join(PROJECT_ROOT, subdir);
    if (!fs.existsSync(subdirPath)) continue;
    
    const subdirFiles = findMarkdownFiles(subdirPath, true);
    
    for (const subdirFile of subdirFiles) {
      const filename = path.basename(subdirFile);
      const relativePath = path.relative(PROJECT_ROOT, subdirFile);
      
      // Skip if it's a README in its own directory (those should stay)
      const dirName = path.dirname(relativePath);
      if (filename === 'README.md' && dirName !== '.') {
        console.log(`[SKIP] ${relativePath} (README in ${dirName}/)`);
        actions.skipped.push(subdirFile);
        continue;
      }
      
      // For other docs, move to docs/ with a prefix to indicate origin
      const newFilename = `${subdir.toUpperCase()}-${filename}`;
      const targetPath = path.join(DOCS_DIR, newFilename);
      
      if (fs.existsSync(targetPath)) {
        console.log(`[SKIP] ${relativePath} (${newFilename} already exists)`);
        actions.skipped.push(subdirFile);
        continue;
      }
      
      console.log(`[MOVE] ${relativePath} -> docs/${newFilename}`);
      if (!dryRun) {
        try {
          fs.copyFileSync(subdirFile, targetPath);
          // Don't delete the original if it's a README in a subdirectory
          if (filename !== 'README.md') {
            fs.unlinkSync(subdirFile);
          }
          actions.moved.push({ from: subdirFile, to: targetPath });
        } catch (e) {
          console.error(`[ERROR] Failed to move ${subdirFile}:`, e.message);
          actions.errors.push({ file: subdirFile, error: e.message });
        }
      }
    }
  }
  
  // Step 3: Create a consolidation report
  console.log('\n---\n');
  console.log('Consolidation Summary:');
  console.log(`- Files moved: ${actions.moved.length}`);
  console.log(`- Files skipped: ${actions.skipped.length}`);
  console.log(`- Errors: ${actions.errors.length}`);
  
  if (actions.moved.length > 0) {
    console.log('\nFiles moved:');
    actions.moved.forEach(action => {
      console.log(`  - ${path.relative(PROJECT_ROOT, action.from)} -> ${path.relative(PROJECT_ROOT, action.to)}`);
    });
  }
  
  if (actions.errors.length > 0) {
    console.log('\nErrors:');
    actions.errors.forEach(err => {
      console.log(`  - ${err.file}: ${err.error}`);
    });
  }
  
  // Step 4: Generate consolidated index
  if (!dryRun && actions.moved.length > 0) {
    console.log('\n[INFO] Updating documentation index...');
    updateDocumentationIndex();
  }
  
  if (dryRun) {
    console.log('\n[DRY RUN] No files were actually modified.');
    console.log('Run without --dry-run to apply changes.');
  } else {
    console.log('\n[SUCCESS] Documentation consolidation complete!');
    console.log(`\nAll documentation is now in: ${DOCS_DIR}`);
  }
  
  return actions;
}

function updateDocumentationIndex() {
  const indexPath = path.join(DOCS_DIR, 'DOCUMENTATION-INDEX.md');
  const existingIndex = readFileIfExists(indexPath) || '';
  
  // Get all documentation files
  const allDocs = findMarkdownFiles(DOCS_DIR, false)
    .map(f => path.basename(f))
    .filter(f => f !== 'DOCUMENTATION-INDEX.md')
    .sort();
  
  let indexContent = `# Documentation Index\n\n`;
  indexContent += `**Last Updated**: ${new Date().toISOString().split('T')[0]}\n\n`;
  indexContent += `This directory contains all documentation for ENS Tools.\n\n`;
  indexContent += `## Total Files: ${allDocs.length}\n\n`;
  indexContent += `## All Documentation Files\n\n`;
  
  // Group by category
  const categories = {
    'Core Documentation': [],
    'Implementation': [],
    'Features': [],
    'Setup & Deployment': [],
    'Security': [],
    'Legal & Compliance': [],
    'Other': [],
  };
  
  for (const doc of allDocs) {
    const upperDoc = doc.toUpperCase();
    if (doc.startsWith('PROJECT-') || doc.startsWith('API-') || 
        doc.startsWith('FUNCTIONALITY') || doc.startsWith('CODE-') ||
        doc.startsWith('TERMINAL-') || doc.startsWith('BUSINESS-')) {
      categories['Core Documentation'].push(doc);
    } else if (doc.includes('IMPLEMENTATION') || doc.includes('INTEGRATION') ||
               doc.includes('COMPLETE') || doc.includes('SUMMARY')) {
      categories['Implementation'].push(doc);
    } else if (doc.includes('FEATURE') || doc.includes('MARKETPLACE') ||
               doc.includes('SCHEMA') || doc.includes('ACTION')) {
      categories['Features'].push(doc);
    } else if (doc.includes('PRODUCTION') || doc.includes('SETUP') ||
               doc.includes('DEPLOYMENT') || doc.includes('TOOLING')) {
      categories['Setup & Deployment'].push(doc);
    } else if (doc.includes('SECURITY') || doc.includes('AUDIT') ||
               doc.includes('VULNERABILITY')) {
      categories['Security'].push(doc);
    } else if (doc.includes('PRIVACY') || doc.includes('TERMS') ||
               doc.includes('LEGAL') || doc.includes('AGREEMENT') ||
               doc.includes('POLICY') || doc.includes('RISK') ||
               doc.includes('COMPLIANCE')) {
      categories['Legal & Compliance'].push(doc);
    } else {
      categories['Other'].push(doc);
    }
  }
  
  for (const [category, files] of Object.entries(categories)) {
    if (files.length > 0) {
      indexContent += `### ${category}\n\n`;
      for (const file of files) {
        const link = file.replace('.md', '');
        indexContent += `- [${file}](./${file})\n`;
      }
      indexContent += '\n';
    }
  }
  
  fs.writeFileSync(indexPath, indexContent, 'utf-8');
  console.log(`[OK] Updated DOCUMENTATION-INDEX.md`);
}

// Command line argument parsing
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-d');

// Run consolidation
consolidateDocumentation(dryRun);






