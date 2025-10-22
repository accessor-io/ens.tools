import { useState } from 'react';
import { SchemaPreviewEditor } from './SchemaPreviewEditor';
import type { ENSIP19Metadata } from '../lib/ensip19-utils';

export function SchemaPreviewView() {
  const [domain] = useState('example.defi.cns.eth');
  
  const handleSave = (metadata: ENSIP19Metadata) => {
    console.log('Saved metadata:', metadata);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">ENSIP-19 Schema Preview & Editor</h2>
        <p className="text-slate-600">Advanced schema editing with ENS compliance validation</p>
      </div>

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
    </div>
  );
}

