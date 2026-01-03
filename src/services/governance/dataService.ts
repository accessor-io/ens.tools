/**
 * Data service for loading and caching ENS DAO financial and governance data from static files.
 * Uses fetch with LRU-like in-memory caching, smart error handling and normalization.
 * All data files are under the /data path (the DATA_BASE_PATH variable).
 * In development, a Vite proxy should be used to avoid CORS limitations.
 * Transaction data is now fetched via RPC calls to reduce repository size.
 */
import { alchemyService, AlchemyTransfer } from './alchemyService';

const DATA_BASE_PATH = '/data';

// ---- Improved Type Declarations ----
// (Consolidated, trimmed, and alphabetized key types for better readability & navigation)

export interface AddressCluster {
  addresses: string[];
  addresses_formatted: { address: string; label: string; ens_name: string }[];
  size: number;
}

export interface AddressClusters {
  ownership_clusters: Record<string, AddressCluster>;
  convergence_points: Record<string, ConvergencePoint>;
  shared_recipient_clusters?: SharedRecipientCluster[];
  communities?: Record<string, AddressCommunity>;
}

export interface AddressCommunity {
  addresses: string[];
  addresses_formatted: { address: string; label: string; ens_name: string }[];
  analysis: AddressCommunityAnalysis;
  size: number;
}

export interface AddressCommunityAnalysis {
  cohesion_ratio: number;
  external_edge_count: number;
  external_edges: ClusterEdge[];
  external_flow_usd: number;
  internal_edge_count: number;
  internal_edges: ClusterEdge[];
  internal_flow_usd: number;
}

export interface AddressIdentification {
  address: string;
  ens_name: string;
  label: string;
  contract_name: string | null;
  is_contract: boolean;
  is_safe: boolean;
  safe_owners: string[] | null;
  contract_creator: string | null;
  known_label: string | null;
  identification_method: string;
}

export interface AddressIdentifications {
  identified: AddressIdentification[];
}

export interface AddressRelationshipEvidence {
  address1: string;
  address2: string;
  label1: string;
  label2: string;
  reason: string;
}

export interface AddressRelationship {
  address1: string;
  address2: string;
  address1_label: string;
  address2_label: string;
  evidence_count: number;
  evidence: AddressRelationshipEvidence[];
}

export interface AddressRelationships {
  total_pairs: number;
  relationships: AddressRelationship[];
}

export interface AllProposalsInitiatives {
  fetched_at: string;
  source: string;
  total_count: number;
  topics: Record<string, Proposal>;
}

export interface AnalyticsData {
  metadata: {
    generated_at: string;
    total_wallets: number;
    total_eth_sent: number;
    total_usd_sent: number;
  };
  trends: {
    growth_rate: number;
    recent_avg: number;
    previous_avg: number;
    trend_direction: string;
    volatility: number;
  };
  insights: Array<{
    type: string;
    title: string;
    description: string;
    value: number;
    severity: string;
  }>;
  top_performers: {
    top_spenders: Array<{
      name: string;
      address: string;
      category: string;
      total_usd: number;
      total_eth: number;
      transaction_count: number;
    }>;
    top_recipients: Array<{
      address: string;
      label: string;
      total_usd: number;
      transaction_count: number;
    }>;
  };
  distribution_analysis: Record<string, {
    percentage: number;
    total_usd: number;
    wallet_count: number;
    avg_per_wallet: number;
  }>;
  category_flows: Array<{
    from: string;
    to: string;
    usd: number;
    eth: number;
    count: number;
  }>;
  velocity_analysis: {
    recent_velocity: number;
    previous_velocity: number;
    velocity_change: number;
    total_quarters: number;
  };
}

export interface ClusterEdge {
  from: string;
  to: string;
  usd: number;
  tx_count: number;
}

export interface ConvergencePoint {
  sources: string[];
  source_count: number;
  total_inflow_usd: number;
  total_tx_count: number;
}

export interface DiscourseBudgetReport {
  id: number;
  title: string;
  url: string;
  created_at: string;
  tags: string[];
  post_count: number;
  views: number;
  content?: string;
  [key: string]: any;
}

export interface DiscourseBudgetReports {
  metadata?: {
    fetched_at: string;
    total_reports: number;
  };
  reports: DiscourseBudgetReport[];
  [key: string]: any;
}

