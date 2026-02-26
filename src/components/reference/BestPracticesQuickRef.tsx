import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface QuickRefCard {
  title: string;
  category: 'naming' | 'metadata' | 'security' | 'management' | 'permissions';
  examples: string[];
  keyPoints: string[];
  severity: 'critical' | 'high' | 'medium';
}

const quickRefCards: QuickRefCard[] = [
  {
    title: 'Naming Patterns',
    category: 'naming',
    severity: 'critical',
    examples: [
      'app.project.eth',
      'dao.project.eth',
      'vault.project.eth',
      'registry.project.eth',
    ],
    keyPoints: [
      'Use standard prefixes (app, dao, vault)',
      'Lowercase, hyphen-separated',
      'Environment labels: dev, staging',
    ],
  },
  {
    title: 'Proxy Addresses',
    category: 'metadata',
    severity: 'critical',
    examples: [
      'Always use proxy address',
      'Never point to implementation',
      'Verify on blockchain explorer',
    ],
    keyPoints: [
      'Point to proxy, not implementation',
      'Upgrades fail if wrong address',
      'Verify before locking fuses',
    ],
  },
  {
    title: 'Multisig Ownership',
    category: 'security',
    severity: 'critical',
    examples: [
      'Use Gnosis Safe multisig',
      'Governance contract ownership',
      'Never single EOA for critical contracts',
    ],
    keyPoints: [
      'Critical contracts need multisig',
      'DAO, vault, treasury = multisig',
      'Single EOA = single point of failure',
    ],
  },
  {
    title: 'Name Wrapper Fuses',
    category: 'security',
    severity: 'critical',
    examples: [
      'Burn CANNOT_SET_RESOLVER',
      'Burn CANNOT_TRANSFER',
      'Burn CANNOT_UNWRAP',
    ],
    keyPoints: [
      'Burn fuses for critical contracts',
      'Irreversible protection',
      'Prevents accidental changes',
    ],
  },
  {
    title: 'Required Metadata',
    category: 'metadata',
    severity: 'high',
    examples: [
      'description: Contract purpose',
      'url: Documentation link',
      'eth.contract.type: ERC20, Governor, etc.',
    ],
    keyPoints: [
      'Always include description',
      'Add contract type',
      'Include version info',
    ],
  },
  {
    title: 'Public Resolver',
    category: 'management',
    severity: 'high',
    examples: [
      'Use ENS Public Resolver',
      'Only custom for CCIP-Read',
      'Audited and battle-tested',
    ],
    keyPoints: [
      'Default to Public Resolver',
      'Lower maintenance burden',
      'Reduced security surface',
    ],
  },
  {
    title: 'Granular Permissions',
    category: 'permissions',
    severity: 'critical',
    examples: [
      'Grant SET_TEXT_RECORD only',
      'Set 90-day expiration',
      'Lock critical delegates',
    ],
    keyPoints: [
      'Use granular permissions vs full transfer',
      'Always set expiration dates',
      'Follow least privilege principle',
    ],
  },
];

interface BestPracticesQuickRefProps {
  contractType?: string;
  compact?: boolean;
}

export function BestPracticesQuickRef({ contractType, compact = false }: BestPracticesQuickRefProps) {
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({});

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItems(prev => ({ ...prev, [id]: true }));
    toast.success('Copied to clipboard', {
      description: text,
    });
    setTimeout(() => {
      setCopiedItems(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 2000);
  };

  const filteredCards = contractType
    ? quickRefCards.filter(card => {
        // Filter logic based on contract type
        if (contractType.toLowerCase().includes('dao') || contractType.toLowerCase().includes('governor')) {
          return card.category === 'naming' || card.category === 'security';
        }
        if (contractType.toLowerCase().includes('token')) {
          return card.category === 'metadata' || card.category === 'naming';
        }
        return true;
      })
    : quickRefCards;

  const severityColors = {
    critical: 'destructive',
    high: 'default',
    medium: 'secondary',
  } as const;

  if (compact) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {filteredCards.slice(0, 4).map((card, index) => (
          <Card key={index} className="border border-slate-200/80 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{card.title}</CardTitle>
                <Badge variant={severityColors[card.severity]} className="text-xs">
                  {card.severity}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1">
                {card.keyPoints.slice(0, 2).map((point, i) => (
                  <p key={i} className="text-xs text-slate-600">• {point}</p>
                ))}
              </div>
              {card.examples.length > 0 && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-xs font-mono text-slate-500 truncate">
                    {card.examples[0]}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Quick Reference</h3>
        <p className="text-sm text-slate-600">
          Essential best practices at a glance
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCards.map((card, index) => (
          <Card key={index} className="border border-slate-200/80 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{card.title}</CardTitle>
                <Badge variant={severityColors[card.severity]} className="text-xs">
                  {card.severity}
                </Badge>
              </div>
              <CardDescription className="text-xs capitalize">
                {card.category}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                {card.keyPoints.map((point, i) => (
                  <p key={i} className="text-sm text-slate-600">• {point}</p>
                ))}
              </div>

              {card.examples.length > 0 && (
                <div className="pt-2 border-t border-slate-200 space-y-1">
                  <p className="text-xs font-medium text-slate-500 mb-1">Examples:</p>
                  {card.examples.map((example, i) => {
                    const exampleId = `${index}-${i}`;
                    const isCopied = copiedItems[exampleId];
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded border border-slate-200"
                      >
                        <code className="text-xs text-slate-700 flex-1 truncate">
                          {example}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 flex-shrink-0"
                          onClick={() => handleCopy(example, exampleId)}
                          title="Copy example"
                        >
                          {isCopied ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3 text-slate-400" />
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs h-7"
                onClick={() => {
                  window.location.hash = `#${card.category}`;
                  const element = document.querySelector(`#best-practices-${card.category}`);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
              >
                Learn more <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}



