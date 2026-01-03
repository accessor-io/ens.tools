/**
 * Enhanced ENS Marketplace Component
 * Includes advanced filtering, caching, and improved UX
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Checkbox } from '../ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';
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
  ChevronDown,
  Filter,
  Grid3x3,
  List,
  Heart,
  HeartOff,
  Sparkles,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWeb3 } from '../../lib/services';
import { ensMarketplaceService, type ENSListing, type ENSOffer, type ENSCollectionStats } from '../../lib/services/ens-marketplace-service';
import { marketplaceCacheService } from '../../lib/services/marketplace-cache-service';
import { 
  type AdvancedFilters, 
  type DomainCategory,
  applyAdvancedFilters,
  analyzeDomain,
  sortByRelevance,
  estimateDomainValue,
} from '../../lib/utils/marketplace-advanced-utils';
import { 
  formatPrice, 
  sortListings, 
  filterListings, 
  debounce, 
  truncateAddress,
  getTimeUntilExpiry,
  paginate,
} from '../../lib/utils/marketplace-utils';
import { Skeleton } from '../ui/skeleton';
import { EmptyState } from '../ui/empty-state';
import { useIntersectionObserver } from '../../lib/hooks/useIntersectionObserver';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../ui/utils';
import { MarketplaceAnalytics } from './MarketplaceAnalytics';

export function ENSMarketplaceEnhanced() {
  const { address, isConnected, publicClient, walletClient, chainId } = useWeb3();
  const [activeTab, setActiveTab] = useState<'listings' | 'offers' | 'stats' | 'analytics'>('listings');
  const [listings, setListings] = useState<ENSListing[]>([]);
  const [offers, setOffers] = useState<ENSOffer[]>([]);
  const [stats, setStats] = useState<ENSCollectionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'relevance' | 'price-asc' | 'price-desc' | 'date-desc' | 'name-asc'>('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  
  // Advanced filters
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({});
  const [lengthRange, setLengthRange] = useState<[number, number]>([3, 10]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [selectedCategories, setSelectedCategories] = useState<DomainCategory[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<string>('any');
  
  // Watchlist
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  
  // Pagination with virtual scrolling
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isLoadingMore = useRef(false);
  
  // Use intersection observer for infinite scroll
  const isIntersecting = useIntersectionObserver(loadMoreRef, {
    threshold: 0.1,
    rootMargin: '100px',
  });

  // Apply filters and sorting
  const filteredListings = useMemo(() => {
    let filtered = [...listings];
    
    // Apply advanced filters
    filtered = applyAdvancedFilters(filtered, {
      ...advancedFilters,
      length: { min: lengthRange[0], max: lengthRange[1] },
      priceRange: { 
        min: priceRange[0].toString(), 
        max: priceRange[1].toString() 
      },
      category: selectedCategories.length > 0 ? selectedCategories : undefined,
      pattern: selectedPattern === 'any' ? undefined : selectedPattern as any,
    });
    
    // Apply search
    if (searchQuery) {
      filtered = sortByRelevance(filtered, searchQuery);
    }
    
    // Apply sorting (if not using relevance)
    if (sortBy !== 'relevance' || !searchQuery) {
      filtered = sortListings(filtered, sortBy as any);
    }
    
    return filtered;
  }, [listings, advancedFilters, lengthRange, priceRange, selectedCategories, selectedPattern, searchQuery, sortBy]);

  // Paginated results
  const paginatedListings = useMemo(() => {
    return paginate(filteredListings, currentPage, pageSize);
  }, [filteredListings, currentPage, pageSize]);

  // Load marketplace data
  const loadMarketplaceData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
      marketplaceCacheService.clearAll();
    } else {
      setLoading(true);
    }
    
    try {
      const [listingsData, offersData, statsData] = await Promise.all([
        activeTab === 'listings' ? ensMarketplaceService.getActiveListings(chainId || 1) : Promise.resolve(listings),
        activeTab === 'offers' ? ensMarketplaceService.getActiveOffers(chainId || 1) : Promise.resolve(offers),
        (activeTab === 'stats' || activeTab === 'analytics') ? ensMarketplaceService.getCollectionStats(chainId || 1) : Promise.resolve(stats),
      ]);
      
      if (activeTab === 'listings') setListings(listingsData as ENSListing[]);
      if (activeTab === 'offers') setOffers(offersData as ENSOffer[]);
      if (activeTab === 'stats' || activeTab === 'analytics') setStats(statsData as ENSCollectionStats);
      
      if (forceRefresh) {
        toast.success('Marketplace data refreshed');
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
  }, [activeTab, chainId, listings, offers, stats]);

  // Initial load
  useEffect(() => {
    loadMarketplaceData();
  }, [activeTab]);

  // Load more on intersection
  useEffect(() => {
    if (isIntersecting && !isLoadingMore.current && paginatedListings.items.length < filteredListings.length) {
      isLoadingMore.current = true;
      setCurrentPage(prev => prev + 1);
      setTimeout(() => {
        isLoadingMore.current = false;
      }, 100);
    }
  }, [isIntersecting, paginatedListings.items.length, filteredListings.length]);

  // Toggle watchlist
  const toggleWatchlist = useCallback((domainName: string) => {
    setWatchlist(prev => {
      const newSet = new Set(prev);
      if (newSet.has(domainName)) {
        newSet.delete(domainName);
        toast.success(`Removed ${domainName} from watchlist`);
      } else {
        newSet.add(domainName);
        toast.success(`Added ${domainName} to watchlist`);
      }
      // Persist to localStorage
      localStorage.setItem('ens_watchlist', JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  }, []);

  // Load watchlist from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ens_watchlist');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setWatchlist(new Set(parsed));
      } catch (error) {
        console.error('Failed to load watchlist:', error);
      }
    }
  }, []);

  // Domain card component
  const DomainCard = ({ listing }: { listing: ENSListing }) => {
    const analysis = useMemo(() => analyzeDomain(listing.name), [listing.name]);
    const estimation = useMemo(() => estimateDomainValue(listing.name), [listing.name]);
    const isWatched = watchlist.has(listing.name);
    
    return (
      <Card className={cn(
        "hover:shadow-lg transition-all duration-200",
        viewMode === 'grid' ? '' : 'mb-2'
      )}>
        <CardHeader className="relative">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg font-bold">{listing.name}</CardTitle>
              <div className="flex flex-wrap gap-1 mt-2">
                {analysis.categories?.map(cat => (
                  <Badge key={cat} variant="secondary" className="text-xs">
                    {cat}
                  </Badge>
                ))}
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    analysis.rarity === 'legendary' && "border-yellow-500 text-yellow-600",
                    analysis.rarity === 'rare' && "border-purple-500 text-purple-600",
                    analysis.rarity === 'uncommon' && "border-blue-500 text-blue-600",
                  )}
                >
                  {analysis.rarity}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleWatchlist(listing.name)}
              className="ml-2"
            >
              {isWatched ? (
                <Heart className="h-4 w-4 fill-red-500 text-red-500" />
              ) : (
                <HeartOff className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold">{formatPrice(listing.price)}</p>
                <p className="text-sm text-muted-foreground">
                  Est: {formatPrice(estimation.estimatedPrice)} ETH
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  Expires in {getTimeUntilExpiry(listing.expiryDate)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {analysis.characterLength} characters
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button className="flex-1" size="sm">
                <ShoppingCart className="h-4 w-4 mr-1" />
                Buy Now
              </Button>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-1" />
                Details
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">ens marketplace</CardTitle>
              <CardDescription>
                Browse and trade ENS domains with advanced filtering
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
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
              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />}
              </Button>
              <Sheet open={showFilters} onOpenChange={setShowFilters}>
                <SheetTrigger asChild>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                    {Object.keys(advancedFilters).length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {Object.keys(advancedFilters).length}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Advanced Filters</SheetTitle>
                    <SheetDescription>
                      Refine your search with detailed filters
                    </SheetDescription>
                  </SheetHeader>
                  
                  <div className="mt-6 space-y-6">
                    {/* Length Filter */}
                    <div className="space-y-2">
                      <Label>Character Length</Label>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm">{lengthRange[0]}</span>
                        <Slider
                          value={lengthRange}
                          onValueChange={setLengthRange as any}
                          max={20}
                          min={1}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-sm">{lengthRange[1]}</span>
                      </div>
                    </div>
                    
                    {/* Price Range */}
                    <div className="space-y-2">
                      <Label>Price Range (ETH)</Label>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm">{priceRange[0]}</span>
                        <Slider
                          value={priceRange}
                          onValueChange={setPriceRange as any}
                          max={1000}
                          min={0}
                          step={0.1}
                          className="flex-1"
                        />
                        <span className="text-sm">{priceRange[1]}</span>
                      </div>
                    </div>
                    
                    {/* Pattern Filter */}
                    <div className="space-y-2">
                      <Label>Character Pattern</Label>
                      <Select value={selectedPattern} onValueChange={setSelectedPattern}>
                        <SelectTrigger>
                          <SelectValue placeholder="Any pattern" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any pattern</SelectItem>
                          <SelectItem value="numbers">Numbers only</SelectItem>
                          <SelectItem value="letters">Letters only</SelectItem>
                          <SelectItem value="alphanumeric">Alphanumeric</SelectItem>
                          <SelectItem value="emoji">Contains emoji</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Categories */}
                    <div className="space-y-2">
                      <Label>Categories</Label>
                      <div className="space-y-2">
                        {(['premium', '3-letter', '4-letter', '5-letter', 'numeric', 'brandable', 'geographic'] as DomainCategory[]).map(cat => (
                          <div key={cat} className="flex items-center space-x-2">
                            <Checkbox
                              id={cat}
                              checked={selectedCategories.includes(cat)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedCategories([...selectedCategories, cat]);
                                } else {
                                  setSelectedCategories(selectedCategories.filter(c => c !== cat));
                                }
                              }}
                            />
                            <Label htmlFor={cat} className="text-sm capitalize">
                              {cat.replace('-', ' ')}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Additional Filters */}
                    <div className="space-y-2">
                      <Label>Additional Filters</Label>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="listed-only" className="text-sm">Listed only</Label>
                          <Switch
                            id="listed-only"
                            checked={advancedFilters.listedOnly || false}
                            onCheckedChange={(checked) => 
                              setAdvancedFilters({ ...advancedFilters, listedOnly: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="has-avatar" className="text-sm">Has avatar</Label>
                          <Switch
                            id="has-avatar"
                            checked={advancedFilters.hasAvatar || false}
                            onCheckedChange={(checked) => 
                              setAdvancedFilters({ ...advancedFilters, hasAvatar: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="premium" className="text-sm">Premium names</Label>
                          <Switch
                            id="premium"
                            checked={advancedFilters.premium || false}
                            onCheckedChange={(checked) => 
                              setAdvancedFilters({ ...advancedFilters, premium: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          setAdvancedFilters({});
                          setLengthRange([3, 10]);
                          setPriceRange([0, 100]);
                          setSelectedCategories([]);
                          setSelectedPattern('');
                        }}
                      >
                        Clear All
                      </Button>
                      <Button 
                        className="flex-1"
                        onClick={() => setShowFilters(false)}
                      >
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search domains..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="date-desc">Recently Listed</SelectItem>
                <SelectItem value="name-asc">Name: A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="listings">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Listings ({filteredListings.length})
          </TabsTrigger>
          <TabsTrigger value="offers">
            <Tag className="h-4 w-4 mr-2" />
            Offers ({offers.length})
          </TabsTrigger>
          <TabsTrigger value="stats">
            <TrendingUp className="h-4 w-4 mr-2" />
            Statistics
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="mt-6">
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
          ) : filteredListings.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No domains found"
              description={searchQuery ? "Try adjusting your search or filters" : "No domains are currently listed"}
            />
          ) : (
            <div 
              ref={scrollRef}
              className={cn(
                "grid gap-4",
                viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : ""
              )}
            >
              {paginatedListings.items.map((listing) => (
                <DomainCard key={listing.id} listing={listing} />
              ))}
              
              {/* Load more trigger */}
              {paginatedListings.items.length < filteredListings.length && (
                <div ref={loadMoreRef} className="col-span-full flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="offers" className="mt-6">
          {/* Offers content - similar structure */}
          <div className="space-y-4">
            {offers.length === 0 ? (
              <EmptyState
                icon={Tag}
                title="No active offers"
                description="There are no active offers at the moment"
              />
            ) : (
              <div className="space-y-2">
                {offers.map((offer) => (
                  <Card key={offer.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div>
                        <p className="font-semibold">{offer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Offer by {truncateAddress(offer.buyer)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatPrice(offer.price)}</p>
                        <p className="text-sm text-muted-foreground">
                          Expires {new Date(offer.expirationDate || '').toLocaleDateString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          {stats ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Floor Price</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPrice(stats.floorPrice)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPrice(stats.totalVolume)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Listed Domains</CardTitle>
                  <Tag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.listedDomains.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Price</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPrice(stats.averagePrice)}</div>
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

        <TabsContent value="analytics" className="mt-6">
          <MarketplaceAnalytics 
            listings={listings} 
            stats={stats}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