export interface DiscourseReportSummary {
  id: number;
  title: string;
  url: string;
  created_at: string;
  tags: string[];
  post_count: number;
  views: number;
}

export interface DiscourseReportsSummary {
  metadata: {
    fetched_at: string;
    total_reports: number;
  };
  summary: DiscourseReportSummary[];
}

export interface EndowmentData {
  metadata: {
    source: string;
    address: string;
    description: string;
    start_date: string;
    end_date: string;
  };
  by_year_month: Record<string, {
    year: number;
    month: number;
    quarter: number;
    usd: number;
    eth: number;
    allocated_usd: number;
    defi_results_usd: number;
    apy: number;
  }>;
}

export interface ENSNameToAddress { [address: string]: string; }
export interface ENSSubnameData {
  [ensName: string]: {
    address: string;
    owner: string;
    resolver: string;
    isSafe?: boolean;
    source?: string;
    createdAt?: string;
  };
}
export interface ENSSubnameSafeWallets {
  working_group_safes: {
    ecosystem: Array<{ ens_name: string; address: string; isSafe: boolean; in_wallet_addresses: boolean; label: string }>;
    meta_governance: Array<{ ens_name: string; address: string; isSafe: boolean; in_wallet_addresses: boolean; label: string }>;
    public_goods: Array<{ ens_name: string; address: string; isSafe: boolean; in_wallet_addresses: boolean; label: string }>;
  };
}
export interface ENSSubnames {
  [parentDomain: string]: Array<{
    name: string;
    label: string;
    owner: string;
    resolver: string;
    createdAt: string;
  }>;
}

export interface FundFlowsData {
  metadata: { total_nodes: number; total_flows: number; total_value: number };
  nodes: Array<{
    id: number;
    name: string;
    address: string;
    category: string;
    ens_name: string | null;
    type: string;
    total_sent: number;
    total_received: number;
  }>;
  links: Array<{
    source: number | string;
    target: number | string;
    value: number;
    count: number;
    usd?: number;
  }>;
}
export interface FundFlowTree {
  metadata: {
    generated_at: string;
    root_sources: string[];
    total_flows: number;
    total_trees: number;
  };
  trees: Array<{
    root: {
      address: string;
      label: string;
      category: string;
      ens_name: string | null;
    };
    tree: {
      address: string;
      label: string;
      category: string;
      ens_name: string | null;
      children: Array<any>;
      flows: Array<{
        to_address: string;
        to_label: string;
        to_category: string;
        transactions: number;
        total_eth: number;
        total_usdc: number;
        total_usd: number;
      }>;
    };
  }>;
}
export interface FundFlowsMapping {
  metadata: {
    generated_at: string;
    total_wallets: number;
    total_root_flows: number;
    total_internal_flows: number;
    total_external_flows: number;
  };
  root_source_flows: Array<{
    from: { address: string; label: string; category: string };
    to: { address: string; label: string; category: string };
    transactions: number;
    total_eth: number;
    total_usd: number;
    period: { first_year: number; last_year: number };
  }>;
  internal_flows: Array<{
    from: { address: string; label: string; category: string };
    to: { address: string; label: string; category: string };
    transactions: number;
    total_eth: number;
    total_usd: number;
    period: { first_year: number; last_year: number };
  }>;
  external_flows: Array<{
    from: { address: string; label: string; category: string };
    to: { address: string; label: string; category: string };
    transactions: number;
    total_eth: number;
    total_usd: number;
    period: { first_year: number; last_year: number };
  }>;
}
export interface FundHandlingContracts {
  summary: {
    total_contracts: number;
    safe_multisigs: number;
    other_contracts: number;
    with_ens_names: number;
    missing_from_wallet_addresses: number;
    total_eth: number;
    total_usd: number;
    safe_multisigs_total_eth: number;
    safe_multisigs_total_usd: number;
    other_contracts_total_eth: number;
    other_contracts_total_usd: number;
    [key: string]: any;
  };
  safe_multisigs: Array<{
    address: string;
    ens_name: string | null;
    isSafe: boolean;
    transaction_count: number;
    total_eth: number;
    total_usd: number;
    first_seen: number;
    last_seen: number;
    in_wallet_addresses: boolean;
  }>;
  other_contracts: Array<{
    address: string;
    ens_name: string | null;
    isSafe: boolean;
    transaction_count: number;
    total_eth: number;
    total_usd: number;
    first_seen: number;
    last_seen: number;
    in_wallet_addresses: boolean;
  }>;
}

