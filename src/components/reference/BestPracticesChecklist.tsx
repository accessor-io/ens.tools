import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  CheckCircle2, 
  Download, 
  FileText,
  AlertTriangle,
  XCircle,
  Info,
} from 'lucide-react';
import { 
  validateBestPractices,
  type ValidationContext,
} from '../../lib/best-practices/validator';
import { cn } from '../ui/utils';

interface BestPracticesChecklistProps {
  context: ValidationContext;
  onCheckChange?: (ruleId: string, checked: boolean) => void;
  manualChecks?: Record<string, boolean>;
  showProgress?: boolean;
  compact?: boolean;
}

export function BestPracticesChecklist({
  context,
  onCheckChange,
  manualChecks = {},
  showProgress = true,
  compact = false,
}: BestPracticesChecklistProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>(manualChecks);
  const [report, setReport] = useState(validateBestPractices(context));

  useEffect(() => {
    setReport(validateBestPractices(context));
    // Auto-check items that pass validation
    const autoChecked: Record<string, boolean> = {};
    report.results.forEach(({ rule, result }) => {
      if (result.passed) {
        autoChecked[rule.id] = true;
      }
    });
    setChecked(prev => ({ ...prev, ...autoChecked, ...manualChecks }));
  }, [context, manualChecks]);

  const handleCheckChange = (ruleId: string, isChecked: boolean) => {
    setChecked(prev => ({ ...prev, [ruleId]: isChecked }));
    onCheckChange?.(ruleId, isChecked);
  };

  const totalItems = report.results.length;
  const checkedCount = Object.values(checked).filter(Boolean).length;
  const completionPercentage = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

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

  const exportChecklist = () => {
    const lines: string[] = [];
    lines.push('# Best Practices Checklist');
    lines.push('');
    lines.push(`**Completion:** ${checkedCount}/${totalItems} (${completionPercentage}%)`);
    lines.push(`**Score:** ${report.score}/100`);
    lines.push('');
    lines.push('## Checklist');
    lines.push('');

    const byCategory = report.results.reduce((acc, { rule, result }) => {
      if (!acc[rule.category]) {
        acc[rule.category] = [];
      }
      acc[rule.category].push({ rule, result });
      return acc;
    }, {} as Record<string, Array<{ rule: any; result: any }>>);

    Object.entries(byCategory).forEach(([category, items]) => {
      lines.push(`### ${category.charAt(0).toUpperCase() + category.slice(1)}`);
      lines.push('');
      items.forEach(({ rule, result }) => {
        const isChecked = checked[rule.id] || false;
        const checkbox = isChecked ? '- [x]' : '- [ ]';
        const severity = `[${rule.severity}]`;
        lines.push(`${checkbox} ${severity} ${rule.recommendation}`);
        if (!result.passed) {
          lines.push(`  - Issue: ${result.message}`);
        }
      });
      lines.push('');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `best-practices-checklist-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (compact) {
    return (
      <Card className="border border-slate-200/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Best Practices Checklist</CardTitle>
            <Badge variant={completionPercentage === 100 ? 'default' : 'secondary'}>
              {completionPercentage}%
            </Badge>
          </div>
          {showProgress && (
            <Progress value={completionPercentage} className="h-2 mt-2" />
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {report.results.slice(0, 5).map(({ rule, result }) => {
              const isChecked = checked[rule.id] || false;
              const Icon = severityIcons[rule.severity];
              return (
                <div
                  key={rule.id}
                  className="flex items-start gap-2 p-2 rounded hover:bg-slate-50 transition-colors"
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) => handleCheckChange(rule.id, checked as boolean)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className={cn(
                        "h-4 w-4 flex-shrink-0",
                        result.passed ? "text-emerald-600" :
                        rule.severity === 'critical' ? "text-red-600" :
                        "text-amber-600"
                      )} />
                      <p className={cn(
                        "text-sm truncate",
                        isChecked ? "line-through text-slate-500" : "text-slate-900"
                      )}>
                        {rule.recommendation}
                      </p>
                      <Badge variant={severityColors[rule.severity]} className="text-xs ml-auto">
                        {rule.severity}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
            {report.results.length > 5 && (
              <p className="text-xs text-slate-500 text-center pt-2">
                +{report.results.length - 5} more items
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200/80">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Best Practices Checklist</CardTitle>
            <CardDescription>
              Track your progress implementing best practices
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportChecklist}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
        {showProgress && (
          <div className="space-y-2 pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Progress</span>
              <span className="font-medium text-slate-900">
                {checkedCount} / {totalItems} ({completionPercentage}%)
              </span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {['naming', 'metadata', 'security', 'management'].map((category) => {
            const categoryItems = report.results.filter(
              ({ rule }) => rule.category === category
            );

            if (categoryItems.length === 0) return null;

            return (
              <div key={category} className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-900 capitalize">
                  {category} Best Practices
                </h4>
                <div className="space-y-2">
                  {categoryItems.map(({ rule, result }) => {
                    const isChecked = checked[rule.id] || false;
                    const Icon = severityIcons[rule.severity];
                    return (
                      <div
                        key={rule.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                          isChecked
                            ? "bg-slate-50 border-slate-200"
                            : result.passed
                            ? "bg-emerald-50 border-emerald-200"
                            : rule.severity === 'critical'
                            ? "bg-red-50 border-red-200"
                            : "bg-amber-50 border-amber-200"
                        )}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => handleCheckChange(rule.id, checked as boolean)}
                          className="mt-1"
                        />
                        <Icon className={cn(
                          "h-5 w-5 mt-0.5 flex-shrink-0",
                          result.passed ? "text-emerald-600" :
                          rule.severity === 'critical' ? "text-red-600" :
                          "text-amber-600"
                        )} />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={cn(
                              "text-sm font-medium",
                              isChecked ? "line-through text-slate-500" : "text-slate-900"
                            )}>
                              {rule.recommendation}
                            </p>
                            <Badge variant={severityColors[rule.severity]} className="text-xs">
                              {rule.severity}
                            </Badge>
                            {result.passed && (
                              <Badge variant="outline" className="text-xs bg-emerald-100">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Passed
                              </Badge>
                            )}
                          </div>
                          {!result.passed && (
                            <p className="text-xs text-slate-600">{result.message}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            <strong className="text-slate-900">{checkedCount}</strong> of{' '}
            <strong className="text-slate-900">{totalItems}</strong> items completed
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-900">Score:</span>
            <Badge variant={report.score >= 90 ? 'default' : report.score >= 80 ? 'secondary' : 'outline'}>
              {report.score}/100
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


