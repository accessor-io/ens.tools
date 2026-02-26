import React, { useState, useEffect, useMemo, useCallback, useContext } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ChevronRight,
  ChevronDown,
  Wallet,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink,
  Filter,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  ArrowUpDown,
  HelpCircle,
  X,
} from "lucide-react";

// import { CommentButton } from "@/components/Comments";
// import { AuthContext } from "@/App";

interface ApproverRecord {
  "Approver EP": string;
  "Approver Title": string;
  "Approver URL": string;
  "Working Group": string;
  "Term": string | null;
  "Quarter": string;
  "Transaction Count": number;
  "Unique Transactions": number;
  "Wallet Count": number;
  "Total USD": number;
  "Total ETH": number;
  "Total USDC": number;
  "Total ENS": number;
  "First Transaction Date": string;
  "Last Transaction Date": string;
}

interface UnusualFlow {
  from_address: string;
  from_label: string;
  from_wg: string;
  to_address: string;
  to_label: string | null;
  total_usd: number;
  tx_count: number;
}

interface Transaction {
  tx_hash: string;
  wallet_address: string;
  from_address: string;
  to_address: string;
  date: string;
  quarter: string;
  token_type: string;
  token_amount: number | null;
  value_eth: number | null;
  value_usd: number | null;
  wallet_label: string;
  working_group: string;
}

interface AddressIdentification {
  address: string;
  ens_name: string | null;
  label: string | null;
  known_label: string | null;
}

interface WalletData {
  wallet_info: {
    address: string;
    label: string;
    working_group: string;
  };
  summary: {
    total_usd: number;
    total_eth: number;
    total_usdc: number;
    total_ens: number;
    transaction_count: number;
  };
  transactions: Transaction[];
}

interface TransactionsByQuarter {
  [quarter: string]: {
    [walletAddress: string]: WalletData;
  };
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value)) return "$0.00";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
};

const formatNumber = (value: number | null | undefined, decimals: number = 4): string => {
  if (value == null || Number.isNaN(value)) return "0";
  return value.toFixed(decimals);
};