export interface KPKEndowmentData {
  [year: string]: {
    [month: string]: {
      report: {
        DAO_ID: number;
        year: number;
        month: number;
        ETH: {
          summary: {
            totalFunds: number | null;
            allocatedFunds: number;
            deFiResults: number;
            APY: number;
            fundsByTokenCategory: Array<{
              value: string;
              allocation: number;
              funds: number;
              label: string;
              color: string;
            }>;
            fundsByType: Array<{
              value: string;
              allocation: number;
              funds: number;
              label: string;
              color: string;
            }>;
            fundsByBlockchain?: Array<{
              value: string;
              allocation: number;
              funds: number;
              label: string;
              color: string;
            }>;
            fundsByProtocol?: Array<{
              value: string;
              allocation: number;
              funds: number;
              label: string;
              color: string;
            }>;
          };
        };
      };
    };
  };
}

// Additional type definitions
export interface SpendingSummary {
  metadata: {
    generated_at: string;
    total_wallets: number;
    total_eth_sent: number;
    total_usd_sent: number;
  };
  by_year_quarter: Record<string, {
    eth: number;
    usd: number;
    count: number;
    wallet_count: number;
  }>;
  by_category: Record<string, {
    total_eth: number;
    total_usd: number;
    wallet_count: number;
    transaction_count: number;
    by_year_quarter: Record<string, {
      eth: number;
      usd: number;
      count: number;
      wallet_count: number;
    }>;
  }>;
  top_recipients: Array<{
    address: string;
    label?: string;
    wallet_labels?: string[];
    category?: string;
    usd?: number;
    total_eth?: number;
    total_usd?: number;
    transaction_count?: number;
    wallet_count?: number;
    by_year_quarter?: Record<string, {
      eth: number;
      usd: number;
      count: number;
    }>;
  }>;
  all_wallets: Array<{
    address?: string;
    wallet?: {
      address: string;
      label?: string;
      ens_name?: string;
      category?: string;
    };
    transaction_count?: number;
    total_eth_sent?: number;
    total_usd_sent?: number;
    by_year_quarter?: Record<string, {
      eth: number;
      usd: number;
      count: number;
    }>;
  }>;
}

export interface TransactionsByApprover {
  'Approver EP': string;
  'Approver Title': string;
  'Approver URL': string;
  'Working Group': string;
  'Term': string | null;
  'Quarter': string;
  'Transaction Count': number;
  'Unique Transactions': number;
  'Wallet Count': number;
  'Total USD': number;
  'Total ETH': number;
  'Total USDC': number;
  'Total ENS': number;
  'First Transaction Date': string;
  'Last Transaction Date': string;
}

export interface UnusualFundFlows {
  organizational_to_unknown: Array<{
    from_address: string;
    from_label: string;
    from_wg: string;
    to_address: string;
    to_label: string | null;
    total_usd: number;
    tx_count: number;
  }>;
  circular_flows?: Array<any>;
  short_circuit_paths?: Array<any>;
  cross_wg_flows?: Array<any>;
}

