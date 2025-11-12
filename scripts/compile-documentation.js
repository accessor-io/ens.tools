#!/usr/bin/env node

/**
 * Documentation Compilation Script
 * 
 * Compiles all documentation into professional technical and user documentation formats.
 * Creates well-structured documentation packages suitable for distribution.
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const PROJECT_ROOT = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'documentation-compiled');
const TECHNICAL_OUTPUT = path.join(OUTPUT_DIR, 'TECHNICAL-DOCUMENTATION.md');
const USER_OUTPUT = path.join(OUTPUT_DIR, 'USER-DOCUMENTATION.md');
const COMPLETE_OUTPUT = path.join(OUTPUT_DIR, 'COMPLETE-DOCUMENTATION.md');

// Documentation categorization
const TECHNICAL_DOCS = [
  'PROJECT-OVERVIEW.md',
  'FUNCTIONALITY.md',
  'API-REFERENCE.md',
  'CODE-USAGE.md',
  'TERMINAL-USAGE.md',
  'BUSINESS-LOGIC.md',
  'CONDITIONS-AND-RESULTS.md',
  'ENSIP19-IMPLEMENTATION.md',
  'DELEGATION-SYSTEM-DOCUMENTATION.md',
  'BASE-METADATA-IMPLEMENTATION.md',
  'AUDIT-LOG-IMPLEMENTATION.md',
  'PRODUCTION-SETUP.md',
  'PRODUCTION-SEAPORT-IMPLEMENTATION.md',
  'ENS-ACTION-SCHEMA-GUIDE.md',
  'SCHEMA-PREVIEW-EDITOR.md',
  'CONTRACT-NAMING-IMPROVEMENTS.md',
  'APPLICATION-TREE.md',
  'TOOLING-ORGANIZATION.md',
  'IMPLEMENTATION-COMPLETE.md',
  'IMPLEMENTATION-SUMMARY.md',
  'INTEGRATION-COMPLETE.md',
  'MARKETPLACE-IMPLEMENTATION.md',
];

const USER_DOCS = [
  'HELP-AND-SUGGESTIONS.md',
  'BEST-PRACTICES.md',
  'ENSIP19-QUICKSTART.md',
  'ENS-MARKETPLACE-DOCUMENTATION.md',
  'ENS-ENTERPRISE-FEATURES.md',
  'COMPREHENSIVE-FEATURES.md',
  'ACTION-SCHEMA-QUICK-REFERENCE.md',
  'BEST-PRACTICES-ACTION-SCHEMA.md',
];

const LEGAL_DOCS = [
  'PRIVACY-POLICY.md',
  'USER-AGREEMENTS.md',
  'TERMS-OF-AGREEMENT.md',
  'USAGE-POLICY.md',
  'WEB3-PROVIDER-DISCLOSURE.md',
  'FINANCIAL-RISK-DISCLOSURE.md',
  'LEGAL-COMPLIANCE.md',
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

function sanitizeFilename(filename) {
  return filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

function extractTitle(content) {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  return titleMatch ? titleMatch[1].trim() : 'Untitled';
}

function generateTableOfContents(sections) {
  let toc = '## Table of Contents\n\n';
  
  sections.forEach((section, index) => {
    const anchor = sanitizeFilename(section.title);
    toc += `${index + 1}. [${section.title}](#${anchor})\n`;
    
    if (section.subsections && section.subsections.length > 0) {
      section.subsections.forEach((subsection, subIndex) => {
        const subAnchor = sanitizeFilename(subsection.title);
        toc += `   ${index + 1}.${subIndex + 1}. [${subsection.title}](#${subAnchor})\n`;
      });
    }
  });
  
  toc += '\n---\n\n';
  return toc;
}

function compileDocumentation(docFiles, category, title) {
  let compiled = `# ${title}\n\n`;
  compiled += `**Generated**: ${new Date().toISOString()}\n\n`;
  compiled += `**Category**: ${category}\n\n`;
  compiled += `This document is a compilation of ${category.toLowerCase()} documentation for ENS Tools.\n\n`;
  compiled += `---\n\n`;
  
  const sections = [];
  
  for (const docFile of docFiles) {
    const docPath = path.join(DOCS_DIR, docFile);
    const content = readFileIfExists(docPath);
    
    if (!content) {
      console.log(`[WARN] File not found: ${docFile}`);
      continue;
    }
    
    const title = extractTitle(content);
    const cleanContent = content
      .replace(/^#\s+.+$/m, '') // Remove first title
      .trim();
    
    sections.push({
      title: title,
      filename: docFile,
      content: cleanContent,
    });
    
    compiled += `## ${title}\n\n`;
    compiled += `*Source: ${docFile}*\n\n`;
    compiled += cleanContent;
    compiled += `\n\n---\n\n`;
  }
  
  // Add table of contents at the beginning
  const toc = generateTableOfContents(sections);
  compiled = compiled.replace('---\n\n', toc);
  
  return compiled;
}

function generateCompleteDocumentation() {
  let complete = `# ENS Tools - Complete Documentation\n\n`;
  complete += `**Version**: 1.0.0\n`;
  complete += `**Generated**: ${new Date().toISOString()}\n\n`;
  complete += `This document contains the complete documentation for ENS Tools, including technical documentation, user guides, and legal information.\n\n`;
  complete += `---\n\n`;
  
  // Table of Contents
  complete += `## Table of Contents\n\n`;
  complete += `1. [Technical Documentation](#technical-documentation)\n`;
  complete += `2. [User Documentation](#user-documentation)\n`;
  complete += `3. [Legal and Compliance](#legal-and-compliance)\n`;
  complete += `\n---\n\n`;
  
  // Technical Documentation
  complete += `# Technical Documentation\n\n`;
  complete += `This section contains technical documentation for developers, system administrators, and technical users.\n\n`;
  complete += `---\n\n`;
  
  for (const docFile of TECHNICAL_DOCS) {
    const docPath = path.join(DOCS_DIR, docFile);
    const content = readFileIfExists(docPath);
    
    if (!content) continue;
    
    const title = extractTitle(content);
    const cleanContent = content
      .replace(/^#\s+.+$/m, '')
      .trim();
    
    complete += `## ${title}\n\n`;
    complete += `*Source: ${docFile}*\n\n`;
    complete += cleanContent;
    complete += `\n\n---\n\n`;
  }
  
  // User Documentation
  complete += `# User Documentation\n\n`;
  complete += `This section contains user guides, tutorials, and best practices for end users.\n\n`;
  complete += `---\n\n`;
  
  for (const docFile of USER_DOCS) {
    const docPath = path.join(DOCS_DIR, docFile);
    const content = readFileIfExists(docPath);
    
    if (!content) continue;
    
    const title = extractTitle(content);
    const cleanContent = content
      .replace(/^#\s+.+$/m, '')
      .trim();
    
    complete += `## ${title}\n\n`;
    complete += `*Source: ${docFile}*\n\n`;
    complete += cleanContent;
    complete += `\n\n---\n\n`;
  }
  
  // Legal Documentation
  complete += `# Legal and Compliance\n\n`;
  complete += `This section contains legal documents, policies, and compliance information.\n\n`;
  complete += `---\n\n`;
  
  for (const docFile of LEGAL_DOCS) {
    const docPath = path.join(DOCS_DIR, docFile);
    const content = readFileIfExists(docPath);
    
    if (!content) continue;
    
    const title = extractTitle(content);
    const cleanContent = content
      .replace(/^#\s+.+$/m, '')
      .trim();
    
    complete += `## ${title}\n\n`;
    complete += `*Source: ${docFile}*\n\n`;
    complete += cleanContent;
    complete += `\n\n---\n\n`;
  }
  
  return complete;
}

function generateHTMLVersion(markdownContent, title) {
  // Simple markdown to HTML conversion
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
            background-color: #fff;
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        h2 {
            color: #34495e;
            border-bottom: 2px solid #ecf0f1;
            padding-bottom: 8px;
            margin-top: 40px;
        }
        h3 {
            color: #555;
            margin-top: 30px;
        }
        code {
            background-color: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        pre {
            background-color: #f4f4f4;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            border-left: 4px solid #3498db;
        }
        pre code {
            background-color: transparent;
            padding: 0;
        }
        blockquote {
            border-left: 4px solid #3498db;
            margin: 0;
            padding-left: 20px;
            color: #666;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        th {
            background-color: #3498db;
            color: white;
        }
        tr:nth-child(even) {
            background-color: #f2f2f2;
        }
        a {
            color: #3498db;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        hr {
            border: none;
            border-top: 2px solid #ecf0f1;
            margin: 40px 0;
        }
        .toc {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .source-note {
            font-size: 0.9em;
            color: #666;
            font-style: italic;
        }
    </style>
</head>
<body>
`;
  
  // Convert markdown to HTML (basic conversion)
  html += markdownContent
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/```(\w+)?\n([\s\S]*?)```/gim, '<pre><code>$2</code></pre>')
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
    .replace(/\n\n/gim, '</p><p>')
    .replace(/^(.+)$/gim, '<p>$1</p>');
  
  html += `
</body>
</html>`;
  
  return html;
}

// Main execution
console.log('Compiling documentation...\n');

// Ensure output directory exists
ensureDir(OUTPUT_DIR);

// Compile technical documentation
console.log('[INFO] Compiling technical documentation...');
const technicalDoc = compileDocumentation(
  TECHNICAL_DOCS,
  'Technical',
  'ENS Tools - Technical Documentation'
);
fs.writeFileSync(TECHNICAL_OUTPUT, technicalDoc, 'utf-8');
console.log(`[OK] Created ${path.basename(TECHNICAL_OUTPUT)}`);

// Compile user documentation
console.log('[INFO] Compiling user documentation...');
const userDoc = compileDocumentation(
  USER_DOCS,
  'User',
  'ENS Tools - User Documentation'
);
fs.writeFileSync(USER_OUTPUT, userDoc, 'utf-8');
console.log(`[OK] Created ${path.basename(USER_OUTPUT)}`);

// Generate complete documentation
console.log('[INFO] Generating complete documentation...');
const completeDoc = generateCompleteDocumentation();
fs.writeFileSync(COMPLETE_OUTPUT, completeDoc, 'utf-8');
console.log(`[OK] Created ${path.basename(COMPLETE_OUTPUT)}`);

// Generate HTML versions
console.log('[INFO] Generating HTML versions...');
const technicalHTML = generateHTMLVersion(technicalDoc, 'ENS Tools - Technical Documentation');
fs.writeFileSync(TECHNICAL_OUTPUT.replace('.md', '.html'), technicalHTML, 'utf-8');
console.log(`[OK] Created ${path.basename(TECHNICAL_OUTPUT.replace('.md', '.html'))}`);

const userHTML = generateHTMLVersion(userDoc, 'ENS Tools - User Documentation');
fs.writeFileSync(USER_OUTPUT.replace('.md', '.html'), userHTML, 'utf-8');
console.log(`[OK] Created ${path.basename(USER_OUTPUT.replace('.md', '.html'))}`);

const completeHTML = generateHTMLVersion(completeDoc, 'ENS Tools - Complete Documentation');
fs.writeFileSync(COMPLETE_OUTPUT.replace('.md', '.html'), completeHTML, 'utf-8');
console.log(`[OK] Created ${path.basename(COMPLETE_OUTPUT.replace('.md', '.html'))}`);

// Generate README for compiled documentation
const readmeContent = `# Compiled Documentation

This directory contains compiled documentation for ENS Tools.

## Files

### Technical Documentation
- **TECHNICAL-DOCUMENTATION.md** - Complete technical documentation (Markdown)
- **TECHNICAL-DOCUMENTATION.html** - Complete technical documentation (HTML)

### User Documentation
- **USER-DOCUMENTATION.md** - Complete user documentation (Markdown)
- **USER-DOCUMENTATION.html** - Complete user documentation (HTML)

### Complete Documentation
- **COMPLETE-DOCUMENTATION.md** - All documentation in one file (Markdown)
- **COMPLETE-DOCUMENTATION.html** - All documentation in one file (HTML)

## Usage

### For Developers
Read **TECHNICAL-DOCUMENTATION.md** or open **TECHNICAL-DOCUMENTATION.html** in a browser.

### For End Users
Read **USER-DOCUMENTATION.md** or open **USER-DOCUMENTATION.html** in a browser.

### For Complete Reference
Read **COMPLETE-DOCUMENTATION.md** or open **COMPLETE-DOCUMENTATION.html** in a browser.

## Generation

These files are automatically generated by running:
\`\`\`bash
npm run docs:compile
\`\`\`

**Last Generated**: ${new Date().toISOString()}
`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'README.md'), readmeContent, 'utf-8');
console.log(`[OK] Created README.md`);

console.log('\n[SUCCESS] Documentation compilation complete!');
console.log(`\nSummary:`);
console.log(`- Technical Documentation: ${TECHNICAL_DOCS.length} files compiled`);
console.log(`- User Documentation: ${USER_DOCS.length} files compiled`);
console.log(`- Legal Documentation: ${LEGAL_DOCS.length} files included in complete doc`);
console.log(`- Output directory: ${OUTPUT_DIR}`);
console.log(`\nGenerated files:`);
console.log(`  - TECHNICAL-DOCUMENTATION.md / .html`);
console.log(`  - USER-DOCUMENTATION.md / .html`);
console.log(`  - COMPLETE-DOCUMENTATION.md / .html`);







