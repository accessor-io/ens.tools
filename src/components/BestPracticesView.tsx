import { useState } from 'react';
import { Input } from './ui/input';
import { Search } from 'lucide-react';
import { BestPractices } from './BestPractices';

export function BestPracticesView() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-slate-900">Contract Naming & Metadata Best Practices</h2>
        <p className="text-slate-600">Security-focused guidelines for ENS deployment and configuration</p>
      </div>

      {/* Search */}
      <div className="relative max-w-2xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search best practices, recommendations, or security guidelines..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Best Practices Content */}
      <BestPractices searchQuery={searchQuery} />
    </div>
  );
}
