import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Copy } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';

interface ConsoleLog {
  id: string;
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: Date;
  data?: any;
  stack?: string;
  ensContext?: {
    domain?: string;
    operation?: string;
    address?: string;
    category?: 'domain' | 'subdomain' | 'record' | 'delegation' | 'wrapper' | 'registration' | 'reverse';
  };
}

interface ConsoleLogItemProps {
  log: ConsoleLog;
  onCopy?: (text: string) => void;
}

export function ConsoleLogItem({ log, onCopy }: ConsoleLogItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasData = log.data && Array.isArray(log.data) && log.data.length > 0;
  const hasStack = log.stack && log.stack.length > 0;

  const formatValue = (value: any, depth = 0): string => {
    if (depth > 3) return '...';
    
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    
    if (typeof value === 'string') {
      return `"${value}"`;
    }
    
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        if (value.length > 5 && !isExpanded) {
          return `Array(${value.length}) [${value.slice(0, 3).map(v => formatValue(v, depth + 1)).join(', ')}, ...]`;
        }
        return `[${value.map(v => formatValue(v, depth + 1)).join(', ')}]`;
      }
      
      try {
        const keys = Object.keys(value);
        if (keys.length === 0) return '{}';
        if (keys.length > 5 && !isExpanded) {
          return `{${keys.slice(0, 3).map(k => `${k}: ${formatValue(value[k], depth + 1)}`).join(', ')}, ...}`;
        }
        return `{${keys.map(k => `${k}: ${formatValue(value[k], depth + 1)}`).join(', ')}}`;
      } catch {
        return String(value);
      }
    }
    
    return String(value);
  };

  const formatData = () => {
    if (!hasData) return null;
    
    if (log.data.length === 1) {
      const item = log.data[0];
      if (typeof item === 'object' && item !== null) {
        try {
          const json = JSON.stringify(item, null, 2);
          return (
            <pre className="text-xs text-white whitespace-pre-wrap break-words font-mono">
              {json}
            </pre>
          );
        } catch {
          return <div className="text-xs text-white">{formatValue(item)}</div>;
        }
      }
      return <div className="text-xs text-white">{formatValue(item)}</div>;
    }
    
    return (
      <div className="space-y-1">
        {log.data.map((item, idx) => {
          if (typeof item === 'object' && item !== null) {
            try {
              const json = JSON.stringify(item, null, 2);
              return (
                <pre key={idx} className="text-xs text-white whitespace-pre-wrap break-words font-mono ml-2">
                  {json}
                </pre>
              );
            } catch {
              return (
                <div key={idx} className="text-xs text-white ml-2">
                  {formatValue(item)}
                </div>
              );
            }
          }
          return (
            <div key={idx} className="text-xs text-white ml-2">
              {formatValue(item)}
            </div>
          );
        })}
      </div>
    );
  };

  const getCategoryColor = (category?: ConsoleLog['ensContext']['category']) => {
    if (!category) return null;
    
    switch (category) {
      case 'domain': return 'text-cyan-400';
      case 'subdomain': return 'text-emerald-400';
      case 'record': return 'text-purple-400';
      case 'delegation': return 'text-orange-400';
      case 'wrapper': return 'text-pink-400';
      case 'registration': return 'text-indigo-400';
      case 'reverse': return 'text-teal-400';
      default: return null;
    }
  };

  const getCategoryBg = (category?: ConsoleLog['ensContext']['category']) => {
    if (!category) return null;
    
    switch (category) {
      case 'domain': return 'bg-cyan-950/20 border-l-cyan-900/30';
      case 'subdomain': return 'bg-emerald-950/20 border-l-emerald-900/30';
      case 'record': return 'bg-purple-950/20 border-l-purple-900/30';
      case 'delegation': return 'bg-orange-950/20 border-l-orange-900/30';
      case 'wrapper': return 'bg-pink-950/20 border-l-pink-900/30';
      case 'registration': return 'bg-indigo-950/20 border-l-indigo-900/30';
      case 'reverse': return 'bg-teal-950/20 border-l-teal-900/30';
      default: return null;
    }
  };

  const getCategoryBadgeBg = (category?: ConsoleLog['ensContext']['category']) => {
    if (!category) return null;
    
    switch (category) {
      case 'domain': return 'bg-cyan-950/30';
      case 'subdomain': return 'bg-emerald-950/30';
      case 'record': return 'bg-purple-950/30';
      case 'delegation': return 'bg-orange-950/30';
      case 'wrapper': return 'bg-pink-950/30';
      case 'registration': return 'bg-indigo-950/30';
      case 'reverse': return 'bg-teal-950/30';
      default: return null;
    }
  };

  const getLogColor = (type: ConsoleLog['type'], category?: ConsoleLog['ensContext']['category']) => {
    // If there's a category, use category color, otherwise use type color
    const categoryColor = getCategoryColor(category);
    if (categoryColor) return categoryColor;
    
    switch (type) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      default: return 'text-white';
    }
  };

  const getLogBg = (type: ConsoleLog['type'], category?: ConsoleLog['ensContext']['category']) => {
    // If there's a category, use category background, otherwise use type background
    const categoryBg = getCategoryBg(category);
    if (categoryBg) return categoryBg;
    
    switch (type) {
      case 'error': return 'bg-red-950/20 border-l-red-900/30';
      case 'warn': return 'bg-yellow-950/20 border-l-yellow-900/30';
      case 'info': return 'bg-blue-950/20 border-l-blue-900/30';
      default: return 'bg-slate-800/30 border-l-slate-700/30';
    }
  };

  const copyLog = () => {
    let text = `[${log.timestamp.toLocaleTimeString()}] ${log.type.toUpperCase()}: ${log.message}`;
    if (hasData) {
      text += '\n' + JSON.stringify(log.data, null, 2);
    }
    if (hasStack) {
      text += '\n' + log.stack;
    }
    if (onCopy) {
      onCopy(text);
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  const hasExpandableContent = hasData || hasStack;
  const shouldShowExpandButton = hasExpandableContent && (
    hasData && (
      (Array.isArray(log.data) && log.data.length > 0) ||
      log.data.some((item: any) => typeof item === 'object' && item !== null)
    )
  );

  const categoryColor = getCategoryColor(log.ensContext?.category);
  const logColor = getLogColor(log.type, log.ensContext?.category);
  const logBg = getLogBg(log.type, log.ensContext?.category);

  return (
    <div className={cn(
      "group border-l-2 hover:bg-slate-800/50 transition-colors",
      logBg
    )}>
      <div className="flex items-start gap-2 py-1 px-2">
        <span className="text-white text-[10px] w-14 flex-shrink-0 font-mono">
          {log.timestamp.toLocaleTimeString()}
        </span>
        <span className={cn(
          "text-[10px] w-12 flex-shrink-0 uppercase font-semibold",
          logColor
        )}>
          {log.type}
        </span>
        {log.ensContext?.category && (
          <span className={cn(
            "text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold",
            categoryColor,
            getCategoryBadgeBg(log.ensContext.category),
            "border border-current/20"
          )}>
            {log.ensContext.category}
          </span>
        )}
        {shouldShowExpandButton && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white hover:text-slate-100 mt-0.5 flex-shrink-0"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}
        {hasStack && !shouldShowExpandButton && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white hover:text-slate-100 mt-0.5 flex-shrink-0"
            title={isExpanded ? "Collapse stack trace" : "Show stack trace"}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className={cn("break-words", logColor)}>
            {log.message}
          </div>
          {!isExpanded && hasData && log.data && log.data.length > 0 && (
            <div className="mt-0.5 text-xs text-white font-mono">
              {log.data.length === 1 && typeof log.data[0] === 'object' && log.data[0] !== null ? (
                <span className="text-white">
                  {Array.isArray(log.data[0]) 
                    ? `Array(${log.data[0].length})`
                    : `Object {${Object.keys(log.data[0]).length} keys}`}
                </span>
              ) : log.data.length > 1 ? (
                <span className="text-white">{log.data.length} items</span>
              ) : null}
            </div>
          )}
          {!isExpanded && hasStack && (
            <div className="mt-0.5 text-xs text-white font-mono">
              Stack trace available
            </div>
          )}
          {isExpanded && hasData && (
            <div className="mt-1 ml-4 font-mono text-xs text-white">
              {formatData()}
            </div>
          )}
          {isExpanded && hasStack && (
            <div className="mt-2 ml-4 font-mono text-[10px] text-red-400/80 whitespace-pre-wrap border-l-2 border-red-900/30 pl-2">
              <div className="text-red-300/60 mb-1">Stack trace:</div>
              {log.stack?.split('\n').map((line, idx) => (
                <div key={idx} className="text-red-400/70">
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-white hover:text-slate-100"
            onClick={copyLog}
            title="Copy log"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

