import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Sparkles,
  Copy,
  Download,
  FileCode,
  Network,
  Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';
import { DomainSelector } from '../ui/domain-selector';

interface ValidationResult {
  isValid: boolean;
  score: number;
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
  }>;
  suggestions: string[];
}

interface NamingTemplate {
  name: string;
  pattern: string;
  description: string;
  example: string;
  category: string;
}

export function NamingToolkit() {
  const [domainInput, setDomainInput] = useState('');
  const [parentDomain, setParentDomain] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [bulkGeneratedNames, setBulkGeneratedNames] = useState('');

  const namingTemplates: NamingTemplate[] = [
    {
      name: 'Main Application',
      pattern: 'app.{parent}',
      description: 'Primary entry point for user-facing contracts',
      example: 'app.company.eth',
      category: 'core'
    },
    {
      name: 'DAO Governance',
      pattern: 'dao.{parent}',
      description: 'Governance logic and treasury management',
      example: 'dao.company.eth',
      category: 'core'
    },
    {
      name: 'Treasury Vault',
      pattern: 'vault.{parent}',
      description: 'Asset storage and treasury contracts',
      example: 'vault.company.eth',
      category: 'core'
    },
    {
      name: 'Registry',
      pattern: 'registry.{parent}',
      description: 'Core registry and indexing contracts',
      example: 'registry.company.eth',
      category: 'core'
    },
    {
      name: 'Token Contract',
      pattern: 'token.{parent}',
      description: 'ERC-20/ERC-721 token contracts',
      example: 'token.company.eth',
      category: 'core'
    },
    {
      name: 'Development',
      pattern: 'dev.{parent}',
      description: 'Development and testing environment',
      example: 'dev.company.eth',
      category: 'environment'
    },
    {
      name: 'Staging',
      pattern: 'staging.{parent}',
      description: 'Pre-production testing environment',
      example: 'staging.company.eth',
      category: 'environment'
    },
    {
      name: 'API Gateway',
      pattern: 'api.{parent}',
      description: 'Backend API endpoints',
      example: 'api.company.eth',
      category: 'infrastructure'
    },
    {
      name: 'Oracle Service',
      pattern: 'oracle.{parent}',
      description: 'Price feeds and external data',
      example: 'oracle.company.eth',
      category: 'infrastructure'
    },
    {
      name: 'Bridge Contract',
      pattern: 'bridge.{parent}',
      description: 'Cross-chain bridge contracts',
      example: 'bridge.company.eth',
      category: 'infrastructure'
    }
  ];

  const validateNaming = (name: string): ValidationResult => {
    const issues: ValidationResult['issues'] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Check if empty
    if (!name.trim()) {
      return {
        isValid: false,
        score: 0,
        issues: [{ type: 'error', message: 'Domain name cannot be empty' }],
        suggestions: []
      };
    }

    // Check for proper subdomain structure
    const parts = name.toLowerCase().split('.');
    if (parts.length < 2) {
      issues.push({ type: 'error', message: 'Must be a valid subdomain (e.g., app.company.eth)' });
      score -= 30;
    }

    // Check subdomain length
    const subdomain = parts[0];
    if (subdomain.length < 2) {
      issues.push({ type: 'warning', message: 'Subdomain is very short (< 2 characters)' });
      score -= 10;
    }
    if (subdomain.length > 20) {
      issues.push({ type: 'warning', message: 'Subdomain is quite long (> 20 characters). Consider abbreviation.' });
      score -= 10;
    }

    // Check for valid characters
    if (!/^[a-z0-9-]+$/i.test(subdomain)) {
      issues.push({ type: 'error', message: 'Subdomain contains invalid characters. Use only alphanumeric and hyphens.' });
      score -= 25;
    }

    // Check for consecutive hyphens
    if (/--/.test(subdomain)) {
      issues.push({ type: 'warning', message: 'Avoid consecutive hyphens' });
      score -= 5;
    }

    // Check if starts or ends with hyphen
    if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
      issues.push({ type: 'error', message: 'Subdomain cannot start or end with a hyphen' });
      score -= 15;
    }

    // Check for common anti-patterns
    if (subdomain.includes('test') && !subdomain.startsWith('test')) {
      issues.push({ type: 'warning', message: 'Consider using "dev" or "staging" prefix instead of embedding "test"' });
      suggestions.push(`dev.${parts.slice(1).join('.')} or staging.${parts.slice(1).join('.')}`);
      score -= 5;
    }

    // Check for best practice patterns
    const bestPracticePatterns = ['app', 'dao', 'vault', 'registry', 'api', 'token', 'bridge', 'oracle'];
    const matchesPattern = bestPracticePatterns.some(pattern => subdomain === pattern);
    
    if (matchesPattern) {
      issues.push({ type: 'info', message: '✓ Follows recommended naming pattern' });
      suggestions.push('This is a well-established convention for critical contracts');
    } else {
      suggestions.push('Consider using standard patterns: app, dao, vault, registry, or api');
      score -= 5;
    }

    // Environment checks
    const envPatterns = ['dev', 'staging', 'prod', 'production'];
    const isEnv = envPatterns.some(env => subdomain.includes(env));
    
    if (isEnv) {
      issues.push({ type: 'info', message: '✓ Environment-specific naming detected' });
      if (subdomain === 'prod' || subdomain === 'production') {
        suggestions.push('Consider omitting environment prefix for production (use "app" instead of "prod-app")');
      }
    }

    // Check for descriptive naming
    if (subdomain.length >= 3 && !subdomain.includes('-')) {
      issues.push({ type: 'info', message: '✓ Clear, descriptive name' });
    }

    // Security recommendations
    if (parts.length === 2 || (parts.length === 3 && parts[2] === 'eth')) {
      if (!isEnv && matchesPattern) {
        suggestions.push('✓ Recommended: Wrap this name and burn CANNOT_UNWRAP, CANNOT_SET_RESOLVER fuses');
      }
    }

    const isValid = !issues.some(issue => issue.type === 'error');

    return {
      isValid,
      score: Math.max(0, score),
      issues,
      suggestions
    };
  };

  const handleValidate = () => {
    const result = validateNaming(domainInput);
    setValidationResult(result);
  };

  const handleGenerateFromTemplate = (template: NamingTemplate) => {
    const generated = template.pattern.replace('{parent}', parentDomain);
    setDomainInput(generated);
    toast.success('Template applied', {
      description: `Generated: ${generated}`
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const generateHierarchy = () => {
    const hierarchy = [
      {
        level: 0,
        name: parentDomain,
        type: 'Root Domain',
        children: [
          { name: `app.${parentDomain}`, type: 'Application', security: 'High' },
          { name: `dao.${parentDomain}`, type: 'Governance', security: 'Critical' },
          { name: `vault.${parentDomain}`, type: 'Treasury', security: 'Critical' },
          { name: `api.${parentDomain}`, type: 'Infrastructure', security: 'Medium' },
          { name: `dev.${parentDomain}`, type: 'Development', security: 'Low' }
        ]
      }
    ];
    return hierarchy;
  };

  // Update bulk generated names when parent domain changes
  useEffect(() => {
    const names = namingTemplates
      .map(t => t.pattern.replace('{parent}', parentDomain))
      .join('\n');
    setBulkGeneratedNames(names);
  }, [parentDomain]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-slate-900">ENS Contract Naming Toolkit</h2>
        <p className="text-slate-600">Validate, generate, and manage ENS naming conventions</p>
      </div>

      <Tabs defaultValue="validator" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="validator">Name Validator</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
          <TabsTrigger value="generator">Bulk Generator</TabsTrigger>
        </TabsList>

        {/* Name Validator */}
        <TabsContent value="validator" className="space-y-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>ENS Name Validator</CardTitle>
              <CardDescription>
                Check if your subdomain follows best practices and naming conventions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="domain-name">Subdomain Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="domain-name"
                    placeholder="app.company.eth"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                  />
                  <Button onClick={handleValidate}>Validate</Button>
                </div>
              </div>

              {validationResult && (
                <div className="space-y-4 mt-6">
                  {/* Score Card */}
                  <Card className={`border-2 ${
                    validationResult.score >= 80 ? 'border-emerald-200 bg-emerald-50' :
                    validationResult.score >= 60 ? 'border-amber-200 bg-amber-50' :
                    'border-red-200 bg-red-50'
                  }`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            {validationResult.isValid ? (
                              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                            ) : (
                              <XCircle className="h-6 w-6 text-red-600" />
                            )}
                            <span className={`text-slate-900 ${
                              validationResult.score >= 80 ? 'text-emerald-900' :
                              validationResult.score >= 60 ? 'text-amber-900' :
                              'text-red-900'
                            }`}>
                              {validationResult.isValid ? 'Valid Name' : 'Invalid Name'}
                            </span>
                          </div>
                          <p className={`${
                            validationResult.score >= 80 ? 'text-emerald-700' :
                            validationResult.score >= 60 ? 'text-amber-700' :
                            'text-red-700'
                          }`}>
                            Convention Score: {validationResult.score}/100
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(domainInput)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Issues */}
                  {validationResult.issues.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-slate-700">Issues & Observations:</p>
                      {validationResult.issues.map((issue, index) => (
                        <Alert
                          key={index}
                          className={
                            issue.type === 'error' ? 'border-red-200 bg-red-50' :
                            issue.type === 'warning' ? 'border-amber-200 bg-amber-50' :
                            'border-blue-200 bg-blue-50'
                          }
                        >
                          {issue.type === 'error' && <XCircle className="h-4 w-4 text-red-600" />}
                          {issue.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-600" />}
                          {issue.type === 'info' && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                          <AlertDescription className={
                            issue.type === 'error' ? 'text-red-800' :
                            issue.type === 'warning' ? 'text-amber-800' :
                            'text-blue-800'
                          }>
                            {issue.message}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}

                  {/* Suggestions */}
                  {validationResult.suggestions.length > 0 && (
                    <Card className="border-2 border-blue-200 bg-blue-50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-900">
                          <Lightbulb className="h-5 w-5" />
                          Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {validationResult.suggestions.map((suggestion, index) => (
                          <p key={index} className="text-blue-800">• {suggestion}</p>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Alert className="border-purple-200 bg-purple-50">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <AlertTitle className="text-purple-900">Pro Tip</AlertTitle>
            <AlertDescription className="text-purple-800">
              For critical contracts (dao, vault, app), always use multisig ownership and burn appropriate fuses after deployment.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="space-y-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Naming Templates</CardTitle>
              <CardDescription>
                Pre-configured patterns following industry best practices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="parent-select">Parent Domain</Label>
                <DomainSelector
                  value={parentDomain}
                  onValueChange={setParentDomain}
                  placeholder="Select your domain"
                  filterSubdomains={true}
                  allowCustom={true}
                />
              </div>

              <div className="space-y-3 mt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-700">Core Infrastructure</p>
                  <Badge variant="secondary">Critical</Badge>
                </div>
                {namingTemplates.filter(t => t.category === 'core').map((template, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileCode className="h-4 w-4 text-blue-600" />
                          <p className="text-slate-900">{template.name}</p>
                        </div>
                        <p className="text-slate-600 mb-2">{template.description}</p>
                        <code className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                          {template.pattern.replace('{parent}', parentDomain)}
                        </code>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateFromTemplate(template)}
                      >
                        Use Template
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between mb-2 mt-6">
                  <p className="text-slate-700">Environments</p>
                  <Badge variant="outline">Non-Production</Badge>
                </div>
                {namingTemplates.filter(t => t.category === 'environment').map((template, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileCode className="h-4 w-4 text-amber-600" />
                          <p className="text-slate-900">{template.name}</p>
                        </div>
                        <p className="text-slate-600 mb-2">{template.description}</p>
                        <code className="text-amber-700 bg-amber-50 px-2 py-1 rounded">
                          {template.pattern.replace('{parent}', parentDomain)}
                        </code>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateFromTemplate(template)}
                      >
                        Use Template
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between mb-2 mt-6">
                  <p className="text-slate-700">Infrastructure</p>
                  <Badge variant="secondary">Supporting</Badge>
                </div>
                {namingTemplates.filter(t => t.category === 'infrastructure').map((template, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileCode className="h-4 w-4 text-purple-600" />
                          <p className="text-slate-900">{template.name}</p>
                        </div>
                        <p className="text-slate-600 mb-2">{template.description}</p>
                        <code className="text-purple-700 bg-purple-50 px-2 py-1 rounded">
                          {template.pattern.replace('{parent}', parentDomain)}
                        </code>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateFromTemplate(template)}
                      >
                        Use Template
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hierarchy Visualizer */}
        <TabsContent value="hierarchy" className="space-y-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Domain Hierarchy Visualizer</CardTitle>
              <CardDescription>
                Visual representation of your ENS subdomain structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                  <div className="flex items-center gap-3">
                    <Network className="h-6 w-6 text-blue-600" />
                    <div>
                      <p className="text-blue-900">{parentDomain}</p>
                      <p className="text-blue-700">Root Domain • Owner: Multisig Required</p>
                    </div>
                  </div>
                </div>

                <div className="ml-8 space-y-3">
                  {generateHierarchy()[0].children.map((child, index) => (
                    <div key={index} className="relative">
                      <div className="absolute -left-8 top-5 w-6 h-px bg-slate-300" />
                      <div className={`p-4 border-2 rounded-lg ${
                        child.security === 'Critical' ? 'border-red-200 bg-red-50' :
                        child.security === 'High' ? 'border-amber-200 bg-amber-50' :
                        child.security === 'Medium' ? 'border-blue-200 bg-blue-50' :
                        'border-slate-200 bg-slate-50'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className={`${
                              child.security === 'Critical' ? 'text-red-900' :
                              child.security === 'High' ? 'text-amber-900' :
                              child.security === 'Medium' ? 'text-blue-900' :
                              'text-slate-900'
                            }`}>
                              {child.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`${
                                child.security === 'Critical' ? 'text-red-700' :
                                child.security === 'High' ? 'text-amber-700' :
                                child.security === 'Medium' ? 'text-blue-700' :
                                'text-slate-700'
                              }`}>
                                {child.type}
                              </span>
                              <span>•</span>
                              <Badge variant={
                                child.security === 'Critical' ? 'destructive' :
                                child.security === 'High' ? 'secondary' :
                                'outline'
                              }>
                                {child.security} Security
                              </Badge>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleCopy(child.name)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Alert className="mt-6 border-emerald-200 bg-emerald-50">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <AlertTitle className="text-emerald-900">Hierarchy Best Practices</AlertTitle>
                <AlertDescription className="text-emerald-800">
                  • Keep hierarchy depth to 2-3 levels maximum
                  <br />• Use clear, functional names for each subdomain
                  <br />• Apply strictest security to critical infrastructure (dao, vault)
                  <br />• Separate production from development environments
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Generator */}
        <TabsContent value="generator" className="space-y-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Bulk Name Generator</CardTitle>
              <CardDescription>
                Generate multiple subdomains at once for your infrastructure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-parent">Parent Domain</Label>
                <DomainSelector
                  value={parentDomain}
                  onValueChange={setParentDomain}
                  placeholder="Select your domain"
                  filterSubdomains={true}
                  allowCustom={true}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Generated Subdomains</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const names = namingTemplates
                        .map(t => t.pattern.replace('{parent}', parentDomain))
                        .join('\n');
                      handleCopy(names);
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All
                  </Button>
                </div>
                <Textarea
                  value={namingTemplates
                    .map(t => t.pattern.replace('{parent}', parentDomain))
                    .join('\n')}
                  rows={12}
                  readOnly
                  className="font-mono"
                />
              </div>

              <Button className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export as JSON
              </Button>

              <Alert className="border-blue-200 bg-blue-50">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Review each generated name before deployment. Ensure appropriate security measures (multisig, fuses) are configured for production names.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
