import { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { EmptyState } from './ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Globe,
  Shield,
  Clock,
  Wallet,
  Activity,
  RefreshCw,
  Link as LinkIcon,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useWeb3 } from '../lib/services';
import { fetchENSNames, getExpirationStatus, getDaysUntilExpiration, ENSDomain } from '../lib/ens';
import { wrapName, unwrapName } from '../lib/ens';
import { toast } from 'sonner';
import { DomainProfile } from './domains/DomainProfile';

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: string; sub: string; icon: React.ElementType }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <Icon className="h-4 w-4 text-gray-400" />
      </div>
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{sub}</div>
    </div>
  );
}

export function Dashboard() {
  const { address, isConnected, publicClient, walletClient } = useWeb3();
  const [domains, setDomains] = useState<ENSDomain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingDomain, setProcessingDomain] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<ENSDomain | null>(null);

  useEffect(() => {
    if (isConnected && address) {
      loadDomains();
    } else {
      setDomains([]);
    }
  }, [isConnected, address]);

  const loadDomains = async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const fetchedDomains = await fetchENSNames(address);
      setDomains(fetchedDomains);
      if (fetchedDomains.length > 0) {
        toast.success(`Loaded ${fetchedDomains.length} domain${fetchedDomains.length !== 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error('Error loading domains:', error);
      toast.error('Failed to load domains', {
        action: { label: 'Retry', onClick: () => loadDomains() },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWrap = async (domain: ENSDomain) => {
    if (!walletClient || !publicClient || !address) {
      toast.error('Please connect your wallet');
      return;
    }
    setProcessingDomain(domain.name);
    try {
      const hash = await wrapName(walletClient, {
        name: domain.name,
        owner: address,
        fuses: 0,
        expiry: BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60),
      });
      toast.success(`Wrapped ${domain.name}`, { description: `Tx: ${hash.slice(0, 10)}…` });
      await loadDomains();
    } catch (error: any) {
      toast.error('Failed to wrap domain', { description: error.message });
    } finally {
      setProcessingDomain(null);
    }
  };

  const handleUnwrap = async (domain: ENSDomain) => {
    if (!walletClient || !publicClient || !address) {
      toast.error('Please connect your wallet');
      return;
    }
    setProcessingDomain(domain.name);
    try {
      const hash = await unwrapName(walletClient, publicClient, {
        name: domain.name,
        newController: address,
      });
      toast.success(`Unwrapped ${domain.name}`, { description: `Tx: ${hash.slice(0, 10)}…` });
      await loadDomains();
    } catch (error: any) {
      toast.error('Failed to unwrap domain', { description: error.message });
    } finally {
      setProcessingDomain(null);
    }
  };

  const expiringSoon = domains.filter(d => {
    const days = getDaysUntilExpiration(d.expiryDate);
    return days !== null && days < 90 && days > 0;
  });

  const alerts = domains
    .filter(d => {
      const days = getDaysUntilExpiration(d.expiryDate);
      return (days !== null && days < 90) || !d.resolver;
    })
    .slice(0, 5)
    .map(d => {
      const days = getDaysUntilExpiration(d.expiryDate);
      if (days !== null && days <= 0) return { level: 'error' as const, text: `${d.name} has expired`, detail: d.expiryDate?.toLocaleDateString() };
      if (days !== null && days < 90) return { level: 'warning' as const, text: `${d.name} expires in ${days}d`, detail: d.expiryDate?.toLocaleDateString() };
      if (!d.resolver) return { level: 'info' as const, text: `${d.name} — no resolver`, detail: 'Configure resolver' };
      return null;
    })
    .filter(Boolean) as Array<{ level: 'error' | 'warning' | 'info'; text: string; detail?: string }>;

  // Not connected state
  if (!isConnected) {
    return (
      <div className="max-w-xl mx-auto mt-24 text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-6 h-6 text-gray-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Connect your wallet</h2>
        <p className="text-sm text-gray-500 mb-6">Connect a wallet to view and manage your ENS domains.</p>
        <div className="grid grid-cols-3 gap-3 mb-8 max-w-sm mx-auto">
          <StatCard label="Domains" value="—" sub="Connect wallet" icon={Globe} />
          <StatCard label="Wrapped" value="—" sub="—" icon={Activity} />
          <StatCard label="Expiring" value="—" sub="< 90 days" icon={Clock} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Overview'}
            {domains.length > 0 && ` · ${domains.length} domain${domains.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadDomains}
          disabled={isLoading}
          className="h-8 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard
          label="Total"
          value={domains.length.toString()}
          sub={`${domains.length} owned`}
          icon={Globe}
        />
        <StatCard
          label="Wrapped"
          value={domains.filter(d => d.isWrapped).length.toString()}
          sub={`${Math.round((domains.filter(d => d.isWrapped).length / Math.max(domains.length, 1)) * 100)}% of total`}
          icon={Activity}
        />
        <StatCard
          label="Expiring"
          value={expiringSoon.length.toString()}
          sub="< 90 days"
          icon={Clock}
        />
        <StatCard
          label="Resolved"
          value={domains.filter(d => d.resolver).length.toString()}
          sub="With resolver"
          icon={Shield}
        />
      </div>

      {/* Main content: domains table + alerts */}
      <div className="grid grid-cols-3 gap-4">
        {/* Domain list — 2 cols */}
        <div className="col-span-2 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-900">Domains</h3>
            <span className="text-xs text-gray-400">{domains.length} total</span>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-50 rounded animate-pulse" />
              ))}
            </div>
          ) : domains.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Globe className="h-6 w-6 text-gray-400" />}
                title="No domains found"
                description="This address doesn't own any ENS names."
                action={{ label: 'Refresh', onClick: loadDomains }}
              />
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {/* Table header */}
              <div className="flex items-center gap-3 px-4 py-2 text-[11px] font-medium text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
                <span className="flex-1 min-w-0">Name</span>
                <span className="w-[70px] shrink-0">Status</span>
                <span className="w-[50px] shrink-0 text-right">Days</span>
                <span className="w-[90px] shrink-0 text-right">Actions</span>
              </div>
              {domains.map((domain, i) => {
                const status = getExpirationStatus(domain.expiryDate);
                const days = getDaysUntilExpiration(domain.expiryDate);

                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedDomain(domain)}
                  >
                    {/* Name */}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-50 rounded flex items-center justify-center shrink-0">
                        <Globe className="h-3 w-3 text-blue-600" />
                      </div>
                      <span className="text-[13px] font-medium text-gray-900 truncate">{domain.name}</span>
                      {domain.isWrapped && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1 shrink-0">Wrapped</Badge>
                      )}
                    </div>

                    {/* Status */}
                    <div className="w-[70px] shrink-0">
                      {status === 'active' && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-green-700 font-medium">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full shrink-0" />
                          Active
                        </span>
                      )}
                      {status === 'expiring-soon' && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0" />
                          Expiring
                        </span>
                      )}
                      {status === 'expired' && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-red-600 font-medium">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                          Expired
                        </span>
                      )}
                    </div>

                    {/* Days */}
                    <div className="w-[50px] shrink-0 text-right text-[12px] text-gray-500 tabular-nums">
                      {days !== null ? `${days}d` : '—'}
                    </div>

                    {/* Actions */}
                    <div className="w-[90px] shrink-0 flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] px-2"
                        disabled={processingDomain === domain.name}
                        onClick={() => domain.isWrapped ? handleUnwrap(domain) : handleWrap(domain)}
                      >
                        {processingDomain === domain.name ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <LinkIcon className="h-3 w-3 mr-1" />
                            {domain.isWrapped ? 'Unwrap' : 'Wrap'}
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setSelectedDomain(domain)}
                      >
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alerts panel — 1 col */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-900">Alerts</h3>
            {alerts.length > 0 && (
              <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{alerts.length}</span>
            )}
          </div>

          {alerts.length === 0 ? (
            <div className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              <span className="text-sm text-gray-500">No alerts</span>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {alerts.map((alert, i) => (
                <div key={i} className="px-4 py-3 flex items-start gap-3">
                  {alert.level === 'error' && <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />}
                  {alert.level === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />}
                  {alert.level === 'info' && <Activity className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 leading-tight">{alert.text}</p>
                    {alert.detail && <p className="text-xs text-gray-400 mt-0.5">{alert.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick stats in sidebar */}
          {domains.length > 0 && (
            <>
              <div className="border-t border-gray-100 px-4 py-3">
                <h4 className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-3">Portfolio</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">Wrapped</span>
                      <span className="text-gray-700 font-medium">
                        {domains.filter(d => d.isWrapped).length}/{domains.length}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${(domains.filter(d => d.isWrapped).length / domains.length) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">Resolved</span>
                      <span className="text-gray-700 font-medium">
                        {domains.filter(d => d.resolver).length}/{domains.length}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${(domains.filter(d => d.resolver).length / domains.length) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">Active</span>
                      <span className="text-gray-700 font-medium">
                        {domains.filter(d => getExpirationStatus(d.expiryDate) === 'active').length}/{domains.length}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-800 rounded-full transition-all"
                        style={{ width: `${(domains.filter(d => getExpirationStatus(d.expiryDate) === 'active').length / domains.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Domain Profile Dialog */}
      {selectedDomain && (
        <DomainProfile
          domain={selectedDomain}
          onClose={() => setSelectedDomain(null)}
          onUpdate={loadDomains}
        />
      )}
    </div>
  );
}
