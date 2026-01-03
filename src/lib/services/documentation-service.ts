import type { ViewType } from '../../App';

export interface DocumentationEntry {
  id: string;
  title: string;
  category: string;
  description?: string;
  file: string;
  keywords?: string[];
  relatedViews?: ViewType[];
}

export const DOCUMENTATION_INDEX: DocumentationEntry[] = [
  // Getting Started
  {
    id: 'ensip19-quickstart',
    title: 'ENSIP-19 Quick Start Guide',
    category: 'Getting Started',
    description: 'Quick start guide for ENSIP-19 implementation',
    file: 'ENSIP19-QUICKSTART.html',
    keywords: ['quickstart', 'getting started', 'tutorial', 'guide'],
    relatedViews: ['dashboard', 'domains'],
  },
  {
    id: 'project-overview',
    title: 'Project Overview',
    category: 'Getting Started',
    description: 'Overview of the ENS Tools project architecture',
    file: 'PROJECT-OVERVIEW.html',
    keywords: ['overview', 'architecture', 'project'],
    relatedViews: ['dashboard'],
  },
  
  // Core Documentation
  {
    id: 'api-reference',
    title: 'API Reference',
    category: 'Core Documentation',
    description: 'Complete API reference documentation',
    file: 'API-REFERENCE.html',
    keywords: ['api', 'reference', 'endpoints', 'rest'],
    relatedViews: ['domains', 'metadata', 'marketplace'],
  },
  {
    id: 'code-usage',
    title: 'Code Usage',
    category: 'Core Documentation',
    description: 'Code examples and usage patterns',
    file: 'CODE-USAGE.html',
    keywords: ['code', 'examples', 'usage', 'patterns'],
    relatedViews: ['domains', 'metadata'],
  },
  {
    id: 'functionality',
    title: 'Functionality Documentation',
    category: 'Core Documentation',
    description: 'Detailed functionality documentation',
    file: 'FUNCTIONALITY.html',
    keywords: ['functionality', 'features', 'capabilities'],
    relatedViews: ['dashboard', 'domains'],
  },
  {
    id: 'business-logic',
    title: 'Business Logic',
    category: 'Core Documentation',
    description: 'Business rules and logic documentation',
    file: 'BUSINESS-LOGIC.html',
    keywords: ['business', 'logic', 'rules'],
    relatedViews: ['domains', 'marketplace'],
  },
  {
    id: 'terminal-usage',
    title: 'Terminal Usage',
    category: 'Core Documentation',
    description: 'CLI and terminal command reference',
    file: 'TERMINAL-USAGE.html',
    keywords: ['cli', 'terminal', 'commands', 'command line'],
    relatedViews: [],
  },
  
  // Implementation
  {
    id: 'ensip19-implementation',
    title: 'ENSIP-19 Implementation',
    category: 'Implementation',
    description: 'ENSIP-19 implementation details',
    file: 'ENSIP19-IMPLEMENTATION.html',
    keywords: ['ensip19', 'implementation', 'protocol'],
    relatedViews: ['domains', 'metadata'],
  },
  {
    id: 'delegation-system',
    title: 'Delegation System Documentation',
    category: 'Implementation',
    description: 'Granular delegation system documentation',
    file: 'DELEGATION-SYSTEM-DOCUMENTATION.html',
    keywords: ['delegation', 'permissions', 'granular'],
    relatedViews: ['security', 'governance'],
  },
  {
    id: 'audit-log-implementation',
    title: 'Audit Log Implementation',
    category: 'Implementation',
    description: 'Audit log and user configuration system',
    file: 'AUDIT-LOG-IMPLEMENTATION.html',
    keywords: ['audit', 'logging', 'configuration'],
    relatedViews: ['audit', 'security'],
  },
  {
    id: 'marketplace-implementation',
    title: 'Marketplace Implementation',
    category: 'Implementation',
    description: 'OpenSea Seaport integration documentation',
    file: 'MARKETPLACE-IMPLEMENTATION.html',
    keywords: ['marketplace', 'seaport', 'opensea', 'trading'],
    relatedViews: ['marketplace'],
  },
  {
    id: 'base-metadata-implementation',
    title: 'Base Metadata Implementation',
    category: 'Implementation',
    description: 'Base chain metadata implementation',
    file: 'BASE-METADATA-IMPLEMENTATION.html',
    keywords: ['metadata', 'base', 'chain'],
    relatedViews: ['metadata'],
  },
  
  // Features
  {
    id: 'ens-action-schema-guide',
    title: 'ENS Action Schema Guide',
    category: 'Features',
    description: 'Complete guide to the ENS Action Schema system',
    file: 'ENS-ACTION-SCHEMA-GUIDE.html',
    keywords: ['action', 'schema', 'batch', 'operations'],
    relatedViews: ['domains', 'metadata'],
  },
  {
    id: 'action-schema-quick-reference',
    title: 'Action Schema Quick Reference',
    category: 'Features',
    description: 'Quick reference for action schema system',
    file: 'ACTION-SCHEMA-QUICK-REFERENCE.html',
    keywords: ['action', 'schema', 'quick', 'reference'],
    relatedViews: ['domains'],
  },
  {
    id: 'ens-marketplace-documentation',
    title: 'ENS Marketplace Documentation',
    category: 'Features',
    description: 'ENS marketplace features and usage',
    file: 'ENS-MARKETPLACE-DOCUMENTATION.html',
    keywords: ['marketplace', 'trading', 'buying', 'selling'],
    relatedViews: ['marketplace'],
  },
  {
    id: 'schema-preview-editor',
    title: 'Schema Preview & Editor',
    category: 'Features',
    description: 'ENSIP-19 schema preview and editor documentation',
    file: 'SCHEMA-PREVIEW-EDITOR.html',
    keywords: ['schema', 'preview', 'editor', 'ensip19'],
    relatedViews: ['metadata'],
  },
  
  // Setup & Deployment
  {
    id: 'production-setup',
    title: 'Production Setup Guide',
    category: 'Setup & Deployment',
    description: 'Production setup and deployment guide',
    file: 'PRODUCTION-SETUP.html',
    keywords: ['production', 'setup', 'deployment', 'deploy'],
    relatedViews: ['settings'],
  },
  {
    id: 'deployment-checklist',
    title: 'Deployment Checklist',
    category: 'Setup & Deployment',
    description: 'Required updates and deployment checklist',
    file: 'DEPLOYMENT-CHECKLIST.html',
    keywords: ['deployment', 'checklist', 'production'],
    relatedViews: ['settings'],
  },
  {
    id: 'encryption-setup',
    title: 'Encryption Setup Guide',
    category: 'Setup & Deployment',
    description: 'Encryption setup and configuration',
    file: 'ENCRYPTION-SETUP.html',
    keywords: ['encryption', 'security', 'setup'],
    relatedViews: ['security', 'settings'],
  },
  
  // Security
  {
    id: 'security-fixes',
    title: 'Security Fixes Applied',
    category: 'Security',
    description: 'Security fixes and patches',
    file: 'SECURITY-FIXES-APPLIED.html',
    keywords: ['security', 'fixes', 'patches', 'vulnerabilities'],
    relatedViews: ['security'],
  },
  {
    id: 'security-vulnerabilities',
    title: 'Security Vulnerabilities Report',
    category: 'Security',
    description: 'Security vulnerabilities and mitigation',
    file: 'SECURITY-VULNERABILITIES-REPORT.html',
    keywords: ['security', 'vulnerabilities', 'threats'],
    relatedViews: ['security'],
  },
  
  // Best Practices
  {
    id: 'best-practices',
    title: 'Best Practices',
    category: 'Best Practices',
    description: 'Best practices for using ENS Tools',
    file: 'BEST-PRACTICES.html',
    keywords: ['best practices', 'guidelines', 'recommendations'],
    relatedViews: ['best-practices', 'domains'],
  },
  {
    id: 'best-practices-action-schema',
    title: 'Best Practices: Action Schema',
    category: 'Best Practices',
    description: 'Best practices for the action schema system',
    file: 'BEST-PRACTICES-ACTION-SCHEMA.html',
    keywords: ['best practices', 'action', 'schema'],
    relatedViews: ['best-practices', 'domains'],
  },
  {
    id: 'help-and-suggestions',
    title: 'Help and Suggestions',
    category: 'Help',
    description: 'Help resources and suggestions',
    file: 'HELP-AND-SUGGESTIONS.html',
    keywords: ['help', 'support', 'suggestions', 'troubleshooting'],
    relatedViews: [],
  },
  
  // Legal & Compliance
  {
    id: 'privacy-policy',
    title: 'Privacy Policy',
    category: 'Legal & Compliance',
    description: 'Privacy policy and data handling',
    file: 'PRIVACY-POLICY.html',
    keywords: ['privacy', 'policy', 'data'],
    relatedViews: ['settings'],
  },
  {
    id: 'terms-of-agreement',
    title: 'Terms of Agreement',
    category: 'Legal & Compliance',
    description: 'Terms of service and agreement',
    file: 'TERMS-OF-AGREEMENT.html',
    keywords: ['terms', 'agreement', 'legal'],
    relatedViews: ['settings'],
  },
  {
    id: 'financial-risk-disclosure',
    title: 'Financial Risk Disclosure',
    category: 'Legal & Compliance',
    description: 'Financial risk disclosures',
    file: 'FINANCIAL-RISK-DISCLOSURE.html',
    keywords: ['financial', 'risk', 'disclosure'],
    relatedViews: ['marketplace'],
  },
];

