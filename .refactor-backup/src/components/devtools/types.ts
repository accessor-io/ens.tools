export interface ConsoleLog {
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

export interface ENSOperation {
  id: string;
  type: 'resolve' | 'query' | 'transaction' | 'metadata';
  domain?: string;
  address?: string;
  operation: string;
  timestamp: Date;
  duration?: number;
  result?: any;
  error?: string;
  details?: Record<string, any>;
  gasUsed?: bigint;
  gasPrice?: bigint;
  transactionHash?: string;
}

export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  timestamp: Date;
  duration?: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
  error?: string;
  isENSRelated: boolean;
}

export interface WatchedDomain {
  id: string;
  domain: string;
  lastChecked: Date;
  lastState: any;
  checkInterval: number;
  isActive: boolean;
  changeCount: number;
}

export interface PerformanceProfile {
  operation: string;
  count: number;
  totalDuration: number;
  minDuration: number;
  maxDuration: number;
  avgDuration: number;
  p50: number;
  p95: number;
  p99: number;
  errors: number;
}

export interface SavedFilter {
  name: string;
  query: string;
  domain: string;
  type: string;
}

export interface Analytics {
  totalOps: number;
  successOps: number;
  errorOps: number;
  successRate: string;
  avgDuration: number;
  opsByType: Record<string, number>;
  recentOps: number;
}


