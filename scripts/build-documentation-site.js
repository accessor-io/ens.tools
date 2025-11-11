#!/usr/bin/env node

/**
 * Documentation Site Builder (Enhanced)
 * 
 * Builds a complete documentation website from markdown files.
 * Features: Table of contents, syntax highlighting, improved navigation, search, and more.
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const PROJECT_ROOT = path.join(__dirname, '..');
const SITE_DIR = path.join(PROJECT_ROOT, 'docs-site');

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

function findMarkdownFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  
  return files.sort();
}

function escapeHTML(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function generateTableOfContents(content) {
  const headers = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)$/);
    const h3Match = line.match(/^###\s+(.+)$/);
    
    if (h2Match) {
      headers.push({ level: 2, text: h2Match[1].trim(), id: slugify(h2Match[1].trim()) });
    } else if (h3Match) {
      headers.push({ level: 3, text: h3Match[1].trim(), id: slugify(h3Match[1].trim()) });
    }
  }
  
  if (headers.length === 0) return '';
  
  let toc = '<div class="table-of-contents">\n<h3>Table of Contents</h3>\n<ul>\n';
  
  for (const header of headers) {
    const indent = header.level === 3 ? '  ' : '';
    toc += `${indent}<li><a href="#${header.id}">${escapeHTML(header.text)}</a></li>\n`;
  }
  
  toc += '</ul>\n</div>\n';
  return toc;
}

function markdownToHTML(markdown) {
  if (!markdown) return '';
  
  let html = markdown;
  
  // Process code blocks first (before other processing)
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/gim, (match, lang, code) => {
    const language = lang || 'text';
    const escapedCode = escapeHTML(code.trim());
    return `<pre><code class="language-${language}">${escapedCode}</code></pre>`;
  });
  
  // Headers with IDs for anchor links
  html = html.replace(/^#### (.*$)/gim, (match, text) => {
    const id = slugify(text);
    return `<h4 id="${id}">${text}</h4>`;
  });
  html = html.replace(/^### (.*$)/gim, (match, text) => {
    const id = slugify(text);
    return `<h3 id="${id}">${text}</h3>`;
  });
  html = html.replace(/^## (.*$)/gim, (match, text) => {
    const id = slugify(text);
    return `<h2 id="${id}">${text}</h2>`;
  });
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Tables
  html = html.replace(/\|(.+)\|\n\|[-\s|]+\|\n((?:\|.+\|\n?)+)/gim, (match, header, rows) => {
    const headers = header.split('|').map(h => h.trim()).filter(h => h);
    const rowLines = rows.trim().split('\n');
    
    let table = '<table>\n<thead>\n<tr>\n';
    headers.forEach(h => {
      table += `<th>${escapeHTML(h)}</th>\n`;
    });
    table += '</tr>\n</thead>\n<tbody>\n';
    
    rowLines.forEach(row => {
      const cells = row.split('|').map(c => c.trim()).filter(c => c);
      if (cells.length > 0) {
        table += '<tr>\n';
        cells.forEach(cell => {
          table += `<td>${escapeHTML(cell)}</td>\n`;
        });
        table += '</tr>\n';
      }
    });
    
    table += '</tbody>\n</table>\n';
    return table;
  });
  
  // Blockquotes
  html = html.replace(/^>\s+(.*)$/gim, '<blockquote>$1</blockquote>');
  
  // Inline code (after code blocks)
  html = html.replace(/`([^`\n]+)`/gim, '<code>$1</code>');
  
  // Bold and italic
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, (match, text, url) => {
    // Convert relative .md links to .html
    if (url.endsWith('.md')) {
      url = url.replace('.md', '.html');
    }
    return `<a href="${url}">${text}</a>`;
  });
  
  // Ordered lists
  html = html.replace(/^(\d+)\.\s+(.*)$/gim, '<li>$2</li>');
  html = html.replace(/(<li>.*<\/li>)/s, (match) => {
    return '<ol>' + match + '</ol>';
  });
  
  // Unordered lists
  html = html.replace(/^[-*]\s+(.*)$/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, (match) => {
    if (!match.includes('<ol>')) {
      return '<ul>' + match + '</ul>';
    }
    return match;
  });
  
  // Horizontal rules
  html = html.replace(/^---$/gim, '<hr>');
  html = html.replace(/^\*\*\*$/gim, '<hr>');
  
  // Paragraphs (handle remaining text)
  const lines = html.split('\n');
  let result = [];
  let inList = false;
  let inCode = false;
  let inTable = false;
  let currentPara = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('<pre>') || line.startsWith('</pre>') || line.startsWith('<code')) {
      inCode = line.startsWith('<pre>');
      result.push(lines[i]);
      continue;
    }
    
    if (line.startsWith('<table>')) {
      inTable = true;
      result.push(lines[i]);
      continue;
    }
    
    if (line.startsWith('</table>')) {
      inTable = false;
      result.push(lines[i]);
      continue;
    }
    
    if (inCode || inTable) {
      result.push(lines[i]);
      continue;
    }
    
    if (line.startsWith('<') || line.startsWith('</')) {
      if (currentPara.length > 0) {
        result.push('<p>' + currentPara.join(' ') + '</p>');
        currentPara = [];
      }
      result.push(lines[i]);
      inList = line.match(/<[uo]l>/) !== null;
      continue;
    }
    
    if (line === '') {
      if (currentPara.length > 0) {
        result.push('<p>' + currentPara.join(' ') + '</p>');
        currentPara = [];
      }
      continue;
    }
    
    if (!line.match(/^<[h|u|o|p|d|b|t]/)) {
      currentPara.push(line);
    } else {
      if (currentPara.length > 0) {
        result.push('<p>' + currentPara.join(' ') + '</p>');
        currentPara = [];
      }
      result.push(lines[i]);
    }
  }
  
  if (currentPara.length > 0) {
    result.push('<p>' + currentPara.join(' ') + '</p>');
  }
  
  return result.join('\n');
}

function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Documentation';
}

function categorizeDocumentation(files) {
  const categories = {
    'Getting Started': [],
    'Core Documentation': [],
    'Implementation': [],
    'Features': [],
    'Setup & Deployment': [],
    'Security': [],
    'Legal & Compliance': [],
    'Other': [],
  };
  
  for (const file of files) {
    const filename = path.basename(file, '.md');
    const upper = filename.toUpperCase();
    
    if (filename.includes('QUICKSTART') || filename.includes('README') || 
        filename === 'PROJECT-OVERVIEW') {
      categories['Getting Started'].push(file);
    } else if (filename.includes('API') || filename.includes('FUNCTIONALITY') ||
               filename.includes('CODE-USAGE') || filename.includes('TERMINAL') ||
               filename.includes('BUSINESS-LOGIC') || filename.includes('PROJECT-OVERVIEW')) {
      categories['Core Documentation'].push(file);
    } else if (filename.includes('IMPLEMENTATION') || filename.includes('INTEGRATION') ||
               filename.includes('COMPLETE') || filename.includes('SUMMARY')) {
      categories['Implementation'].push(file);
    } else if (filename.includes('FEATURE') || filename.includes('MARKETPLACE') ||
               filename.includes('SCHEMA') || filename.includes('ACTION') ||
               filename.includes('ENTERPRISE')) {
      categories['Features'].push(file);
    } else if (filename.includes('PRODUCTION') || filename.includes('SETUP') ||
               filename.includes('DEPLOYMENT') || filename.includes('TOOLING') ||
               filename.includes('CHECKLIST')) {
      categories['Setup & Deployment'].push(file);
    } else if (filename.includes('SECURITY') || filename.includes('AUDIT') ||
               filename.includes('VULNERABILITY') || filename.includes('ENCRYPTION')) {
      categories['Security'].push(file);
    } else if (filename.includes('PRIVACY') || filename.includes('TERMS') ||
               filename.includes('LEGAL') || filename.includes('AGREEMENT') ||
               filename.includes('POLICY') || filename.includes('RISK') ||
               filename.includes('COMPLIANCE')) {
      categories['Legal & Compliance'].push(file);
    } else {
      categories['Other'].push(file);
    }
  }
  
  return categories;
}

function generateSiteHTML(title, content, navigation, currentFile, toc = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - ENS Tools Documentation</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.7;
            color: #2c3e50;
            background-color: #f8f9fa;
            display: flex;
            min-height: 100vh;
        }
        
        .sidebar {
            width: 300px;
            background: linear-gradient(180deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 0;
            overflow-y: auto;
            position: fixed;
            height: 100vh;
            left: 0;
            top: 0;
            box-shadow: 2px 0 10px rgba(0,0,0,0.1);
        }
        
        .sidebar-header {
            padding: 20px;
            background: rgba(0,0,0,0.2);
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        .sidebar h1 {
            font-size: 1.4em;
            margin: 0;
            font-weight: 600;
            color: #3498db;
        }
        
        .sidebar h2 {
            font-size: 0.75em;
            margin: 20px 20px 10px 20px;
            color: #95a5a6;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 1.5px;
        }
        
        .sidebar ul {
            list-style: none;
            margin: 0 0 20px 0;
            padding: 0;
        }
        
        .sidebar li {
            margin: 0;
        }
        
        .sidebar a {
            color: #bdc3c7;
            text-decoration: none;
            display: block;
            padding: 10px 20px;
            transition: all 0.2s;
            border-left: 3px solid transparent;
        }
        
        .sidebar a:hover {
            background: rgba(52, 152, 219, 0.1);
            color: white;
            border-left-color: #3498db;
        }
        
        .sidebar a.active {
            background: rgba(52, 152, 219, 0.2);
            color: #3498db;
            border-left-color: #3498db;
            font-weight: 500;
        }
        
        .search-box {
            width: 100%;
            padding: 12px 15px;
            margin: 15px 20px;
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 6px;
            background: rgba(0,0,0,0.2);
            color: white;
            font-size: 0.9em;
            transition: all 0.2s;
        }
        
        .search-box:focus {
            outline: none;
            border-color: #3498db;
            background: rgba(0,0,0,0.3);
        }
        
        .search-box::placeholder {
            color: #95a5a6;
        }
        
        .main-content {
            flex: 1;
            margin-left: 300px;
            background: white;
            padding: 50px 60px;
            max-width: 1100px;
            box-shadow: -2px 0 10px rgba(0,0,0,0.05);
        }
        
        .main-content h1 {
            color: #2c3e50;
            font-size: 2.5em;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 4px solid #3498db;
            font-weight: 700;
        }
        
        .main-content h2 {
            color: #34495e;
            font-size: 1.8em;
            border-bottom: 2px solid #ecf0f1;
            padding-bottom: 10px;
            margin-top: 50px;
            margin-bottom: 25px;
            font-weight: 600;
            scroll-margin-top: 20px;
        }
        
        .main-content h3 {
            color: #555;
            font-size: 1.4em;
            margin-top: 35px;
            margin-bottom: 20px;
            font-weight: 600;
            scroll-margin-top: 20px;
        }
        
        .main-content h4 {
            color: #666;
            font-size: 1.2em;
            margin-top: 25px;
            margin-bottom: 15px;
            font-weight: 600;
        }
        
        .main-content code {
            background-color: #f4f4f4;
            padding: 3px 8px;
            border-radius: 4px;
            font-family: 'Fira Code', 'Courier New', monospace;
            font-size: 0.9em;
            color: #e74c3c;
            border: 1px solid #e0e0e0;
        }
        
        .main-content pre {
            background-color: #2d2d2d;
            color: #f8f8f2;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 25px 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-left: 4px solid #3498db;
        }
        
        .main-content pre code {
            background-color: transparent;
            padding: 0;
            color: inherit;
            border: none;
            font-size: 0.9em;
            line-height: 1.6;
        }
        
        .main-content blockquote {
            border-left: 4px solid #3498db;
            margin: 25px 0;
            padding: 15px 25px;
            background: #f8f9fa;
            color: #555;
            font-style: italic;
            border-radius: 0 4px 4px 0;
        }
        
        .main-content table {
            border-collapse: collapse;
            width: 100%;
            margin: 25px 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            border-radius: 6px;
            overflow: hidden;
        }
        
        .main-content th, .main-content td {
            border: 1px solid #e0e0e0;
            padding: 12px 15px;
            text-align: left;
        }
        
        .main-content th {
            background: linear-gradient(180deg, #3498db 0%, #2980b9 100%);
            color: white;
            font-weight: 600;
        }
        
        .main-content tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        
        .main-content tr:hover {
            background-color: #f0f0f0;
        }
        
        .main-content a {
            color: #3498db;
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: all 0.2s;
        }
        
        .main-content a:hover {
            color: #2980b9;
            border-bottom-color: #2980b9;
        }
        
        .main-content ul, .main-content ol {
            margin: 20px 0;
            padding-left: 35px;
        }
        
        .main-content li {
            margin: 10px 0;
            line-height: 1.8;
        }
        
        .main-content li ul, .main-content li ol {
            margin-top: 10px;
            margin-bottom: 10px;
        }
        
        .main-content hr {
            border: none;
            border-top: 2px solid #ecf0f1;
            margin: 40px 0;
        }
        
        .main-content p {
            margin: 15px 0;
            line-height: 1.8;
        }
        
        .table-of-contents {
            background: #f8f9fa;
            border: 1px solid #e0e0e0;
            border-left: 4px solid #3498db;
            padding: 20px;
            margin: 30px 0;
            border-radius: 6px;
        }
        
        .table-of-contents h3 {
            margin-top: 0;
            margin-bottom: 15px;
            color: #2c3e50;
            font-size: 1.2em;
        }
        
        .table-of-contents ul {
            list-style: none;
            padding-left: 0;
            margin: 0;
        }
        
        .table-of-contents li {
            margin: 8px 0;
        }
        
        .table-of-contents a {
            color: #555;
            text-decoration: none;
            display: block;
            padding: 5px 0;
        }
        
        .table-of-contents a:hover {
            color: #3498db;
            padding-left: 5px;
            transition: all 0.2s;
        }
        
        @media (max-width: 1024px) {
            .sidebar {
                transform: translateX(-100%);
                transition: transform 0.3s ease;
                z-index: 1000;
            }
            
            .sidebar.open {
                transform: translateX(0);
            }
            
            .main-content {
                margin-left: 0;
                padding: 30px 20px;
            }
            
            .menu-toggle {
                position: fixed;
                top: 20px;
                left: 20px;
                z-index: 1001;
                background: #3498db;
                color: white;
                border: none;
                padding: 10px 15px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 1.2em;
            }
        }
        
        @media print {
            .sidebar {
                display: none;
            }
            
            .main-content {
                margin-left: 0;
                max-width: 100%;
            }
        }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
</head>
<body>
    <button class="menu-toggle" onclick="document.getElementById('sidebar').classList.toggle('open')" style="display: none;">☰</button>
    <div class="sidebar" id="sidebar">
        <div class="sidebar-header">
            <h1>ENS Tools Docs</h1>
        </div>
        <input type="text" class="search-box" placeholder="Search documentation..." id="searchBox">
        ${navigation}
    </div>
    
    <div class="main-content">
        ${toc}
        ${content}
    </div>
    
    <script>
        // Search functionality
        const searchBox = document.getElementById('searchBox');
        const links = document.querySelectorAll('.sidebar a');
        
        searchBox.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            let visibleCount = 0;
            
            links.forEach(link => {
                const text = link.textContent.toLowerCase();
                const parent = link.closest('li');
                const category = link.closest('ul').previousElementSibling;
                
                if (text.includes(query) || query === '') {
                    link.style.display = 'block';
                    if (parent) parent.style.display = 'block';
                    if (category && query !== '') category.style.display = 'block';
                    visibleCount++;
                } else {
                    link.style.display = 'none';
                    if (parent) {
                        const siblings = Array.from(parent.parentElement.children);
                        const hasVisible = siblings.some(s => s.querySelector('a') && s.querySelector('a').style.display !== 'none');
                        if (!hasVisible && category) {
                            category.style.display = 'none';
                        }
                    }
                }
            });
        });
        
        // Mobile menu toggle
        if (window.innerWidth <= 1024) {
            document.querySelector('.menu-toggle').style.display = 'block';
        }
        
        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
        
        // Highlight current section in TOC
        const observerOptions = {
            root: null,
            rootMargin: '-20% 0px -70% 0px',
            threshold: 0
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    if (id) {
                        document.querySelectorAll('.table-of-contents a').forEach(link => {
                            link.classList.remove('active');
                            if (link.getAttribute('href') === '#' + id) {
                                link.classList.add('active');
                            }
                        });
                    }
                }
            });
        }, observerOptions);
        
        document.querySelectorAll('h2, h3').forEach(heading => {
            observer.observe(heading);
        });
    </script>
</body>
</html>`;
}

function generateNavigation(categories, currentFile) {
  let nav = '';
  
  for (const [category, files] of Object.entries(categories)) {
    if (files.length === 0) continue;
    
    nav += `<h2>${category}</h2><ul>`;
    
    for (const file of files) {
      const filename = path.basename(file, '.md');
      const htmlFile = `${filename}.html`;
      const content = readFileIfExists(file);
      const title = content ? extractTitle(content) : filename;
      const isActive = currentFile === htmlFile ? 'active' : '';
      
      nav += `<li><a href="${htmlFile}" class="${isActive}">${title}</a></li>`;
    }
    
    nav += '</ul>';
  }
  
  return nav;
}

function buildDocumentationSite() {
  console.log('Building enhanced documentation site...\n');
  
  ensureDir(SITE_DIR);
  
  // Get all markdown files
  const mdFiles = findMarkdownFiles(DOCS_DIR);
  console.log(`[INFO] Found ${mdFiles.length} documentation files`);
  
  // Categorize files
  const categories = categorizeDocumentation(mdFiles);
  
  // Generate HTML for each file
  console.log('[INFO] Generating HTML pages with TOC and enhanced features...');
  let generated = 0;
  
  for (const file of mdFiles) {
    const filename = path.basename(file, '.md');
    const content = readFileIfExists(file);
    
    if (!content) {
      console.log(`[SKIP] ${filename} (empty or unreadable)`);
      continue;
    }
    
    const title = extractTitle(content);
    const toc = generateTableOfContents(content);
    const htmlContent = markdownToHTML(content);
    const navigation = generateNavigation(categories, `${filename}.html`);
    const html = generateSiteHTML(title, htmlContent, navigation, `${filename}.html`, toc);
    
    const outputPath = path.join(SITE_DIR, `${filename}.html`);
    fs.writeFileSync(outputPath, html, 'utf-8');
    generated++;
  }
  
  // Generate index page
  console.log('[INFO] Generating enhanced index page...');
  const indexContent = `
    <h1>ENS Tools Documentation</h1>
    <p>Welcome to the ENS Tools documentation. This site contains documentation covering all aspects of the platform.</p>
    
    <h2>Quick Start</h2>
    <ul>
      <li><a href="PROJECT-OVERVIEW.html">Project Overview</a> - Start here to understand the architecture</li>
      <li><a href="ENSIP19-QUICKSTART.html">ENSIP-19 Quickstart</a> - Quick start guide</li>
      <li><a href="API-REFERENCE.html">API Reference</a> - Complete API documentation</li>
    </ul>
    
    <h2>Documentation Categories</h2>
    ${Object.entries(categories).map(([category, files]) => {
      if (files.length === 0) return '';
      return `
        <h3>${category}</h3>
        <ul>
          ${files.map(file => {
            const filename = path.basename(file, '.md');
            const content = readFileIfExists(file);
            const title = content ? extractTitle(content) : filename;
            return `<li><a href="${filename}.html">${title}</a></li>`;
          }).join('')}
        </ul>
      `;
    }).join('')}
    
    <hr>
    <p><strong>Total Documentation Files:</strong> ${mdFiles.length}</p>
    <p><strong>Last Updated:</strong> ${new Date().toISOString().split('T')[0]}</p>
  `;
  
  const indexHTML = generateSiteHTML('Documentation Index', indexContent, generateNavigation(categories, 'index.html'), 'index.html');
  fs.writeFileSync(path.join(SITE_DIR, 'index.html'), indexHTML, 'utf-8');
  
  console.log(`\n[SUCCESS] Enhanced documentation site built!`);
  console.log(`- Generated ${generated} HTML pages`);
  console.log(`- Added table of contents, syntax highlighting, and improved navigation`);
  console.log(`- Site location: ${SITE_DIR}`);
  console.log(`\nOpen ${path.join(SITE_DIR, 'index.html')} in your browser to view the documentation.`);
}

// Run the build
buildDocumentationSite();
