import { useState } from 'react';
import { Input } from './ui/input';
import { Search } from 'lucide-react';
import { ProtocolSection } from './ProtocolSection';
import { Shield, Network, Database, Globe, Vote } from 'lucide-react';

export function ProtocolReference() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-slate-900">ENS Protocol Reference</h2>
        <p className="text-slate-600">Complete protocol features and configuration options</p>
      </div>

      {/* Search */}
      <div className="relative max-w-2xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search features, services, or configurations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Protocol Sections */}
      <div className="space-y-6">
        <ProtocolSection
          icon={Shield}
          title="I. Protocol Core: Ownership, Registration, and Identity"
          description="Administrative and tokenized aspects of the name"
          features={[
            {
              name: 'Name Lease Duration',
              description: 'The time the name is registered via the Permanent Registrar.',
              config: 'Setting: Any whole number of years (1 year minimum).'
            },
            {
              name: 'Name Renewal (Gasless)',
              description: 'Renewals handled through specialized smart contracts to reduce gas costs.',
              config: 'Setting: Renewal amount and timing handled by delegating the renewal transaction to a specialized contract (often via a third-party service).'
            },
            {
              name: 'ENS Domain NFT (ERC-721)',
              description: 'The token representing ownership of the .eth name.',
              config: 'Setting: Transfer the NFT to any Ethereum address, multisig, or smart contract (transfer of full ownership).'
            },
            {
              name: 'Controller Address Delegation',
              description: 'Separating the right to manage records from the right to own the name.',
              config: 'Setting: Assigning any wallet or contract as the Controller. This allows a cold wallet (Owner) to secure the asset while a hot wallet (Controller) manages the data.'
            },
            {
              name: 'Name Normalization (UTS #46)',
              description: 'Standard for ensuring names are non-ambiguous and correctly processed across different systems (e.g., preventing mixed-script homograph attacks).',
              config: 'Setting: Non-configurable by the user; names are automatically normalized by the Registrar during registration.'
            },
            {
              name: 'Reverse Resolution (Primary Name)',
              description: 'Linking an Ethereum address back to a single human-readable ENS name for display in wallets/dApps.',
              config: 'Setting: The wallet sets its reverse record to point to the desired ENS name it owns. (Required for DApp UX).'
            }
          ]}
          searchQuery={searchQuery}
        />

        <ProtocolSection
          icon={Network}
          title="II. Advanced Architecture and Delegation"
          description="Name structure and control delegation via the ENS Name Wrapper"
          features={[
            {
              name: 'ENS Name Wrapper (EWN)',
              description: 'Converts the name to an ERC-1155 token, enabling granular permission control using Fuses.',
              config: 'Setting: Wrap() or Unwrap() the name token. Only wrapped names support Fuses.'
            },
            {
              name: 'Permission Burning (Fuses)',
              description: 'Permanently revoking specific administrative rights over the name, increasing security and enabling safe delegation.',
              config: 'Permanently Configurable Fuses (Once True, Cannot Be Reversed): CANNOT_UNWRAP, CANNOT_SET_RESOLVER, CANNOT_SET_TTL, CANNOT_CREATE_SUBDOMAIN, CANNOT_TRANSFER',
              fuses: [
                { name: 'CANNOT_UNWRAP', description: 'Prevents the name from being reverted to the original ERC-721 token.' },
                { name: 'CANNOT_SET_RESOLVER', description: 'Prevents the Controller from changing the Resolver address.' },
                { name: 'CANNOT_SET_TTL', description: 'Prevents the Controller from changing the caching time.' },
                { name: 'CANNOT_CREATE_SUBDOMAIN', description: 'Prevents the creation of subdomains under the wrapped name.' },
                { name: 'CANNOT_TRANSFER', description: 'Prevents transfer of the wrapped ERC-1155 token.' }
              ]
            },
            {
              name: 'Subdomain Management',
              description: 'Delegating parts of the namespace (e.g., dev.company.eth).',
              config: 'Setting: The parent Owner defines the Owner and Controller for each new subdomain (setSubnodeOwner).'
            },
            {
              name: 'Wildcard Resolution',
              description: 'Defining a default response for any unassigned subdomain within a parent name.',
              config: 'Setting: Configured on the Resolver Contract. Enables lookups for *.parent.eth to fall back to the parent\'s records (e.g., pointing all traffic to a single application).'
            }
          ]}
          searchQuery={searchQuery}
        />

        <ProtocolSection
          icon={Database}
          title="III. Resolution Records and Data Mapping"
          description="Key/value pairs that the ENS name resolves to"
          features={[
            {
              name: 'Resolver Contract Assignment',
              description: 'Defining the specific smart contract responsible for handling data requests for the name.',
              config: 'Setting: Target Resolver Address. Options: Public Resolver (standard data), Custom Resolver (dynamic logic), or Name Wrapper Resolver.'
            },
            {
              name: 'Multi-Chain Address Records',
              description: 'Storing addresses for non-EVM blockchains.',
              config: 'Setting: Selection of Coin Type (e.g., BTC, LTC, ZEC, XMR, SOL, DOGE, etc.). Value: The target address string for that Coin Type.'
            },
            {
              name: 'Content Hash Record (EIP-1577)',
              description: 'Mapping the name to decentralized content (websites, files).',
              config: 'Setting: Protocol Type (IPFS, Swarm, Tor). Value: The corresponding content hash (CID) used by browsers and dApps.'
            },
            {
              name: 'Text Records (Metadata)',
              description: 'Storing arbitrary metadata for user profiles and application context.',
              config: 'Key/Value Pairs (User Configurable): email, url, avatar, description, notice, keywords, and any custom key defined by a dApp.'
            },
            {
              name: 'Social Media Records',
              description: 'Specialized Text Records for social linking.',
              config: 'Key/Value Pairs (Standardized): com.twitter, com.github, org.discord, etc. Value: Username or link for the service.'
            },
            {
              name: 'ABI Records (EIP-1617)',
              description: 'Storing the Application Binary Interface (ABI) of a smart contract on-chain.',
              config: 'Setting: ABI format (JSON string or content hash pointer). Allows wallets and explorers to interact with the contract identified by the name.'
            }
          ]}
          searchQuery={searchQuery}
        />

        <ProtocolSection
          icon={Globe}
          title="IV. Interoperability and DNS Integration"
          description="Unified naming system bridging Web3 and traditional DNS"
          features={[
            {
              name: 'DNS Name Resolution (EIP-1185)',
              description: 'Allowing ENS names to return traditional DNS records (A, AAAA, CNAME, TXT, etc.).',
              config: 'Setting: Requires configuring the relevant DNS record type and value within the ENS records.'
            },
            {
              name: 'DNSSEC Integration (EIP-4021)',
              description: 'Claiming and managing any existing DNS name (e.g., google.com) through the ENS protocol, verifiable via DNSSEC proof.',
              config: 'Configuration: The DNS name owner must set a specific DNS TXT record (_ens.name.tld) to verify ownership on-chain. The name then functions as a regular ENS name, but is controlled off-chain via DNS.'
            },
            {
              name: 'Off-Chain Data Resolution (CCIP-Read/EIP-3668)',
              description: 'Resolving data that is stored off-chain (e.g., on a L2 or traditional server) while maintaining on-chain security.',
              config: 'Setting: Implementing the CCIP-Read interface in a custom Resolver and specifying the trusted gateway URL where the dynamic data is retrieved.'
            },
            {
              name: 'L2/Sidechain Address Mapping',
              description: 'Specialized records to map names to addresses on scaling solutions (Polygon, Arbitrum, Optimism).',
              config: 'Setting: Utilizes the Multi-Coin record standard, ensuring wallets can identify the correct chain for transaction sending (e.g., cointype: 137 for Polygon).'
            }
          ]}
          searchQuery={searchQuery}
        />

        <ProtocolSection
          icon={Vote}
          title="V. Governance and Protocol Development"
          description="Decentralized protocol governance by the community"
          features={[
            {
              name: 'ENS DAO Governance',
              description: 'Control over the root of the ENS registry, the treasury, and future protocol upgrades.',
              config: 'Setting: Voting power is represented by the $ENS token. Holders can submit or vote on proposals (EPs).'
            },
            {
              name: 'Token Delegation',
              description: 'Assigning voting power to another address or delegate without transferring ownership of the $ENS tokens.',
              config: 'Setting: Delegating tokens to a chosen delegate address. This is the primary mechanism for governance participation.'
            },
            {
              name: 'Treasury Management',
              description: 'Overseeing the revenue generated from registrations and renewals.',
              config: 'Setting: Controlled by DAO votes; funds are allocated for grants, development, and community initiatives.'
            },
            {
              name: 'Pricing Policy',
              description: 'Setting the cost structure for name registration and renewal (currently tiered by name length).',
              config: 'Setting: Controlled by DAO vote and executed via the Registrar contract. (Prices are fixed in USD and charged in ETH).'
            }
          ]}
          searchQuery={searchQuery}
        />
      </div>
    </div>
  );
}
