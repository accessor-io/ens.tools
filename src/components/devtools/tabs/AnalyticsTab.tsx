import React from 'react';
import { ScrollArea } from '../../ui/scroll-area';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Download, TrendingUp, BarChart3, AlertCircle, Settings as SettingsIcon, Clock, X } from 'lucide-react';
import type { Analytics, ENSOperation } from '../types';

interface AnalyticsTabProps {
  analytics: Analytics;
  errorPatterns: Array<{pattern: string; count: number}>;
  operationComparison: string[];
  ensOperations: ENSOperation[];
  onExportOperations: () => void;
  onClearComparison: () => void;
}

export function AnalyticsTab({
  analytics,
  errorPatterns,
  operationComparison,
  ensOperations,
  onExportOperations,
  onClearComparison,
}: AnalyticsTabProps) {
  return (
    <div className="h-full flex flex-col p-4">
      <div className="text-slate-300 text-sm mb-4 flex items-center justify-between">
        <span>Performance Analytics</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onExportOperations}
        >
          <Download className="h-3 w-3 mr-1" />
          Export
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-[#252526] p-4 rounded border border-slate-700">
              <div className="text-slate-400 text-xs mb-1">Total Operations</div>
              <div className="text-2xl font-bold text-slate-300">{analytics.totalOps}</div>
            </div>
            <div className="bg-[#252526] p-4 rounded border border-slate-700">
              <div className="text-slate-400 text-xs mb-1">Success Rate</div>
              <div className="text-2xl font-bold text-green-400">{analytics.successRate}%</div>
            </div>
            <div className="bg-[#252526] p-4 rounded border border-slate-700">
              <div className="text-slate-400 text-xs mb-1">Avg Duration</div>
              <div className="text-2xl font-bold text-blue-400">{analytics.avgDuration}ms</div>
            </div>
            <div className="bg-[#252526] p-4 rounded border border-slate-700">
              <div className="text-slate-400 text-xs mb-1">Recent (1min)</div>
              <div className="text-2xl font-bold text-purple-400">{analytics.recentOps}</div>
            </div>
          </div>

          <div className="bg-[#252526] p-4 rounded border border-slate-700">
            <div className="text-slate-300 text-sm mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Operation Status
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-slate-400 text-xs mb-2">Success</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-800 rounded-full h-2">
                    <div 
                      className="bg-green-400 h-2 rounded-full transition-all"
                      style={{ width: `${analytics.totalOps > 0 ? (analytics.successOps / analytics.totalOps) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-slate-300 text-xs w-12 text-right">{analytics.successOps}</span>
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-xs mb-2">Errors</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-800 rounded-full h-2">
                    <div 
                      className="bg-red-400 h-2 rounded-full transition-all"
                      style={{ width: `${analytics.totalOps > 0 ? (analytics.errorOps / analytics.totalOps) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-slate-300 text-xs w-12 text-right">{analytics.errorOps}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#252526] p-4 rounded border border-slate-700">
            <div className="text-slate-300 text-sm mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Operations by Type
            </div>
            <div className="space-y-2">
              {Object.entries(analytics.opsByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline"
                      className={`text-[10px] ${
                        type === 'resolve' ? 'border-blue-500/30 text-blue-400' :
                        type === 'query' ? 'border-purple-500/30 text-purple-400' :
                        type === 'transaction' ? 'border-green-500/30 text-green-400' :
                        'border-slate-500/30 text-slate-400'
                      }`}
                    >
                      {type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 flex-1 ml-4">
                    <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full transition-all ${
                          type === 'resolve' ? 'bg-blue-400' :
                          type === 'query' ? 'bg-purple-400' :
                          type === 'transaction' ? 'bg-green-400' :
                          'bg-slate-400'
                        }`}
                        style={{ width: `${analytics.totalOps > 0 ? (count / analytics.totalOps) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-slate-300 text-xs w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {errorPatterns.length > 0 && (
            <div className="bg-[#252526] p-4 rounded border border-slate-700">
              <div className="text-slate-300 text-sm mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                Common Error Patterns
              </div>
              <div className="space-y-2">
                {errorPatterns.map((pattern, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono text-[10px] truncate flex-1">
                      {pattern.pattern}
                    </span>
                    <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400 ml-2">
                      {pattern.count}x
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {operationComparison.length === 2 && (
            <div className="bg-[#252526] p-4 rounded border border-slate-700">
              <div className="text-slate-300 text-sm mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <SettingsIcon className="h-4 w-4" />
                  Operation Comparison
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={onClearComparison}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                {operationComparison.map(opId => {
                  const op = ensOperations.find(o => o.id === opId);
                  if (!op) return null;
                  return (
                    <div key={opId} className="space-y-2">
                      <div className="font-semibold text-slate-300">{op.operation}</div>
                      <div className="text-slate-400">Duration: <span className="text-slate-300">{op.duration || 'N/A'}ms</span></div>
                      <div className="text-slate-400">Status: <span className={op.error ? 'text-red-400' : 'text-green-400'}>{op.error ? 'Error' : 'Success'}</span></div>
                      {op.domain && <div className="text-slate-400">Domain: <span className="text-slate-300">{op.domain}</span></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-[#252526] p-4 rounded border border-slate-700">
            <div className="text-slate-300 text-sm mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Performance
            </div>
            <div className="space-y-2">
              {ensOperations
                .slice(-10)
                .reverse()
                .map((op) => (
                  <div key={op.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-[10px] w-16">
                        {op.timestamp.toLocaleTimeString()}
                      </span>
                      <span className="text-slate-300">{op.operation}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {op.duration !== undefined && (
                        <span className="text-slate-400 text-[10px] w-12 text-right">
                          {op.duration}ms
                        </span>
                      )}
                      {op.error ? (
                        <AlertCircle className="h-3 w-3 text-red-400" />
                      ) : op.result ? (
                        <div className="h-2 w-2 rounded-full bg-green-400" />
                      ) : null}
                    </div>
                  </div>
                ))}
              {ensOperations.length === 0 && (
                <div className="text-slate-500 text-center py-4 text-xs">No operations yet</div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}













