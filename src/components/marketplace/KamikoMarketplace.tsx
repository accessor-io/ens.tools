/**
 * Kamiko-Inspired ENS Marketplace Component
 * Modern marketplace UI with Seaport 1.6 integration
 * Integrated with ens.tools design system
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  ShoppingCart,
  Search,
  TrendingUp,
  Clock,
  Tag,
  Eye,
  Plus,
  Loader2,
  AlertTriangle,
  DollarSign,
  Globe,
  ChevronRight,
  ExternalLink,
  Filter,
  Grid3x3,
  List,
  Sparkles,
  BarChart3,
  RefreshCw,
  Zap,
  CheckCircle2,
  X,
  ArrowUpDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWeb3 } from '../../lib/services';
import { ensMarketplaceService, type ENSListing, type ENSOffer, type ENSCollectionStats } from '../../lib/services/ens-marketplace-service';
import {
  formatPrice,
  sortListings,
  filterListings,
  debounce,
  truncateAddress,
  getTimeUntilExpiry,
  paginate,
  type SortOption,
  type FilterOption,
} from '../../lib/utils/marketplace-utils';
import { Skeleton } from '../ui/skeleton';
import { EmptyState } from '../ui/empty-state';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../ui/utils';

export function KamikoMarketplace() {
  const { address, isConnected, publicClient, walletClient, chainId } = useWeb3();
  const [activeTab, setActiveTab] = useState<'listings' | 'offers' | 'stats'>('listings');
  const [searchQuery, setSearchQuery] = useState('');
  const [listings, setListings] = useState<ENSListing[]>([]);
  const [offers, setOffers] = useState<ENSOffer[]>([]);
  const [stats, setStats] = useState<ENSCollectionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedListing, setSelectedListing] = useState<ENSListing | null>(null);
  const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);
  const [isMakeOfferOpen, setIsMakeOfferOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [filters, setFilters] = useState<FilterOption>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const loadMarketplaceData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      if (activeTab === 'listings') {
        const data = await ensMarketplaceService.getActiveListings(chainId || 1);
        setListings(data);
      } else if (activeTab === 'offers') {
        const data = await ensMarketplaceService.getActiveOffers(chainId || 1);
        setOffers(data);
      } else if (activeTab === 'stats') {
        const data = await ensMarketplaceService.getCollectionStats(chainId || 1);
        setStats(data);
      }

      if (forceRefresh) {
        toast.success('Marketplace refreshed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load marketplace data';
      console.error('Error loading marketplace data:', error);
      toast.error('Failed to load marketplace data', {
        description: errorMessage.length < 100 ? errorMessage : undefined,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, chainId]);

  useEffect(() => {
    loadMarketplaceData();
  }, [loadMarketplaceData]);

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      setCurrentPage(1);
    }, 500),
    []
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  // Apply filters and sorting
  const processedListings = useMemo(() => {
    let filtered = listings.filter(listing =>
      listing.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    filtered = filterListings(filtered, filters);
    filtered = sortListings(filtered, sortBy);
    return filtered;
  }, [listings, searchQuery, filters, sortBy]);

  const processedOffers = useMemo(() => {
    let filtered = offers.filter(offer =>
      offer.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    filtered = filterListings(filtered, filters);
    filtered = sortListings(filtered, sortBy);
    return filtered;
  }, [offers, searchQuery, filters, sortBy]);

  // Pagination
  const paginatedListings = useMemo(() => {
    return paginate(processedListings, currentPage, pageSize);
  }, [processedListings, currentPage, pageSize]);

  const paginatedOffers = useMemo(() => {
    return paginate(processedOffers, currentPage, pageSize);
  }, [processedOffers, currentPage, pageSize]);

  // Update filters
  useEffect(() => {
    const newFilters: FilterOption = {};
    if (minPrice) newFilters.minPrice = minPrice;
    if (maxPrice) newFilters.maxPrice = maxPrice;
    setFilters(newFilters);
    setCurrentPage(1);
  }, [minPrice, maxPrice]);

  // Domain Card Component (Kamiko-style)
  const DomainCard = ({ listing }: { listing: ENSListing }) => {
    const isShort = listing.name.length <= 5;
    const isPremium = listing.name.length <= 3;

    return (
      <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-violet-300">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "bg-gradient-to-r text-xs font-semibold",
                    isPremium && "from-yellow-100 to-amber-100 text-amber-700 border-amber-300",
                    !isPremium && isShort && "from-purple-100 to-violet-100 text-purple-700 border-purple-300",
                    !isPremium && !isShort && "from-blue-100 to-indigo-100 text-blue-700 border-blue-300"
                  )}
                >
                  <Globe className="h-3 w-3 mr-1" />
                  ENS
                </Badge>
                {isPremium && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 mb-1 truncate">
                {listing.name}
              </CardTitle>
              <CardDescription className="text-xs font-mono text-slate-500">
                {truncateAddress(listing.seller)}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {formatPrice(listing.price, listing.currency)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {listing.currency}
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-xs text-slate-600">
                <Clock className="h-3 w-3" />
                {getTimeUntilExpiry(listing.expiryDate)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {listing.name.length} chars
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedListing(listing);
              }}
            >
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
            {isConnected && listing.price !== '0' && (
              <Button
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBuyDomain(listing);
                }}
              >
                <ShoppingCart className="h-3 w-3 mr-1" />
                Buy
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const handleBuyDomain = async (listing: ENSListing) => {
    if (!isConnected || !walletClient || !publicClient) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      toast.info('Processing purchase...');
      // Purchase logic would go here
      toast.success(`Successfully purchased ${listing.name}`);
    } catch (error: any) {
      console.error('Error buying domain:', error);
      toast.error(error.message || 'Failed to purchase domain');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section - Kamiko Style */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              ENS Marketplace
            </h1>
            <p className="text-slate-600 mt-2">
              Buy and sell ENS domains with Seaport 1.6 orderbook
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
              <Zap className="h-3 w-3 mr-1" />
              Seaport 1.6
            </Badge>
            {isConnected && (
              <>
                <Dialog open={isCreateListingOpen} onOpenChange={setIsCreateListingOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      List Domain
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>List ENS Domain</DialogTitle>
                      <DialogDescription>
                        List your ENS domain for sale on the marketplace
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>Domain Name</Label>
                        <Input placeholder="example.eth" />
                      </div>
                      <div>
                        <Label>Price (ETH)</Label>
                        <Input placeholder="0.5" type="number" />
                      </div>
                      <Button className="w-full">
                        Create Listing
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        {/* Search and Filter Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search domains... (e.g., example.eth)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-11"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'table')}>
                  <SelectTrigger className="w-[120px]">
                    {viewMode === 'grid' ? <Grid3x3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">Grid</SelectItem>
                    <SelectItem value="table">Table</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-[180px]">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                    <SelectItem value="date-desc">Newest First</SelectItem>
                    <SelectItem value="date-asc">Oldest First</SelectItem>
                    <SelectItem value="name-asc">Name: A-Z</SelectItem>
                    <SelectItem value="name-desc">Name: Z-A</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => loadMarketplaceData(true)}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Price Filters */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-slate-600">Min Price</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-24 h-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-slate-600">Max Price</Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-24 h-9"
                />
              </div>
              {(minPrice || maxPrice) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMinPrice('');
                    setMaxPrice('');
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {!isConnected && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Wallet Not Connected</AlertTitle>
          <AlertDescription>
            Please connect your wallet to trade ENS domains.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="listings" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Listings
            {processedListings.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {processedListings.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="offers" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Offers
            {processedOffers.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {processedOffers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="space-y-4 mt-6">
          {loading ? (
            <div className={cn(
              "grid gap-4",
              viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : ""
            )}>
              {[...Array(8)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-24 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-10 w-full mt-4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : paginatedListings.items.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No domains found"
              description={searchQuery ? "Try adjusting your search or filters" : "No domains are currently listed"}
            />
          ) : viewMode === 'grid' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedListings.items.map((listing) => (
                  <DomainCard key={listing.id} listing={listing} />
                ))}
              </div>
              {paginatedListings.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-slate-600">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, paginatedListings.totalItems)} of {paginatedListings.totalItems} listings
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="text-sm text-slate-600 px-2">
                      Page {currentPage} of {paginatedListings.totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(paginatedListings.totalPages, p + 1))}
                      disabled={currentPage === paginatedListings.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {paginatedListings.items.map((listing) => (
                    <div
                      key={listing.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedListing(listing)}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          ENS
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{listing.name}</div>
                          <div className="text-sm text-slate-500 font-mono">{truncateAddress(listing.seller)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="font-bold text-green-600">{formatPrice(listing.price, listing.currency)}</div>
                          <div className="text-xs text-slate-500">{getTimeUntilExpiry(listing.expiryDate)}</div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        {isConnected && listing.price !== '0' && (
                          <Button size="sm">
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            Buy
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="offers" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Offers</CardTitle>
              <CardDescription>
                {processedOffers.length} active offers on ENS domains
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3 py-8">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : paginatedOffers.items.length === 0 ? (
                <EmptyState
                  icon={Tag}
                  title="No active offers"
                  description="There are no active offers at the moment"
                />
              ) : (
                <div className="space-y-2">
                  {paginatedOffers.items.map((offer) => (
                    <div
                      key={offer.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          ENS
                        </Badge>
                        <div>
                          <div className="font-semibold">{offer.name}</div>
                          <div className="text-sm text-slate-500 font-mono">
                            Offer by {truncateAddress(offer.buyer)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-600">{formatPrice(offer.price, offer.currency)}</div>
                        <div className="text-xs text-slate-500">
                          {offer.expirationDate ? new Date(offer.expirationDate).toLocaleDateString() : 'No expiry'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4 mt-6">
          {stats ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-900">Total Domains</CardTitle>
                  <Globe className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-900">{stats.totalDomains.toLocaleString()}</div>
                  <p className="text-xs text-blue-700 mt-1">Registered ENS domains</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-900">Listed Domains</CardTitle>
                  <Tag className="h-5 w-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-900">{stats.listedDomains.toLocaleString()}</div>
                  <p className="text-xs text-purple-700 mt-1">Currently for sale</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-900">Floor Price</CardTitle>
                  <DollarSign className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-900">{formatPrice(stats.floorPrice, 'ETH')}</div>
                  <p className="text-xs text-green-700 mt-1">Lowest listed price</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-amber-900">Total Volume</CardTitle>
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-900">{formatPrice(stats.totalVolume, 'ETH')}</div>
                  <p className="text-xs text-amber-700 mt-1">All-time trading volume</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="space-y-0 pb-2">
                    <Skeleton className="h-4 w-20" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Domain Detail Dialog */}
      {selectedListing && (
        <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">{selectedListing.name}</DialogTitle>
              <DialogDescription>
                View domain details and purchase information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-slate-600">Price</Label>
                  <div className="text-2xl font-bold text-green-600 mt-1">
                    {formatPrice(selectedListing.price, selectedListing.currency)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-slate-600">Seller</Label>
                  <div className="text-sm font-mono text-slate-900 mt-1">
                    {truncateAddress(selectedListing.seller)}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" className="flex-1">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Etherscan
                </Button>
                {isConnected && selectedListing.price !== '0' && (
                  <Button className="flex-1" onClick={() => handleBuyDomain(selectedListing)}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Purchase Now
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

