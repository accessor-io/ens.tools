import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  XCircle, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { 
  validateBestPractices, 
  getRecommendations, 
  getValidationSummary,
  type ValidationContext,
} from '../../lib/best-practices/validator';
import { cn } from '../ui/utils';

interface BestPracticeRecommendationsProps {
  contractType?: string;
  contractAddress?: string;
  isProxy?: boolean;
  implementationAddress?: string;
  parentDomain?: string;
  subdomainLabel?: string;
  fullName?: string;
  metadata?: Record<string, string>;
  step?: string;
  chainId?: number;
  ownerAddress?: string;
  resolverAddress?: string;
  hasGranularPermissions?: boolean;
  granularDelegateAddress?: string;
  granularPermissions?: bigint;
  delegationExpiration?: number;
  compact?: boolean;
  showOnlyIssues?: boolean;
}

export function BestPracticeRecommendations({
  contractType,
  contractAddress,
  isProxy,
  implementationAddress,
  parentDomain,
  subdomainLabel,
  fullName,
  metadata,
  step,
  chainId,
  ownerAddress,
  resolverAddress,
  hasGranularPermissions,
  granularDelegateAddress,
  granularPermissions,
  delegationExpiration,
  compact = false,
  showOnlyIssues = false,
}: BestPracticeRecommendationsProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [context, setContext] = useState<ValidationContext>({});

  useEffect(() => {
    setContext({
      contractType,
      contractAddress,
      isProxy,
      implementationAddress,
      parentDomain,
      subdomainLabel,
      fullName: fullName || (parentDomain && subdomainLabel ? `${subdomainLabel}.${parentDomain}` : undefined),
      metadata,
      step,
      chainId,
      ownerAddress,
      resolverAddress,
      hasGranularPermissions,
      granularDelegateAddress,
      granularPermissions,
      delegationExpiration,
    });
  }, [
    contractType,
    contractAddress,
    isProxy,
    implementationAddress,
    parentDomain,
    subdomainLabel,
    fullName,
    metadata,
    step,
    chainId,
    ownerAddress,
    resolverAddress,
    hasGranularPermissions,
    granularDelegateAddress,
    granularPermissions,
    delegationExpiration,
  ]);

  const recommendations = getRecommendations(context);
  const summary = getValidationSummary(context);
  const report = validateBestPractices(context);

  const filteredRecommendations = showOnlyIssues
    ? recommendations.filter(r => !r.result.passed)
    : recommendations;

  if (filteredRecommendations.length === 0 && showOnlyIssues) {
    return null;
  }

  const severityColors = {
    critical: 'destructive',
    high: 'default',
    medium: 'secondary',
    low: 'outline',
  } as const;

  const severityIcons = {
    critical: XCircle,
    high: AlertTriangle,
    medium: Info,
    low: Info,
  } as const;

  if (compact) {
    return (
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card className="border border-slate-200/80">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center",
                    summary.criticalCount > 0 ? "bg-red-100" :
                    summary.score >= 90 ? "bg-emerald-100" :
                    summary.score >= 80 ? "bg-blue-100" :
                    "bg-amber-100"
                  )}>
                    {summary.criticalCount > 0 ? (
                      <XCircle className="h-4 w-4 text-red-600" />
                    ) : summary.score >= 90 ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-sm">Best Practices</CardTitle>
                    <CardDescription className="text-xs">
                      {summary.message} • Score: {summary.score}/100
                    </CardDescription>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {filteredRecommendations.slice(0, 3).map(({ rule, result }, index) => {
                  const Icon = severityIcons[result.severity];
                  return (
                    <div
                      key={rule.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border",
                        result.passed
                          ? "bg-emerald-50 border-emerald-200"
                          : result.severity === 'critical'
                          ? "bg-red-50 border-red-200"
                          : "bg-amber-50 border-amber-200"
                      )}
                    >
                      <Icon className={cn(
                        "h-5 w-5 mt-0.5 flex-shrink-0",
                        result.passed
                          ? "text-emerald-600"
                          : result.severity === 'critical'
                          ? "text-red-600"
                          : "text-amber-600"
                      )} />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">{rule.recommendation}</p>
                          <Badge variant={severityColors[result.severity]} className="text-xs">
                            {result.severity}
                          </Badge>
                        </div>
                        {!result.passed && (
                          <p className="text-xs text-slate-600">{result.message}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredRecommendations.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => window.location.hash = 'best-practices'}
                  >
                    View all {filteredRecommendations.length} recommendations
                  </Button>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Card className="border border-slate-200/80">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Best Practices Recommendations</CardTitle>
            <CardDescription>
              {summary.message} • Score: {summary.score}/100
            </CardDescription>
          </div>
          <Badge
            variant={
              summary.criticalCount > 0 ? 'destructive' :
              summary.score >= 90 ? 'default' :
              summary.score >= 80 ? 'secondary' :
              'outline'
            }
          >
            {summary.score}/100
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary.criticalCount > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Critical Issues</AlertTitle>
            <AlertDescription>
              {summary.criticalCount} critical issue{summary.criticalCount > 1 ? 's' : ''} must be resolved before proceeding.
            </AlertDescription>
          </Alert>
        )}

        {summary.score >= 90 && summary.criticalCount === 0 && (
          <Alert className="border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertTitle className="text-emerald-900">Excellent Compliance</AlertTitle>
            <AlertDescription className="text-emerald-800">
              All best practices are being followed. Great work!
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {filteredRecommendations.map(({ rule, result }) => {
            const Icon = severityIcons[result.severity];
            return (
              <div
                key={rule.id}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border",
                  result.passed
                    ? "bg-emerald-50 border-emerald-200"
                    : result.severity === 'critical'
                    ? "bg-red-50 border-red-200"
                    : result.severity === 'high'
                    ? "bg-amber-50 border-amber-200"
                    : "bg-blue-50 border-blue-200"
                )}
              >
                <Icon className={cn(
                  "h-5 w-5 mt-0.5 flex-shrink-0",
                  result.passed
                    ? "text-emerald-600"
                    : result.severity === 'critical'
                    ? "text-red-600"
                    : result.severity === 'high'
                    ? "text-amber-600"
                    : "text-blue-600"
                )} />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-slate-900">{rule.recommendation}</p>
                    <Badge variant={severityColors[result.severity]} className="text-xs">
                      {result.severity}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {rule.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">{result.message}</p>
                  {result.recommendation && result.recommendation !== rule.recommendation && (
                    <p className="text-xs text-slate-500">{result.recommendation}</p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      window.location.hash = rule.linkToSection;
                      // Scroll to section if in best practices view
                      const element = document.querySelector(rule.linkToSection);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                  >
                    Learn more <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {report.passed > 0 && (
          <div className="pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              {report.passed} of {report.total} best practices passed
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}



