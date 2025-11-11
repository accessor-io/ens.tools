import { useState } from 'react';
import { SchemaPreviewEditor } from './SchemaPreviewEditor';
import type { ENSIPXMetadata } from '../../lib/metadata';
import { DomainSelector } from '../ui/domain-selector';

export function SchemaPreviewView() {
  const [domain, setDomain] = useState('');
  
  const handleSave = (metadata: ENSIPXMetadata) => {
    console.log('Saved metadata:', metadata);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">ENSIP-X Schema Preview & Editor</h2>
        <p className="text-slate-600">Advanced schema editing with ENS compliance validation</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Domain</label>
        <DomainSelector
          value={domain}
          onValueChange={setDomain}
          placeholder="Select a domain"
          filterSubdomains={false}
          allowCustom={true}
        />
      </div>

      {domain && (
        <SchemaPreviewEditor
        domain={domain}
        initialMetadata={{
          displayName: "Uniswap V3 Governor",
          id: "example.uniswap-v3.defi.governor.v1-0-0.1",
          org: "example",
          protocol: "uniswap-v3",
          category: "defi",
          role: "governor",
          version: "v1-0-0",
          chainId: 1,
          addresses: [
            {
              chainId: 1,
              address: "0x0000000000000000000000000000000000000000",
              deployedBlock: 12345678
            }
          ],
          metadataHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
          security: {
            upgradeability: "uups",
            owners: ["0x0000000000000000000000000000000000000000"]
          },
          lifecycle: {
            status: "deployed"
          }
        }}
        onSave={handleSave}
        readOnly={false}
      />
      )}
    </div>
  );
}