export class DocumentationService {
  private static basePath = '/docs-site';

  static getDocumentationPath(file: string): string {
    return `${this.basePath}/${file}`;
  }

  static getDocumentationForView(view: ViewType): DocumentationEntry[] {
    return DOCUMENTATION_INDEX.filter(
      doc => doc.relatedViews?.includes(view)
    );
  }

  static getDocumentationByCategory(category: string): DocumentationEntry[] {
    return DOCUMENTATION_INDEX.filter(doc => doc.category === category);
  }

  static searchDocumentation(query: string): DocumentationEntry[] {
    if (!query.trim()) {
      return DOCUMENTATION_INDEX;
    }

    const lowerQuery = query.toLowerCase();
    return DOCUMENTATION_INDEX.filter(doc => {
      const titleMatch = doc.title.toLowerCase().includes(lowerQuery);
      const descMatch = doc.description?.toLowerCase().includes(lowerQuery);
      const keywordMatch = doc.keywords?.some(kw => 
        kw.toLowerCase().includes(lowerQuery)
      );
      const categoryMatch = doc.category.toLowerCase().includes(lowerQuery);
      
      return titleMatch || descMatch || keywordMatch || categoryMatch;
    });
  }

  static getDocumentationById(id: string): DocumentationEntry | undefined {
    return DOCUMENTATION_INDEX.find(doc => doc.id === id);
  }

  static getAllCategories(): string[] {
    return Array.from(new Set(DOCUMENTATION_INDEX.map(doc => doc.category)));
  }
}
