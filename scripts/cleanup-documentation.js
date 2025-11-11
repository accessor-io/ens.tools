#!/usr/bin/env node

/**
 * Documentation Cleanup Script
 * 
 * Cleans up documentation files by:
 * - Removing duplicate files
 * - Moving root-level docs to docs/ directory
 * - Removing old .txt files from documentation-compiled
 * - Removing empty or very small files
 * - Organizing documentation structure
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const PROJECT_ROOT = path.join(__dirname, '..');
const COMPILED_DIR = path.join(PROJECT_ROOT, 'documentation-compiled');

// Files to preserve (core documentation structure)
const CORE_DOCS = [
  'README.md',
  'PROJECT-OVERVIEW.md',
  'FUNCTIONALITY.md',
  'API-REFERENCE.md',
  'CODE-USAGE.md',
  'TERMINAL-USAGE.md',
  'BUSINESS-LOGIC.md',
  'CONDITIONS-AND-RESULTS.md',
  'HELP-AND-SUGGESTIONS.md',
  'BEST-PRACTICES.md',
  'PRIVACY-POLICY.md',
  'USER-AGREEMENTS.md',
  'TERMS-OF-AGREEMENT.md',
  'USAGE-POLICY.md',
  'WEB3-PROVIDER-DISCLOSURE.md',
  'FINANCIAL-RISK-DISCLOSURE.md',
  'LEGAL-COMPLIANCE.md',
  'DOCUMENTATION-INDEX.md',
];

// Files that should be moved from root to docs/
const ROOT_DOCS_TO_MOVE = [
  'IMPLEMENTATION-COMPLETE.md',
  'IMPLEMENTATION-SUMMARY.md',
  'INTEGRATION-COMPLETE.md',
  'ENSIP19-IMPLEMENTATION.md',
  'ENSIP19-QUICKSTART.md',
  'DELEGATION-SYSTEM-DOCUMENTATION.md',
  'BASE-METADATA-IMPLEMENTATION.md',
  'AUDIT-LOG-IMPLEMENTATION.md',
  'PRODUCTION-SETUP.md',
  'PRODUCTION-SEAPORT-IMPLEMENTATION.md',
  'ENS-MARKETPLACE-DOCUMENTATION.md',
  'MARKETPLACE-IMPLEMENTATION.md',
  'CONTRACT-NAMING-IMPROVEMENTS.md',
  'SCHEMA-PREVIEW-EDITOR.md',
  'TOOLING-ORGANIZATION.md',
  'TOOLING-ORGANIZATION-COMPLETE.md',
  'IMPORT-REVIEW-COMPLETE.md',
  'PRODUCTION-UPDATE-SUMMARY.md',
  'PRESENTATION-SCRIPT.md',
  'COST-ESTIMATE-SINCE-SEPT-10-2024.md',
  'PROJECT-HOURS-ESTIMATE-REPORT.md',
  'ENS-ENTERPRISE-FEATURES.md',
  'COMPREHENSIVE-FEATURES.md',
  'FIXES-APPLIED.md',
];

// Helper functions
function readFileIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return null;
  }
}

function getFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch (e) {
    return 0;
  }
}

function findMarkdownFiles(dir, recursive = false) {
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

function areFilesSimilar(file1, file2, threshold = 0.95) {
  const content1 = readFileIfExists(file1);
  const content2 = readFileIfExists(file2);
  
  if (!content1 || !content2) return false;
  
  // Only consider files similar if they're nearly identical
  // Compare first 2000 chars for exact match
  const sample1 = content1.substring(0, 2000);
  const sample2 = content2.substring(0, 2000);
  
  if (sample1 === sample2) return true;
  
  // For very high threshold, only consider if one is almost entirely contained in the other
  // and they're very close in size
  const size1 = content1.length;
  const size2 = content2.length;
  const sizeRatio = Math.min(size1, size2) / Math.max(size1, size2);
  
  // Only consider similar if size ratio is very high (>0.9) AND content starts match
  if (sizeRatio > 0.9 && sample1.substring(0, 500) === sample2.substring(0, 500)) {
    return true;
  }
  
  return false;
}

// Main cleanup function
function cleanupDocumentation(dryRun = false) {
  console.log('Cleaning up documentation files...\n');
  if (dryRun) {
    console.log('[DRY RUN] No files will be modified\n');
  }
  
  const actions = {
    moved: [],
    removed: [],
    cleaned: [],
  };
  
  // Step 1: Move root-level docs to docs/ directory
  console.log('[INFO] Checking for root-level documentation files...');
  for (const docFile of ROOT_DOCS_TO_MOVE) {
    const rootPath = path.join(PROJECT_ROOT, docFile);
    const docsPath = path.join(DOCS_DIR, docFile);
    
    if (fs.existsSync(rootPath)) {
      if (fs.existsSync(docsPath)) {
        // Both exist - check if they're the same
        if (areFilesSimilar(rootPath, docsPath)) {
          console.log(`[REMOVE] ${docFile} (duplicate in docs/)`);
          if (!dryRun) {
            fs.unlinkSync(rootPath);
            actions.removed.push(rootPath);
          }
        } else {
          // Different - keep the one in docs/ and remove root
          console.log(`[REMOVE] ${docFile} (keeping docs/ version)`);
          if (!dryRun) {
            fs.unlinkSync(rootPath);
            actions.removed.push(rootPath);
          }
        }
      } else {
        // Only in root - move to docs/
        console.log(`[MOVE] ${docFile} -> docs/`);
        if (!dryRun) {
          fs.renameSync(rootPath, docsPath);
          actions.moved.push({ from: rootPath, to: docsPath });
        }
      }
    }
  }
  
  // Step 2: Remove old .txt files from documentation-compiled
  console.log('\n[INFO] Cleaning up old .txt files in documentation-compiled...');
  if (fs.existsSync(COMPILED_DIR)) {
    const files = fs.readdirSync(COMPILED_DIR);
    for (const file of files) {
      if (file.endsWith('.txt') && file !== 'README.txt') {
        const filePath = path.join(COMPILED_DIR, file);
        console.log(`[REMOVE] ${file}`);
        if (!dryRun) {
          fs.unlinkSync(filePath);
          actions.removed.push(filePath);
        }
      }
    }
  }
  
  // Step 3: Remove very small or empty documentation files
  console.log('\n[INFO] Checking for empty or very small files...');
  const allDocs = findMarkdownFiles(DOCS_DIR, false);
  for (const docPath of allDocs) {
    const size = getFileSize(docPath);
    const content = readFileIfExists(docPath);
    const filename = path.basename(docPath);
    
    // Skip core docs
    if (CORE_DOCS.includes(filename)) continue;
    
    // Remove if very small (< 100 bytes) or empty
    if (size < 100 || !content || content.trim().length < 50) {
      console.log(`[REMOVE] ${filename} (too small or empty: ${size} bytes)`);
      if (!dryRun) {
        fs.unlinkSync(docPath);
        actions.removed.push(docPath);
      }
    }
  }
  
  // Step 4: Check for duplicate files in docs/ (only exact filename matches)
  console.log('\n[INFO] Checking for duplicate files in docs/...');
  const docsFiles = findMarkdownFiles(DOCS_DIR, false);
  const fileMap = new Map();
  
  // Group files by name
  for (const file of docsFiles) {
    const name = path.basename(file);
    if (!fileMap.has(name)) {
      fileMap.set(name, []);
    }
    fileMap.get(name).push(file);
  }
  
  // Remove duplicates (same filename)
  for (const [name, files] of fileMap.entries()) {
    if (files.length > 1) {
      // Multiple files with same name - keep the largest
      files.sort((a, b) => getFileSize(b) - getFileSize(a));
      const keepFile = files[0];
      
      for (let i = 1; i < files.length; i++) {
        console.log(`[REMOVE] ${name} (duplicate filename, keeping largest)`);
        if (!dryRun) {
          fs.unlinkSync(files[i]);
          actions.removed.push(files[i]);
        }
      }
    }
  }
  
  // Step 5: Clean up root-level documentation that should be in docs/
  console.log('\n[INFO] Checking root directory for documentation files...');
  const rootDocs = findMarkdownFiles(PROJECT_ROOT, false);
  for (const rootDoc of rootDocs) {
    const filename = path.basename(rootDoc);
    
    // Skip README.md and files already handled
    if (filename === 'README.md' || ROOT_DOCS_TO_MOVE.includes(filename)) {
      continue;
    }
    
    // Check if it exists in docs/
    const docsPath = path.join(DOCS_DIR, filename);
    if (fs.existsSync(docsPath)) {
      // Both exist - prefer docs/ version
      console.log(`[REMOVE] ${filename} (exists in docs/)`);
      if (!dryRun) {
        fs.unlinkSync(rootDoc);
        actions.removed.push(rootDoc);
      }
    } else if (filename.startsWith('IMPLEMENTATION') || 
               filename.startsWith('PRODUCTION') ||
               filename.startsWith('ENSIP') ||
               filename.includes('DOCUMENTATION')) {
      // Looks like documentation - move to docs/
      console.log(`[MOVE] ${filename} -> docs/`);
      if (!dryRun) {
        fs.renameSync(rootDoc, docsPath);
        actions.moved.push({ from: rootDoc, to: docsPath });
      }
    }
  }
  
  // Summary
  console.log('\n---\n');
  console.log('Cleanup Summary:');
  console.log(`- Files moved: ${actions.moved.length}`);
  console.log(`- Files removed: ${actions.removed.length}`);
  console.log(`- Files cleaned: ${actions.cleaned.length}`);
  
  if (dryRun) {
    console.log('\n[DRY RUN] No files were actually modified.');
    console.log('Run without --dry-run to apply changes.');
  } else {
    console.log('\n[SUCCESS] Documentation cleanup complete!');
  }
  
  return actions;
}

// Command line argument parsing
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-d');

// Run cleanup
cleanupDocumentation(dryRun);