export interface WalletInventory {
  metadata: {
    safe_multisigs: number;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface ProposalsByYear {
  [year: string]: any;
}

export interface TransactionTree {
  [key: string]: any;
}

export interface TransactionsByQuarterByWallet {
  data: Array<{
    quarter: string;
    wallet_label: string;
    category: string;
    total_usd: number;
    transaction_count: number;
  }>;
}

// ---- Improved DataService implementation ----
class DataService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private static CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour
  private static MAX_CACHE_SIZE = 50;

  /**
   * Generic JSON loader with LRU cache and error handling.
   */
  async fetchJson<T>(path: string): Promise<T> {
    const cacheItem = this.cache.get(path);
    const now = Date.now();
    if (cacheItem && (now - cacheItem.timestamp) < DataService.CACHE_EXPIRY) {
      return cacheItem.data as T;
    }
    try {
      const response = await fetch(`${DATA_BASE_PATH}/${path}`);
      if (!response.ok) throw new Error(`Failed to load ${path}: ${response.statusText}`);
      const data = await response.json();

      // LRU Eviction (remove oldest if needed)
      if (this.cache.size >= DataService.MAX_CACHE_SIZE) {
        const oldestKey = Array.from(this.cache.entries()).reduce(
          (oldest, [key, val]) => (!oldest || val.timestamp < oldest[1].timestamp ? [key, val] : oldest),
          null as [string, { timestamp: number }] | null
        )?.[0];
        if (oldestKey) this.cache.delete(oldestKey);
      }
      this.cache.set(path, { data, timestamp: now });
      return data as T;
    } catch (e) {
      console.error(`Error loading ${path}:`, e);
      throw e;
    }
  }

  clearCache(path?: string): void {
    path ? this.cache.delete(path) : this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  // The following methods return strongly typed data for callers,
  // with easy extension or overrides for new file endpoints.

  getSpendingSummary() {
    return this.fetchJson<SpendingSummary>('summaries/ens_wallet_spending_summary.json');
  }
  getAnalytics() {
    return this.fetchJson<AnalyticsData>('summaries/spending_analytics.json');
  }
  getFundFlows() {
    return this.fetchJson<FundFlowsData>('mappings/fund_flows.json');
  }
  getEndowment() {
    return this.fetchJson<EndowmentData>('summaries/endowment_summary.json');
  }
  getWalletInventory() {
    return this.fetchJson<WalletInventory>('summaries/comprehensive_wallet_inventory.json');
  }
  getFundFlowTree() {
    return this.fetchJson<FundFlowTree>('mappings/fund_flow_tree.json');
  }
  getFundFlowsMapping() {
    return this.fetchJson<FundFlowsMapping>('mappings/fund_flows_mapping.json');
  }
  getFundHandlingContracts() {
    return this.fetchJson<FundHandlingContracts>('mappings/fund_handling_contracts.json');
  }
  getWalletHierarchyTreemap() {
    return this.fetchJson<WalletHierarchyTreemap>('mappings/wallet_hierarchy_treemap.json');
  }
  getENSSubnameSafeWallets() {
    return this.fetchJson<ENSSubnameSafeWallets>('mappings/ens_subname_safe_wallets.json');
  }
  getENSSubnames() {
    return this.fetchJson<ENSSubnames>('mappings/ens_subnames.json');
  }

  /**
   * Get ENS name mapping (address -> ENS name), prefer all_address_resolutions.json.
   * Normalizes addresses to lowercase and falls back to ENSSubnameData on error.
   */
  async getENSNameToAddress(): Promise<ENSNameToAddress> {
    try {
      const raw = await this.fetchJson<ENSNameToAddress>('processed/address_clusters_analysis/all_address_resolutions.json');
      return Object.fromEntries(Object.entries(raw || {}).map(([addr, name]) => [addr.toLowerCase(), name]));
    } catch {
      // Fallback from ENS subnames
      const subnameMap = await this.fetchJson<ENSSubnameData>('mappings/ens_subnames.json').catch(() => ({}));
      return Object.fromEntries(
        Object.entries(subnameMap || {}).filter(([, v]) => v?.address).map(
          ([name, v]) => [v.address?.toLowerCase() || '', name]
        ).filter(([addr]) => addr) // Remove entries with empty addresses
      );
    }
  }

  getKPKEndowmentData() {
    return this.fetchJson<KPKEndowmentData>('summaries/kpk_endowment_data.json');
  }

  /**
   * Get individual wallet transactions (sent and received).
   * Fetches data via RPC calls to Alchemy API instead of static files.
   * Gracefully returns null for either side if not present.
   */
  async getWalletTransactions(address: string): Promise<{ sent: WalletTransactionData | null; received: WalletTransactionData | null}> {
    const addr = address.toLowerCase();
    try {
      // Fetch transfers via RPC instead of static files
      const [sentTransfers, receivedTransfers] = await Promise.all([
        alchemyService.getAssetTransfers(addr, 'from', 10000).catch(() => []),
        alchemyService.getAssetTransfers(addr, 'to', 10000).catch(() => []),
      ]);

      // Transform Alchemy transfers to WalletTransactionData format
      const transformTransfers = (transfers: AlchemyTransfer[]): WalletTransactionData => ({
        jsonrpc: '2.0',
        id: 1,
        result: {
          transfers: transfers.map(t => ({
            blockNum: t.blockNum,
            uniqueId: t.uniqueId,
            hash: t.hash,
            from: t.from,
            to: t.to,
            value: t.value || 0,
            asset: t.asset || 'ETH',
            category: t.category || 'external',
            erc721TokenId: t.erc721TokenId || null,
            erc1155Metadata: t.erc1155Metadata || null,
            tokenId: t.tokenId || null,
            rawContract: t.rawContract || {
              value: '0x0',
              address: null,
              decimal: '0x12'
            },
            metadata: t.metadata || null
          }))
        }
      });

      return {
        sent: sentTransfers.length > 0 ? transformTransfers(sentTransfers) : null,
        received: receivedTransfers.length > 0 ? transformTransfers(receivedTransfers) : null
      };
    } catch (e) {
      console.error(`Error loading transactions for ${address}:`, e);
      // Fallback to static files if RPC fails
      try {
        const [sent, received] = await Promise.all([
          this.fetchJson<WalletTransactionData>(`address_transactions/${addr}_sent_transactions.json`).catch((): WalletTransactionData | null => null),
          this.fetchJson<WalletTransactionData>(`address_transactions/${addr}_received_transactions.json`).catch((): WalletTransactionData | null => null),
        ]);
        return { sent, received };
      } catch (fallbackError) {
        console.error(`Fallback to static files also failed for ${address}:`, fallbackError);
        return { sent: null, received: null };
      }
    }
  }

  // Convenience accessors for report/category file APIs
  getTransactionsByApprover() {
    return this.fetchJson<TransactionsByApprover[]>('exports/transactions_by_approver.json');
  }
  getTransactionsByApproverDetailed() {
    return this.fetchJson('exports/transactions_by_approver_detailed.json');
  }
  getUnusualFundFlows() {
    return this.fetchJson<UnusualFundFlows>('exports/unusual_fund_flows.json');
  }
  getOrganizationSummary() {
    return this.fetchJson('summaries/organization_summary.json').catch(() => null);
  }
  getAnalysisReport(reportName: string) {
    return this.fetchJson(`exports/analysis_reports/${reportName}.json`);
  }
  get2025WalletFlows() {
    return this.fetchJson('exports/2025_ens_wallet_flows/wallet_ensdao_eth_2025_flows_summary.json');
  }

  // Governance & reporting
  getAllProposals() {
    return this.fetchJson<AllProposalsInitiatives>('raw/all_proposals_initiatives.json');
  }
  getProposalsByYear() {
    return this.fetchJson<ProposalsByYear>('raw/proposals_by_year.json');
  }
  getDiscourseBudgetReports() {
    return this.fetchJson<DiscourseBudgetReports>('raw/discourse_budget_reports.json');
  }
  getDiscourseReportsSummary() {
    return this.fetchJson<DiscourseReportsSummary>('raw/discourse_reports_summary.json');
  }

  // Tree & analysis
  getTransactionTree() {
    return this.fetchJson<TransactionTree>('raw/transaction_tree_sample.json');
  }
  getAddressClusters() {
    return this.fetchJson<AddressClusters>('raw/address_clusters.json');
  }
  getAddressIdentifications() {
    return this.fetchJson<AddressIdentifications>('raw/address_identifications.json');
  }
  getAddressRelationships() {
    return this.fetchJson<AddressRelationships>('raw/address_relationships.json');
  }
  getTransactionsByQuarterByWallet() {
    return this.fetchJson<TransactionsByQuarterByWallet>('raw/transactions_by_quarter_by_wallet.json');
  }
}

// WalletTransactionData breakdown for transaction fetches
export interface WalletTransactionData {
  jsonrpc: string;
  id: number;
  result: {
    transfers: Array<{
      blockNum: string;
      uniqueId: string;
      hash: string;
      from: string;
      to: string;
      value: number;
      asset: string;
      category: string;
      erc721TokenId: string | null;
      erc1155Metadata: any | null;
      tokenId: string | null;
      rawContract: {
        value: string;
        address: string | null;
        decimal: string;
      };
      metadata: any | null;
    }>;
  };
}

// Singleton instance
export const dataService = new DataService();
