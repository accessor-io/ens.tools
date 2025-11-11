import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  ShoppingCart,
  Search,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Tag,
  Eye,
  ShoppingBag,
  Gift,
  Zap,
  BarChart3,
  Package,
  Loader2,
  Plus,
  X,
  Clock,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWeb3 } from '../../lib/services';
import { marketplaceService, type Listing, type Offer, type CollectionStats } from '../../lib/services/opensea-marketplace-service';
import {
  formatPrice,
  sortListings,
  filterListings,
  debounce,
  truncateAddress,
  paginate,
  type SortOption,
  type FilterOption,
} from '../../lib/utils/marketplace-utils';

export function Marketplace() {
  const { address, isConnected, publicClient, walletClient, chainId } = useWeb3();
  const [activeTab, setActiveTab] = useState<'listings' | 'offers' | 'ens' | 'stats'>('listings');
  const [searchQuery, setSearchQuery] = useState('');
  const [tokenAddress, setTokenAddress] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [ensListings, setEnsListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [approvingToken, setApprovingToken] = useState<string | null>(null);
  const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);
  const [isMakeOfferOpen, setIsMakeOfferOpen] = useState(false);
  const [createListingParams, setCreateListingParams] = useState({
    tokenAddress: '',
    tokenId: '',
    price: '',
  });
  const [makeOfferParams, setMakeOfferParams] = useState({
    tokenAddress: '',
    tokenId: '',
    price: '',
  });
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [filters, setFilters] = useState<FilterOption>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const loadMarketplaceData = async () => {
    if (!tokenAddress) return;

    setLoading(true);
    try {
      if (activeTab === 'listings') {
        const data = await marketplaceService.getListings(tokenAddress, chainId || 1);
        setListings(data);
      } else if (activeTab === 'offers') {
        const data = await marketplaceService.getOffers(tokenAddress, chainId || 1);
        setOffers(data);
      } else if (activeTab === 'stats') {
        const data = await marketplaceService.getCollectionStats(tokenAddress, chainId || 1);
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading marketplace data:', error);
      toast.error('Failed to load marketplace data');
    } finally {
      setLoading(false);
    }
  };

  const loadENSListings = async () => {
    setLoading(true);
    try {
      const data = await marketplaceService.getENSListings(chainId || 1);
      setEnsListings(data);
    } catch (error) {
      console.error('Error loading ENS listings:', error);
      toast.error('Failed to load ENS listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tokenAddress) {
      loadMarketplaceData();
    }
  }, [tokenAddress, activeTab, chainId]);

  useEffect(() => {
    if (activeTab === 'ens') {
      loadENSListings();
    }
  }, [activeTab, chainId]);

  const handleSearch = () => {
    if (!searchQuery) {
      toast.error('Please enter a token address');
      return;
    }
    setTokenAddress(searchQuery);
  };

  const handleApprove = async (listing: Listing) => {
    if (!isConnected || !walletClient) {
      toast.error('Please connect your wallet');
      return;
    }

    setApprovingToken(listing.tokenAddress);
    setIsApproveDialogOpen(true);

    try {
      const hash = await marketplaceService.approveMarketplace(
        walletClient,
        listing.tokenAddress,
        listing.tokenId
      );
      toast.success('Approval transaction submitted');
      console.log('Transaction hash:', hash);
    } catch (error: any) {
      console.error('Error approving marketplace:', error);
      toast.error(error.message || 'Failed to approve marketplace');
    } finally {
      setApprovingToken(null);
      setIsApproveDialogOpen(false);
    }
  };

  const handleApproveForAll = async (tokenAddress: string) => {
    if (!isConnected || !walletClient) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const hash = await marketplaceService.approveMarketplaceForAll(
        walletClient,
        tokenAddress
      );
      toast.success('Approval for all submitted');
      console.log('Transaction hash:', hash);
    } catch (error: any) {
      console.error('Error approving marketplace for all:', error);
      toast.error(error.message || 'Failed to approve marketplace');
    }
  };

  const handleCreateListing = async () => {
    if (!isConnected || !walletClient || !publicClient) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!createListingParams.tokenAddress || !createListingParams.tokenId || !createListingParams.price) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsCreatingOrder(true);
    try {
      const orderParams = await marketplaceService.createListingOrder({
        tokenAddress: createListingParams.tokenAddress,
        tokenId: createListingParams.tokenId,
        price: createListingParams.price,
        publicClient,
        walletClient,
        chainId: chainId || 1,
      });

      toast.success('Listing order created');
      console.log('Order parameters:', orderParams);
      setIsCreateListingOpen(false);
      setCreateListingParams({ tokenAddress: '', tokenId: '', price: '' });
    } catch (error: any) {
      console.error('Error creating listing:', error);
      toast.error(error.message || 'Failed to create listing');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleMakeOffer = async () => {
    if (!isConnected || !walletClient || !publicClient) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!makeOfferParams.tokenAddress || !makeOfferParams.tokenId || !makeOfferParams.price) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsCreatingOrder(true);
    try {
      const orderParams = await marketplaceService.createOffer({
        tokenAddress: makeOfferParams.tokenAddress,
        tokenId: makeOfferParams.tokenId,
        price: makeOfferParams.price,
        publicClient,
        walletClient,
        chainId: chainId || 1,
      });

      toast.success('Offer created');
      console.log('Offer parameters:', orderParams);
      setIsMakeOfferOpen(false);
      setMakeOfferParams({ tokenAddress: '', tokenId: '', price: '' });
    } catch (error: any) {
      console.error('Error making offer:', error);
      toast.error(error.message || 'Failed to create offer');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Apply filters and sorting
  const processedListings = useMemo(() => {
    let filtered = listings.filter(listing =>
      listing.tokenName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    filtered = filterListings(filtered, filters);
    filtered = sortListings(filtered, sortBy);
    return filtered;
  }, [listings, searchQuery, filters, sortBy]);

  const processedOffers = useMemo(() => {
    let filtered = offers.filter(offer =>
      offer.tokenName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    filtered = filterListings(filtered, filters);
    filtered = sortListings(filtered, sortBy);
    return filtered;
  }, [offers, searchQuery, filters, sortBy]);

  const processedENSListings = useMemo(() => {
    let filtered = ensListings.filter(listing =>
      listing.ensName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    filtered = filterListings(filtered, filters);
    filtered = sortListings(filtered, sortBy);
    return filtered;
  }, [ensListings, searchQuery, filters, sortBy]);

  // Pagination
  const paginatedListings = useMemo(() => {
    return paginate(processedListings, currentPage, pageSize);
  }, [processedListings, currentPage, pageSize]);

  const paginatedOffers = useMemo(() => {
    return paginate(processedOffers, currentPage, pageSize);
  }, [processedOffers, currentPage, pageSize]);

  const paginatedENSListings = useMemo(() => {
    return paginate(processedENSListings, currentPage, pageSize);
  }, [processedENSListings, currentPage, pageSize]);

  // Update filters
  useEffect(() => {
    const newFilters: FilterOption = {};
    if (minPrice) newFilters.minPrice = minPrice;
    if (maxPrice) newFilters.maxPrice = maxPrice;
    setFilters(newFilters);
    setCurrentPage(1);
  }, [minPrice, maxPrice]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Marketplace</h1>
          <p className="text-slate-600 mt-1">
            Buy and sell NFTs using OpenSea's Seaport protocol
          </p>
        </div>
        <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Zap className="h-3 w-3 mr-1" />
          Seaport v1.5
        </Badge>
          {isConnected && (
            <>
              <Dialog open={isCreateListingOpen} onOpenChange={setIsCreateListingOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Listing
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Listing</DialogTitle>
                    <DialogDescription>
                      List your NFT for sale on the marketplace
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Token Address</Label>
                      <Input
                        placeholder="0x..."
                        value={createListingParams.tokenAddress}
                        onChange={(e) => setCreateListingParams({ ...createListingParams, tokenAddress: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Token ID</Label>
                      <Input
                        placeholder="1234"
                        value={createListingParams.tokenId}
                        onChange={(e) => setCreateListingParams({ ...createListingParams, tokenId: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Price (ETH)</Label>
                      <Input
                        placeholder="0.5"
                        value={createListingParams.price}
                        onChange={(e) => setCreateListingParams({ ...createListingParams, price: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleCreateListing} disabled={isCreatingOrder} className="w-full">
                      {isCreatingOrder ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Create Listing
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={isMakeOfferOpen} onOpenChange={setIsMakeOfferOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Gift className="h-4 w-4 mr-2" />
                    Make Offer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Make Offer</DialogTitle>
                    <DialogDescription>
                      Make an offer on an NFT
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Token Address</Label>
                      <Input
                        placeholder="0x..."
                        value={makeOfferParams.tokenAddress}
                        onChange={(e) => setMakeOfferParams({ ...makeOfferParams, tokenAddress: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Token ID</Label>
                      <Input
                        placeholder="1234"
                        value={makeOfferParams.tokenId}
                        onChange={(e) => setMakeOfferParams({ ...makeOfferParams, tokenId: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Offer Price (ETH)</Label>
                      <Input
                        placeholder="0.5"
                        value={makeOfferParams.price}
                        onChange={(e) => setMakeOfferParams({ ...makeOfferParams, price: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleMakeOffer} disabled={isCreatingOrder} className="w-full">
                      {isCreatingOrder ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Make Offer
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {!isConnected && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Wallet Not Connected</AlertTitle>
          <AlertDescription>
            Please connect your wallet to interact with the marketplace.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Search Marketplace</CardTitle>
          <CardDescription>
            Enter a token contract address to view listings, offers, and statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="0x..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="listings">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Listings
          </TabsTrigger>
          <TabsTrigger value="offers">
            <Gift className="h-4 w-4 mr-2" />
            Offers
          </TabsTrigger>
          <TabsTrigger value="ens">
            <Tag className="h-4 w-4 mr-2" />
            ENS Domains
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="h-4 w-4 mr-2" />
            Statistics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Listings</CardTitle>
                  <CardDescription>
                    {paginatedListings.totalItems} active listings found
                  </CardDescription>
                </div>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-[180px]">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
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
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : paginatedListings.items.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No listings found. Search for a token contract address.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Token</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedListings.items.map((listing) => (
                      <TableRow key={listing.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {listing.tokenImage && (
                              <img
                                src={listing.tokenImage}
                                alt={listing.tokenName}
                                className="h-10 w-10 rounded"
                              />
                            )}
                            <div>
                              <div className="font-medium">{listing.tokenName}</div>
                              <div className="text-sm text-slate-500">
                                #{listing.tokenId}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-mono">
                            {truncateAddress(listing.seller)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-green-600">
                            {formatPrice(listing.price, listing.currency)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              listing.status === 'active'
                                ? 'default'
                                : listing.status === 'sold'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {listing.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{listing.platform}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedListing(listing)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            {isConnected && (
                              <Button
                                size="sm"
                                onClick={() => handleApprove(listing)}
                                disabled={approvingToken === listing.tokenAddress}
                              >
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                Buy
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {paginatedListings.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
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
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="text-sm text-slate-600">
                      Page {currentPage} of {paginatedListings.totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(paginatedListings.totalPages, p + 1))}
                      disabled={currentPage === paginatedListings.totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Offers</CardTitle>
              <CardDescription>
                {filteredOffers.length} active offers found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : filteredOffers.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No offers found. Search for a token contract address.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Token</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Offer Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOffers.map((offer) => (
                      <TableRow key={offer.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {offer.tokenImage && (
                              <img
                                src={offer.tokenImage}
                                alt={offer.tokenName}
                                className="h-10 w-10 rounded"
                              />
                            )}
                            <div>
                              <div className="font-medium">{offer.tokenName}</div>
                              <div className="text-sm text-slate-500">
                                #{offer.tokenId}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-mono">
                            {offer.buyer.slice(0, 6)}...{offer.buyer.slice(-4)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-blue-600">
                            {offer.price} {offer.currency}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              offer.status === 'active'
                                ? 'default'
                                : offer.status === 'accepted'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {offer.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ens" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ENS Domain Listings</CardTitle>
              <CardDescription>
                {filteredENSListings.length} ENS domains listed on marketplace
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : filteredENSListings.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No ENS domains listed. Click the search button to load ENS listings.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domain</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredENSListings.map((listing) => (
                      <TableRow key={listing.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              ENS
                            </Badge>
                            <div className="font-medium">{listing.ensName}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-mono">
                            {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-green-600">
                            {listing.price} {listing.currency}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              listing.status === 'active'
                                ? 'default'
                                : listing.status === 'sold'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {listing.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View on OpenSea
                            </Button>
                            {isConnected && (
                              <Button size="sm">
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                Buy
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          {stats && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Floor Price</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.floorPrice} ETH</div>
                  <p className="text-xs text-muted-foreground">
                    Lowest listed price
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalVolume} ETH</div>
                  <p className="text-xs text-muted-foreground">
                    All-time trading volume
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Owners</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.owners}</div>
                  <p className="text-xs text-muted-foreground">
                    Unique holders
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Listed</CardTitle>
                  <Tag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.listedCount}</div>
                  <p className="text-xs text-muted-foreground">
                    Currently listed items
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {stats && (
            <Card>
              <CardHeader>
                <CardTitle>Collection Statistics</CardTitle>
                <CardDescription>
                  {tokenAddress && `Statistics for ${tokenAddress.slice(0, 10)}...`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Total Items</span>
                    <span className="font-semibold">{stats.items}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Total Sales</span>
                    <span className="font-semibold">{stats.totalSales}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Average Price</span>
                    <span className="font-semibold">{stats.avgPrice} ETH</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!stats && !loading && (
            <div className="text-center py-8 text-slate-500">
              No statistics available. Search for a token contract address.
            </div>
          )}
        </TabsContent>
      </Tabs>

      {isConnected && tokenAddress && (
        <Card>
          <CardHeader>
            <CardTitle>Marketplace Approval</CardTitle>
            <CardDescription>
              Approve Seaport marketplace to trade your tokens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Approve Marketplace</div>
                <div className="text-sm text-slate-600">
                  Allow Seaport to trade tokens on your behalf
                </div>
              </div>
              <Button
                onClick={() => handleApproveForAll(tokenAddress)}
                disabled={approvingToken === tokenAddress}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve for All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

