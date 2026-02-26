import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../../lib/services';
import { fetchENSNames, type ENSDomain } from '../../lib/ens/ens-utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { Input } from './input';
import { Button } from './button';
import { Loader2 } from 'lucide-react';

interface DomainSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowCustom?: boolean;
  filterSubdomains?: boolean;
}

export function DomainSelector({
  value,
  onValueChange,
  placeholder = 'Select a domain',
  disabled = false,
  allowCustom = true,
  filterSubdomains = true,
}: DomainSelectorProps) {
  const { address, isConnected } = useWeb3();
  const [domains, setDomains] = useState<ENSDomain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const loadDomains = useCallback(async () => {
    if (!address) return;
    
    setIsLoading(true);
    try {
      const fetchedDomains = await fetchENSNames(address);
      
      // Filter out subdomains if requested (only show root domains)
      // Root domains have exactly 2 parts (label.eth), subdomains have 3+ parts
      const filteredDomains = filterSubdomains
        ? fetchedDomains.filter(d => {
            const parts = d.name.split('.');
            return parts.length === 2; // Only root domains like "company.eth"
          })
        : fetchedDomains;
      
      setDomains(filteredDomains);
    } catch (error) {
      console.error('Error loading domains:', error);
    } finally {
      setIsLoading(false);
    }
  }, [address, filterSubdomains]);

  useEffect(() => {
    if (isConnected && address) {
      loadDomains();
    } else {
      setDomains([]);
    }
  }, [isConnected, address, loadDomains]);

  // Check if current value is a custom value (not in the list)
  const isCustomValue = value && !domains.some(d => d.name === value);

  return (
    <div className="space-y-2">
      <Select
        value={isCustomValue ? 'custom' : value}
        onValueChange={(val: any) => {
          if (val === 'custom') {
            setCustomValue(value || '');
          } else {
            onValueChange(val);
          }
        }}
        disabled={disabled || isLoading}
      >
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? 'Loading domains...' : placeholder}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {value || placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {domains.length === 0 && !isLoading && (
            <div className="px-2 py-1.5 text-sm text-slate-500">
              {isConnected ? 'No domains found' : 'Connect wallet to see your domains'}
            </div>
          )}
          {domains.map((domain) => (
            <SelectItem key={domain.name} value={domain.name}>
              {domain.name}
            </SelectItem>
          ))}
          {allowCustom && (
            <>
              <div className="h-px bg-slate-200 my-1" />
              <SelectItem value="custom">
                Enter custom domain...
              </SelectItem>
            </>
          )}
        </SelectContent>
      </Select>
      
      {isCustomValue && allowCustom && (
        <Input
          type="text"
          value={customValue}
          onChange={(e) => {
            setCustomValue(e.target.value);
            onValueChange(e.target.value);
          }}
          placeholder="Enter domain name (e.g., company.eth)"
        />
      )}
    </div>
  );
}