const formatAddress = (addr: string): string => {
  if (!addr) return "Unknown";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

const WORKING_GROUP_COLORS: Record<string, string> = {
  Ecosystem: "bg-emerald-100 text-emerald-800 border-emerald-300",
  "Public Goods": "bg-purple-100 text-purple-800 border-purple-300",
  "Meta-Governance": "bg-blue-100 text-blue-800 border-blue-300",
  Community: "bg-amber-100 text-amber-800 border-amber-300",
  Unknown: "bg-slate-100 text-slate-800 border-slate-300",
};

type SortField = "date" | "amount" | "usd";
type SortDirection = "asc" | "desc";

export function MasterBalanceSheet() {
  const { isAuthenticated, userAddress } = useContext(AuthContext);

  const [approverData, setApproverData] = useState([] as ApproverRecord[]);
  const [transactionData, setTransactionData] =
    useState(null as TransactionsByQuarter | null);
  const [unusualFlows, setUnusualFlows] = useState(
    null as { organizational_to_unknown: UnusualFlow[] } | null,
  );
  const [addressMap, setAddressMap] = useState(new Map<string, AddressIdentification>());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null as string | null);
  const [expandedQuarters, setExpandedQuarters] = useState(new Set<string>());
  const [expandedBudgets, setExpandedBudgets] = useState(new Set<string>());
  const [expandedWallets, setExpandedWallets] = useState(new Set<string>());
  const [filterWG, setFilterWG] = useState("all");
  const [filterQuarter, setFilterQuarter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("date" as SortField);
  const [sortDirection, setSortDirection] = useState("desc" as SortDirection);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [approvers, txData, flows, addressIds] = await Promise.all([
          fetch("/data/exports/transactions_by_approver.json").then((r) => r.json()),
          fetch("/data/raw/transactions_by_quarter_by_wallet.json").then((r) => r.json()),
          fetch("/data/exports/unusual_fund_flows.json").then((r) => r.json()),
          fetch("/data/raw/address_identifications.json").then((r) => r.json()),
        ]);

        setApproverData(approvers || []);
        setTransactionData(txData || {});
        setUnusualFlows(flows || null);

        const addrMap = new Map<string, AddressIdentification>();
        if (addressIds?.identified) {
          (addressIds.identified as AddressIdentification[]).forEach((id) => {
            addrMap.set(id.address.toLowerCase(), id);
          });
        }
        setAddressMap(addrMap);
      } catch (err) {
        console.error("Failed to load data:", err);
        setError("Failed to load balance sheet data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const resolveAddress = useCallback(
    (addr: string): { display: string; ens: string | null; label: string | null; isUnknown: boolean } => {
      if (!addr) return { display: "Unknown", ens: null, label: null, isUnknown: true };
      const id = addressMap.get(addr.toLowerCase());
      if (id) {
        const ens = id.ens_name;
        const label = id.label || id.known_label;
        return {
          display: ens || label || formatAddress(addr),
          ens,
          label,
          isUnknown: false,
        };
      }
      return { display: formatAddress(addr), ens: null, label: null, isUnknown: true };
    },
    [addressMap]
  );

  const matchesSearch = useCallback(
    (tx: Transaction, query: string): boolean => {
      if (!query) return true;
      const q = query.toLowerCase();
      const fromResolved = resolveAddress(tx.from_address);
      const toResolved = resolveAddress(tx.to_address);
      return (
        tx.tx_hash?.toLowerCase().includes(q) ||
        tx.from_address?.toLowerCase().includes(q) ||
        tx.to_address?.toLowerCase().includes(q) ||
        fromResolved.display.toLowerCase().includes(q) ||
        toResolved.display.toLowerCase().includes(q) ||
        tx.token_type?.toLowerCase().includes(q) ||
        (tx.value_usd?.toString() || "").includes(q)
      );
    },
    [resolveAddress]
  );

  const sortTransactions = useCallback(
    (txs: Transaction[]): Transaction[] => {
      return [...txs].sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case "date":
            comparison = (a.date || "").localeCompare(b.date || "");
            break;
          case "amount":
            comparison = (a.token_amount || 0) - (b.token_amount || 0);
            break;
          case "usd":
            comparison = (a.value_usd || 0) - (b.value_usd || 0);
            break;
        }
        return sortDirection === "desc" ? -comparison : comparison;
      });
    },
    [sortField, sortDirection]
  );

  const filterByDateRange = useCallback(
    (txs: Transaction[]): Transaction[] => {
      return txs.filter((tx) => {
        if (!tx.date) return true;
        if (dateFrom && tx.date < dateFrom) return false;
        if (dateTo && tx.date > dateTo) return false;
        return true;
      });
    },
    [dateFrom, dateTo]
  );

  const exportToCSV = useCallback(() => {
    if (!transactionData) return;

    const rows: string[] = [];
    rows.push(
      "Quarter,Wallet,Wallet Label,Direction,Date,Counterparty,Counterparty Name,Token,Amount,ETH Value,USD Value,Tx Hash,Is Unknown"
    );

    Object.entries(transactionData as TransactionsByQuarter).forEach(([quarter, wallets]) => {
      Object.entries(wallets as { [walletAddr: string]: WalletData }).forEach(
        ([walletAddr, walletData]) => {
        walletData.transactions.forEach((tx) => {
          const toResolved = resolveAddress(tx.to_address);
          rows.push(
            [
              quarter,
              walletAddr,
              walletData.wallet_info?.label || "",
              "OUT",
              tx.date || "",
              tx.to_address || "",
              toResolved.display,
              tx.token_type || "ETH",
              tx.token_amount?.toString() || "0",
              tx.value_eth?.toString() || "0",
              tx.value_usd?.toString() || "0",
              tx.tx_hash || "",
              toResolved.isUnknown ? "YES" : "NO",
            ]
              .map((v) => `"${v}"`)
              .join(","),
          );
        });
      },
      );
    });

    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ens-dao-transactions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [transactionData, resolveAddress]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterWG("all");
    setFilterQuarter("all");
    setDateFrom("");
    setDateTo("");
  };

  const allTransactions = useMemo(() => {
    if (!transactionData) return [] as Transaction[];
    const txs: Transaction[] = [];
    Object.values(transactionData as TransactionsByQuarter).forEach((quarterData) => {
      Object.values(quarterData as { [walletAddress: string]: WalletData }).forEach(
        (walletData) => {
          txs.push(...walletData.transactions);
        },
      );
    });
    return txs;
  }, [transactionData]);

  const getIncomingTransactions = (walletAddress: string, quarter: string) => {
    return allTransactions.filter(
      (tx) => tx.to_address?.toLowerCase() === walletAddress.toLowerCase() && tx.quarter === quarter,
    );
  };

  const hierarchyData = useMemo(() => {
    if (!approverData || !transactionData) return null;

    const quarters: Record<
      string,
      {
        quarter: string;
        budgets: Record<
          string,
          {
            ep: string;
            title: string;
            url: string;
            workingGroup: string;
            term: string | null;
            budgetedUSD: number;
            actualUSD: number;
            transactions: number;
            wallets: Record<
              string,
              {
                address: string;
                label: string;
                total_usd: number;
                total_eth: number;
                transaction_count: number;
                transactions: Transaction[];
              }
            >;
          }
        >;
        totalBudgeted: number;
        totalActual: number;
        variance: number;
      }
    > = {};

    approverData.forEach((record: ApproverRecord) => {
      const quarter = record.Quarter;
      if (!quarters[quarter]) {
        quarters[quarter] = {
          quarter,
          budgets: {},
          totalBudgeted: 0,
          totalActual: 0,
          variance: 0,
        };
      }

      const budgetKey = `${record["Approver EP"]}-${record["Working Group"]}`;
      if (!quarters[quarter].budgets[budgetKey]) {
        quarters[quarter].budgets[budgetKey] = {
          ep: record["Approver EP"],
          title: record["Approver Title"],
          url: record["Approver URL"],
          workingGroup: record["Working Group"],
          term: record["Term"],
          budgetedUSD: record["Total USD"] || 0,
          actualUSD: 0,
          transactions: record["Transaction Count"] || 0,
          wallets: {},
        };
      } else {
        quarters[quarter].budgets[budgetKey].budgetedUSD += record["Total USD"] || 0;
        quarters[quarter].budgets[budgetKey].transactions += record["Transaction Count"] || 0;
      }

      quarters[quarter].totalBudgeted += record["Total USD"] || 0;
    });

    Object.entries(transactionData as TransactionsByQuarter).forEach(([quarter, wallets]) => {
      if (!quarters[quarter]) {
        quarters[quarter] = {
          quarter,
          budgets: {},
          totalBudgeted: 0,
          totalActual: 0,
          variance: 0,
        };
      }

      Object.entries(wallets as { [walletAddress: string]: WalletData }).forEach(
        ([walletAddr, walletData]) => {
        const wg = walletData.wallet_info?.working_group || "Unknown";

        let budgetKey = Object.keys(quarters[quarter].budgets).find(
          (k) => quarters[quarter].budgets[k].workingGroup === wg,
        );

        if (!budgetKey) {
          budgetKey = `unallocated-${wg}`;
          quarters[quarter].budgets[budgetKey] = {
            ep: "N/A",
            title: `${wg} - Unallocated Spending`,
            url: "",
            workingGroup: wg,
            term: null,
            budgetedUSD: 0,
            actualUSD: 0,
            transactions: 0,
            wallets: {},
          };
        }

        const budget = quarters[quarter].budgets[budgetKey];
        const totalUsd = walletData.summary?.total_usd || 0;
        const totalEth = walletData.summary?.total_eth || 0;
        const txCount = walletData.summary?.transaction_count || 0;

        budget.wallets[walletAddr] = {
          address: walletAddr,
          label: walletData.wallet_info?.label || "Unknown Wallet",
          total_usd: totalUsd,
          total_eth: totalEth,
          transaction_count: txCount,
          transactions: walletData.transactions || [],
        };
        budget.actualUSD += totalUsd;
        quarters[quarter].totalActual += totalUsd;
      },
      );
    });

    Object.values(quarters).forEach((q) => {
      q.variance = q.totalActual - q.totalBudgeted;
    });

    return quarters;
  }, [approverData, transactionData]);

  const workingGroups = useMemo(() => {
    if (!approverData) return [] as string[];
    const wgs = new Set(approverData.map((r) => r["Working Group"]));
    return Array.from(wgs).sort();
  }, [approverData]);

  const allQuarters = useMemo(() => {
    if (!hierarchyData) return [] as string[];
    return Object.keys(hierarchyData as Record<string, unknown>).sort().reverse();
  }, [hierarchyData]);

  const filteredQuarters = useMemo(() => {
    if (!hierarchyData) return [] as string[];
    return allQuarters.filter((q) => {
      const quarterData = (hierarchyData as Record<string, any>)[q];
      if (!quarterData) return false;
      if (filterQuarter !== "all" && q !== filterQuarter) return false;
      if (filterWG !== "all") {
        const hasWG = Object.values(quarterData.budgets as Record<string, any>).some(
          (b) => (b as any).workingGroup === filterWG,
        );
        if (!hasWG) return false;
      }
      return true;
    });
  }, [hierarchyData, allQuarters, filterQuarter, filterWG]);

  const toggleQuarter = (quarter: string) => {
    setExpandedQuarters((prev) => {
      const next = new Set(prev);
      if (next.has(quarter)) next.delete(quarter);
      else next.add(quarter);
      return next;
    });
  };

  const toggleBudget = (key: string) => {
    setExpandedBudgets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleWallet = (key: string) => {
    setExpandedWallets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => {
    if (!hierarchyData) return;
    const quarters = new Set(Object.keys(hierarchyData as Record<string, any>));
    const budgets = new Set<string>();
    const wallets = new Set<string>();

    Object.entries(hierarchyData as Record<string, any>).forEach(([q, data]) => {
      Object.entries((data as any).budgets as Record<string, any>).forEach(
        ([bKey, budget]) => {
          budgets.add(`${q}-${bKey}`);
          Object.keys((budget as any).wallets as Record<string, any>).forEach((wAddr) => {
            wallets.add(`${q}-${bKey}-${wAddr}`);
          });
        },
      );
    });

    setExpandedQuarters(quarters);
    setExpandedBudgets(budgets);
    setExpandedWallets(wallets);
  };

  const collapseAll = () => {
    setExpandedQuarters(new Set());
    setExpandedBudgets(new Set());
    setExpandedWallets(new Set());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 font-medium">Loading Master Balance Sheet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h3>
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!hierarchyData) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-slate-500">No data available</p>
        </CardContent>
      </Card>
    );
  }

  const totals = Object.values(hierarchyData as Record<string, any>).reduce(
    (acc, q: any) => ({
      budgeted: acc.budgeted + (q.totalBudgeted || 0),
      actual: acc.actual + (q.totalActual || 0),
    }),
    { budgeted: 0, actual: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sticky top-0 z-10 bg-white/95 backdrop-blur py-4 -mt-4 -mx-4 px-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Master Balance Sheet</h1>
          <p className="text-slate-600 mt-1">
            Documented budgets, actual spending by wallet, incoming/outgoing transactions, and anomalies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Total Documented</div>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(totals.budgeted)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Total Actual</div>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(totals.actual)}</div>
          </CardContent>
        </Card>
        <Card className={totals.actual > totals.budgeted ? "border-red-200" : "border-emerald-200"}>
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Variance</div>
            <div
              className={`text-2xl font-bold ${
                totals.actual > totals.budgeted ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {totals.actual > totals.budgeted ? "+" : ""}
              {formatCurrency(totals.actual - totals.budgeted)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Anomalies</div>
            <div className="text-2xl font-bold text-amber-600">
              {unusualFlows?.organizational_to_unknown?.length || 0} flows
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by address, ENS name, tx hash, or amount..."
              value={searchQuery}
              onChange={(e: React.SyntheticEvent) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">Working Group:</span>
              <select
                value={filterWG}
                onChange={(e) => setFilterWG(e.target.value)}
                className="border rounded px-2 py-1 text-sm bg-white"
              >
                <option value="all">All Working Groups</option>
                {workingGroups.map((wg) => (
                  <option key={wg} value={wg}>
                    {wg}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">Quarter:</span>
              <select
                value={filterQuarter}
                onChange={(e) => setFilterQuarter(e.target.value)}
                className="border rounded px-2 py-1 text-sm bg-white"
              >
                <option value="all">All Quarters</option>
                {allQuarters.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Date:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border rounded px-2 py-1 text-sm bg-white"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border rounded px-2 py-1 text-sm bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Sort:</span>
              <button
                onClick={() => toggleSort("date")}
                className={`flex items-center gap-1 px-2 py-1 text-sm rounded border ${
                  sortField === "date" ? "bg-slate-100 border-slate-300" : "border-transparent hover:bg-slate-50"
                }`}
              >
                Date
                {sortField === "date" && <ArrowUpDown className="w-3 h-3" />}
              </button>
              <button
                onClick={() => toggleSort("usd")}
                className={`flex items-center gap-1 px-2 py-1 text-sm rounded border ${
                  sortField === "usd" ? "bg-slate-100 border-slate-300" : "border-transparent hover:bg-slate-50"
                }`}
              >
                USD
                {sortField === "usd" && <ArrowUpDown className="w-3 h-3" />}
              </button>
            </div>

            {(searchQuery || filterWG !== "all" || filterQuarter !== "all" || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500">
                <X className="w-3 h-3 mr-1" />
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredQuarters.map((quarter) => {
          const qData = hierarchyData[quarter];
          const isQExpanded = expandedQuarters.has(quarter);
          const variance = qData.totalActual - qData.totalBudgeted;
          const variancePercent =
            qData.totalBudgeted > 0 ? ((variance / qData.totalBudgeted) * 100).toFixed(1) : "N/A";

          return (
            <Card key={quarter} className="overflow-hidden">
              <div
                className="flex items-center justify-between p-4 bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors"
                onClick={() => toggleQuarter(quarter)}
              >
                <div className="flex items-center gap-3">
                  {isQExpanded ? (
                    <ChevronDown className="w-5 h-5 text-slate-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-600" />
                  )}
                  <Calendar className="w-5 h-5 text-slate-600" />
                  <span className="text-lg font-bold text-slate-900">{quarter}</span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <div className="text-slate-500">Documented</div>
                    <div className="font-semibold">{formatCurrency(qData.totalBudgeted)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-500">Actual</div>
                    <div className="font-semibold">{formatCurrency(qData.totalActual)}</div>
                  </div>
                  <div className="text-right min-w-[100px]">
                    <div className="text-slate-500">Variance</div>
                    <div className={`font-semibold ${variance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {variance > 0 ? "+" : ""}
                      {formatCurrency(variance)}
                      <span className="text-xs ml-1">({variancePercent}%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {isQExpanded && (
                <CardContent className="p-0">
                  {(Object.entries(qData.budgets as Record<string, any>) as [string, any][])
                    .filter(([, b]) => filterWG === "all" || (b as any).workingGroup === filterWG)
                    .sort(([, a], [, b]) => (b as any).actualUSD - (a as any).actualUSD)
                    .map(([budgetKey, rawBudget]) => {
                      const budget = rawBudget as {
                        ep: string;
                        title: string;
                        url: string;
                        workingGroup: string;
                        term: string | null;
                        budgetedUSD: number;
                        actualUSD: number;
                        transactions: number;
                        wallets: Record<
                          string,
                          {
                            address: string;
                            label: string;
                            total_usd: number;
                            total_eth: number;
                            transaction_count: number;
                            transactions: Transaction[];
                          }
                        >;
                      };
                      const bKey = `${quarter}-${budgetKey}`;
                      const isBExpanded = expandedBudgets.has(bKey);
                      const bVariance = budget.actualUSD - budget.budgetedUSD;
                      const hasWallets = Object.keys(budget.wallets).length > 0;

                      return (
                        <div key={budgetKey} className="border-t">
                          <div
                            className={`flex items-center justify-between p-3 pl-8 cursor-pointer hover:bg-slate-50 transition-colors ${
                              !budget.budgetedUSD && budget.actualUSD > 0 ? "bg-amber-50" : ""
                            }`}
                            onClick={() => toggleBudget(bKey)}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {hasWallets ? (
                                isBExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                )
                              ) : (
                                <span className="w-4" />
                              )}
                              <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <Badge
                                variant="outline"
                                className={`${
                                  WORKING_GROUP_COLORS[budget.workingGroup] || WORKING_GROUP_COLORS["Unknown"]
                                } flex-shrink-0`}
                              >
                                {budget.workingGroup}
                              </Badge>
                              <span
                                className="text-sm font-medium truncate"
                                title={budget.title || "Untitled"}
                              >
                                {budget.ep !== "N/A" ? `[${budget.ep}] ` : ""}
                                {(budget.title || "Untitled").slice(0, 60)}
                                {(budget.title || "").length > 60 ? "..." : ""}
                              </span>
                              {budget.url && (
                                <a
                                  href={budget.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-blue-500 hover:text-blue-700 flex-shrink-0"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              {!budget.budgetedUSD && budget.actualUSD > 0 && (
                                <Badge
                                  variant="outline"
                                  className="bg-amber-100 text-amber-800 border-amber-300 text-xs"
                                >
                                  UNDOCUMENTED
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm flex-shrink-0">
                              <div className="text-right w-24">
                                <div className="font-mono">{formatCurrency(budget.budgetedUSD)}</div>
                              </div>
                              <div className="text-right w-24">
                                <div className="font-mono">{formatCurrency(budget.actualUSD)}</div>
                              </div>
                              <div className="text-right w-24">
                                <div
                                  className={`font-mono ${
                                    bVariance > 0 ? "text-red-600" : "text-emerald-600"
                                  }`}
                                >
                                  {bVariance > 0 ? "+" : ""}
                                  {formatCurrency(bVariance)}
                                </div>
                              </div>
                              <div className="w-6">
                                {bVariance > 0 ? (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                ) : (
                                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                                )}
                              </div>
                            </div>
                          </div>

                          {isBExpanded && hasWallets && (
                            <div className="bg-slate-50">
                              {(Object.entries(
                                budget.wallets as Record<string, any>,
                              ) as [string, any][])
                                .sort(
                                  ([, a], [, b]) =>
                                    (b as any).total_usd - (a as any).total_usd,
                                )
                                .map(([walletAddr, rawWallet]) => {
                                  const wallet = rawWallet as {
                                    address: string;
                                    label: string;
                                    total_usd: number;
                                    total_eth: number;
                                    transaction_count: number;
                                    transactions: Transaction[];
                                  };
                                  const wKey = `${quarter}-${budgetKey}-${walletAddr}`;
                                  const isWExpanded = expandedWallets.has(wKey);
                                  const incomingTxs = getIncomingTransactions(walletAddr, quarter);
                                  const outgoingTxs = wallet.transactions || [];

                                  const filteredOutgoing = sortTransactions(
                                    filterByDateRange(
                                      outgoingTxs.filter((tx) => matchesSearch(tx, searchQuery)),
                                    ),
                                  );
                                  const filteredIncoming = sortTransactions(
                                    filterByDateRange(
                                      incomingTxs.filter((tx) => matchesSearch(tx, searchQuery)),
                                    ),
                                  );

                                  const outgoingTotal = filteredOutgoing.reduce(
                                    (sum, tx) => sum + (tx.value_usd || 0),
                                    0,
                                  );
                                  const incomingTotal = filteredIncoming.reduce(
                                    (sum, tx) => sum + (tx.value_usd || 0),
                                    0,
                                  );

                                  if (
                                    searchQuery &&
                                    filteredOutgoing.length === 0 &&
                                    filteredIncoming.length === 0
                                  ) {
                                    return null;
                                  }

                                  return (
                                    <div key={walletAddr} className="border-t border-slate-200">
                                      <div
                                        className="flex items-center justify-between p-2 pl-16 cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => toggleWallet(wKey)}
                                      >
                                        <div className="flex items-center gap-2">
                                          {filteredOutgoing.length > 0 || filteredIncoming.length > 0 ? (
                                            isWExpanded ? (
                                              <ChevronDown className="w-3 h-3 text-slate-400" />
                                            ) : (
                                              <ChevronRight className="w-3 h-3 text-slate-400" />
                                            )
                                          ) : (
                                            <span className="w-3" />
                                          )}
                                          <Wallet className="w-3 h-3 text-slate-400" />
                                          <span className="text-sm font-medium">{wallet.label}</span>
                                          <span className="text-xs text-slate-400 font-mono">
                                            {formatAddress(walletAddr)}
                                          </span>
                                          <Badge
                                            variant="outline"
                                            className="text-xs bg-rose-50/70 text-rose-500 border-rose-200"
                                          >
                                            <ArrowUpRight className="w-3 h-3 mr-1" />
                                            {filteredOutgoing.length} out
                                            <span className="ml-1 text-[10px] opacity-70">
                                              ({formatCurrency(outgoingTotal)})
                                            </span>
                                          </Badge>
                                          <Badge
                                            variant="outline"
                                            className="text-xs bg-teal-50/70 text-teal-600 border-teal-200"
                                          >
                                            <ArrowDownLeft className="w-3 h-3 mr-1" />
                                            {filteredIncoming.length} in
                                            <span className="ml-1 text-[10px] opacity-70">
                                              ({formatCurrency(incomingTotal)})
                                            </span>
                                          </Badge>
                                        </div>
                                        <div className="font-mono text-sm">
                                          {formatCurrency(wallet.total_usd)}
                                        </div>
                                      </div>

                                      {isWExpanded && (
                                        <div className="bg-white">
                                          {filteredIncoming.length > 0 && (
                                            <div className="border-t border-slate-200">
                                              <div className="bg-teal-50/60 px-4 py-2 pl-20 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <ArrowDownLeft className="w-4 h-4 text-teal-500" />
                                                  <span className="font-semibold text-teal-700 text-sm">
                                                    Incoming Transactions ({filteredIncoming.length})
                                                  </span>
                                                </div>
                                                <span className="font-mono text-sm text-teal-700 font-semibold pr-4">
                                                  Total: {formatCurrency(incomingTotal)}
                                                </span>
                                              </div>
                                              <table className="w-full text-xs">
                                                <thead className="bg-teal-50/30 sticky top-0">
                                                  <tr>
                                                    <th className="text-left p-2 pl-16">Date</th>
                                                    <th className="text-left p-2">From</th>
                                                    <th className="text-left p-2">Token</th>
                                                    <th className="text-right p-2">Amount</th>
                                                    <th className="text-right p-2">ETH Value</th>
                                                    <th className="text-right p-2">USD Value</th>
                                                    <th className="text-center p-2 pr-4 w-10" />
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {filteredIncoming.map((tx, idx) => {
                                                    const resolved = resolveAddress(tx.from_address);
                                                    const isEven = idx % 2 === 0;
                                                    const rowStripe = isEven ? "bg-teal-50/50" : "bg-white";
                                                    const leftBorder = isEven
                                                      ? "border-l-4 border-l-teal-400"
                                                      : "border-l-4 border-l-teal-200";
                                                    const unknownBg = resolved.isUnknown
                                                      ? "bg-amber-50/40"
                                                      : "";
                                                    return (
                                                      <tr
                                                        key={idx}
                                                        className={`border-t border-slate-100 hover:bg-teal-100/60 transition-colors ${leftBorder} ${
                                                          unknownBg || rowStripe
                                                        }`}
                                                      >
                                                        <td className="p-2 pl-16 font-mono text-slate-600">
                                                          {tx.date || "N/A"}
                                                        </td>
                                                        <td className="p-2">
                                                          <div className="flex flex-col gap-0.5">
                                                            <div className="flex items-center gap-1">
                                                              {resolved.ens && (
                                                                <span className="text-teal-700 font-medium">
                                                                  {resolved.ens}
                                                                </span>
                                                              )}
                                                              {resolved.label && !resolved.ens && (
                                                                <span className="text-slate-700 font-medium">
                                                                  {resolved.label}
                                                                </span>
                                                              )}
                                                              {resolved.isUnknown && (
                                                                <HelpCircle
                                                                  className="w-3 h-3 text-amber-500"
                                                                  title="Unknown address"
                                                                />
                                                              )}
                                                            </div>
                                                            <a
                                                              href={`https://etherscan.io/tx/${tx.tx_hash}`}
                                                              target="_blank"
                                                              rel="noopener noreferrer"
                                                              className="text-blue-500 hover:underline font-mono text-[10px]"
                                                            >
                                                              {formatAddress(tx.from_address)}
                                                            </a>
                                                          </div>
                                                        </td>
                                                        <td className="p-2">
                                                          <Badge
                                                            variant="outline"
                                                            className="text-[10px] px-1.5 py-0"
                                                          >
                                                            {tx.token_type || "ETH"}
                                                          </Badge>
                                                        </td>
                                                        <td className="p-2 text-right font-mono font-medium">
                                                          {formatNumber(tx.token_amount)} {tx.token_type || "ETH"}
                                                        </td>
                                                        <td className="p-2 text-right font-mono text-slate-500">
                                                          {tx.value_eth
                                                            ? `${formatNumber(tx.value_eth, 4)} ETH`
                                                            : "-"}
                                                        </td>
                                                        <td className="p-2 text-right font-mono text-teal-600 font-semibold">
                                                          {formatCurrency(tx.value_usd)}
                                                        </td>
                                                        <td className="p-2 pr-4 text-center">
                                                          <CommentButton
                                                            txHash={tx.tx_hash}
                                                            transactionType="incoming"
                                                            isAuthenticated={isAuthenticated}
                                                            currentUserAddress={userAddress}
                                                          />
                                                        </td>
                                                      </tr>
                                                    );
                                                  })}
                                                </tbody>
                                              </table>
                                            </div>
                                          )}

                                          {filteredOutgoing.length > 0 && (
                                            <div className="border-t border-slate-200">
                                              <div className="bg-rose-50/60 px-4 py-2 pl-20 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <ArrowUpRight className="w-4 h-4 text-rose-400" />
                                                  <span className="font-semibold text-rose-600 text-sm">
                                                    Outgoing Transactions ({filteredOutgoing.length})
                                                  </span>
                                                </div>
                                                <span className="font-mono text-sm text-rose-600 font-semibold pr-4">
                                                  Total: {formatCurrency(outgoingTotal)}
                                                </span>
                                              </div>
                                              <table className="w-full text-xs">
                                                <thead className="bg-rose-50/30 sticky top-0">
                                                  <tr>
                                                    <th className="text-left p-2 pl-16">Date</th>
                                                    <th className="text-left p-2">To</th>
                                                    <th className="text-left p-2">Token</th>
                                                    <th className="text-right p-2">Amount</th>
                                                    <th className="text-right p-2">ETH Value</th>
                                                    <th className="text-right p-2">USD Value</th>
                                                    <th className="text-center p-2 pr-4 w-10" />
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {filteredOutgoing.map((tx, idx) => {
                                                    const resolved = resolveAddress(tx.to_address);
                                                    const isEven = idx % 2 === 0;
                                                    const rowStripe = isEven ? "bg-rose-50/50" : "bg-white";
                                                    const leftBorder = isEven
                                                      ? "border-l-4 border-l-rose-400"
                                                      : "border-l-4 border-l-rose-200";
                                                    const unknownBg = resolved.isUnknown
                                                      ? "bg-amber-50/50"
                                                      : "";
                                                    return (
                                                      <tr
                                                        key={idx}
                                                        className={`border-t border-slate-100 hover:bg-rose-100/60 transition-colors ${leftBorder} ${
                                                          unknownBg || rowStripe
                                                        }`}
                                                      >
                                                        <td className="p-2 pl-16 font-mono text-slate-600">
                                                          {tx.date || "N/A"}
                                                        </td>
                                                        <td className="p-2">
                                                          <div className="flex flex-col gap-0.5">
                                                            <div className="flex items-center gap-1">
                                                              {resolved.ens && (
                                                                <span className="text-rose-600 font-medium">
                                                                  {resolved.ens}
                                                                </span>
                                                              )}
                                                              {resolved.label && !resolved.ens && (
                                                                <span className="text-slate-700 font-medium">
                                                                  {resolved.label}
                                                                </span>
                                                              )}
                                                              {resolved.isUnknown && (
                                                                <Badge
                                                                  variant="outline"
                                                                  className="text-[9px] px-1 py-0 bg-amber-100 text-amber-700 border-amber-300"
                                                                >
                                                                  UNKNOWN
                                                                </Badge>
                                                              )}
                                                            </div>
                                                            <a
                                                              href={`https://etherscan.io/tx/${tx.tx_hash}`}
                                                              target="_blank"
                                                              rel="noopener noreferrer"
                                                              className="text-blue-500 hover:underline font-mono text-[10px]"
                                                            >
                                                              {formatAddress(tx.to_address)}
                                                            </a>
                                                          </div>
                                                        </td>
                                                        <td className="p-2">
                                                          <Badge
                                                            variant="outline"
                                                            className="text-[10px] px-1.5 py-0"
                                                          >
                                                            {tx.token_type || "ETH"}
                                                          </Badge>
                                                        </td>
                                                        <td className="p-2 text-right font-mono font-medium">
                                                          {formatNumber(tx.token_amount)} {tx.token_type || "ETH"}
                                                        </td>
                                                        <td className="p-2 text-right font-mono text-slate-500">
                                                          {tx.value_eth
                                                            ? `${formatNumber(tx.value_eth, 4)} ETH`
                                                            : "-"}
                                                        </td>
                                                        <td className="p-2 text-right font-mono text-rose-500 font-semibold">
                                                          {formatCurrency(tx.value_usd)}
                                                        </td>
                                                        <td className="p-2 pr-4 text-center">
                                                          <CommentButton
                                                            txHash={tx.tx_hash}
                                                            transactionType="outgoing"
                                                            isAuthenticated={isAuthenticated}
                                                            currentUserAddress={userAddress}
                                                          />
                                                        </td>
                                                      </tr>
                                                    );
                                                  })}
                                                </tbody>
                                              </table>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {unusualFlows?.organizational_to_unknown &&
        unusualFlows.organizational_to_unknown.length > 0 && (
          <Card className="border-amber-300">
            <CardHeader className="bg-amber-50 border-b border-amber-200">
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="w-5 h-5" />
                Anomalous Fund Flows (Organizational to Unknown)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-amber-50">
                  <tr>
                    <th className="text-left p-3">From Wallet</th>
                    <th className="text-left p-3">Working Group</th>
                    <th className="text-left p-3">To Address</th>
                    <th className="text-right p-3">Total USD</th>
                    <th className="text-right p-3 pr-4">Tx Count</th>
                  </tr>
                </thead>
                <tbody>
                  {unusualFlows.organizational_to_unknown
                    .filter((f) => filterWG === "all" || f.from_wg === filterWG)
                    .sort((a, b) => b.total_usd - a.total_usd)
                    .slice(0, 50)
                    .map((flow, idx) => (
                      <tr key={idx} className="border-t border-amber-100 hover:bg-amber-50">
                        <td className="p-3">
                          <div className="font-medium">{flow.from_label}</div>
                          <div className="text-xs text-slate-500 font-mono">
                            {formatAddress(flow.from_address)}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={
                              WORKING_GROUP_COLORS[flow.from_wg] || WORKING_GROUP_COLORS["Unknown"]
                            }
                          >
                            {flow.from_wg}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="text-amber-700 font-medium">
                            {flow.to_label || "Unknown"}
                          </div>
                          <a
                            href={`https://etherscan.io/address/${flow.to_address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline font-mono"
                          >
                            {formatAddress(flow.to_address)}
                          </a>
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-amber-700">
                          {formatCurrency(flow.total_usd)}
                        </td>
                        <td className="p-3 pr-4 text-right">{flow.tx_count}</td>
                      </tr>
                    ))}
                </tbody>
                <tfoot className="bg-amber-100 font-semibold">
                  <tr>
                    <td colSpan={3} className="p-3">
                      Total Anomalous Flows
                    </td>
                    <td className="p-3 text-right font-mono text-amber-800">
                      {formatCurrency(
                        unusualFlows.organizational_to_unknown
                          .filter((f) => filterWG === "all" || f.from_wg === filterWG)
                          .reduce((sum, f) => sum + (f.total_usd || 0), 0),
                      )}
                    </td>
                    <td className="p-3 pr-4 text-right">
                      {unusualFlows.organizational_to_unknown
                        .filter((f) => filterWG === "all" || f.from_wg === filterWG)
                        .reduce((sum, f) => sum + (f.tx_count || 0), 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
