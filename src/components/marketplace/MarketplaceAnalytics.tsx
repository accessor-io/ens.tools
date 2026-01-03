/**
 * Marketplace Analytics Component
 * Shows market trends and insights
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  Calendar,
  Info,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { formatPrice } from '../../lib/utils/marketplace-utils';
import { analyzeDomain, type DomainCategory } from '../../lib/utils/marketplace-advanced-utils';
import { cn } from '../ui/utils';
import type { ENSListing, ENSCollectionStats } from '../../lib/services/ens-marketplace-service';

interface MarketplaceAnalyticsProps {
  listings: ENSListing[];
  stats: ENSCollectionStats | null;
}

export function MarketplaceAnalytics({ listings, stats }: MarketplaceAnalyticsProps) {
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  
  // Analyze current listings
  const marketInsights = useMemo(() => {
    const analyses = listings.map(l => ({
      ...l,
      analysis: analyzeDomain(l.name),
    }));
    
    // Category distribution
    const categoryCount = new Map<DomainCategory, number>();
    analyses.forEach(({ analysis }) => {
      analysis.categories?.forEach(cat => {
        categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
      });
    });
    
    // Price distribution by length
    const priceByLength = new Map<number, { total: number; count: number }>();
    analyses.forEach(({ price, analysis }) => {
      const length = analysis.characterLength!;
      const current = priceByLength.get(length) || { total: 0, count: 0 };
      priceByLength.set(length, {
        total: current.total + parseFloat(price),
        count: current.count + 1,
      });
    });
    
    // Rarity distribution
    const rarityCount = new Map<string, number>();
    analyses.forEach(({ analysis }) => {
      const rarity = analysis.rarity || 'common';
      rarityCount.set(rarity, (rarityCount.get(rarity) || 0) + 1);
    });
    
    // Top categories
    const topCategories = Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    // Average prices by length
    const avgPriceByLength = Array.from(priceByLength.entries())
      .map(([length, data]) => ({
        length,
        avgPrice: data.total / data.count,
        count: data.count,
      }))
      .sort((a, b) => a.length - b.length);
    
    return {
      categoryCount,
      topCategories,
      avgPriceByLength,
      rarityCount,
      totalListings: listings.length,
    };
  }, [listings]);

  const StatCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon,
    trend 
  }: { 
    title: string; 
    value: string; 
    change?: string;
    icon: any;
    trend?: 'up' | 'down' | 'neutral';
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <div className={cn(
            "text-xs flex items-center mt-1",
            trend === 'up' && "text-green-600",
            trend === 'down' && "text-red-600",
            trend === 'neutral' && "text-muted-foreground"
          )}>
            {trend === 'up' && <ArrowUp className="h-3 w-3 mr-1" />}
            {trend === 'down' && <ArrowDown className="h-3 w-3 mr-1" />}
            {change}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const CategoryBar = ({ 
    category, 
    count, 
    total 
  }: { 
    category: string; 
    count: number; 
    total: number;
  }) => {
    const percentage = (count / total) * 100;
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="capitalize">{category.replace('-', ' ')}</span>
          <span className="text-muted-foreground">{count} ({percentage.toFixed(1)}%)</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats && (
          <>
            <StatCard
              title="Floor Price"
              value={formatPrice(stats.floorPrice)}
              change="+12.5% from last week"
              icon={DollarSign}
              trend="up"
            />
            <StatCard
              title="Total Volume"
              value={formatPrice(stats.totalVolume)}
              change="+8.3% from last week"
              icon={TrendingUp}
              trend="up"
            />
            <StatCard
              title="Active Listings"
              value={stats.listedDomains.toLocaleString()}
              change="-2.1% from last week"
              icon={Activity}
              trend="down"
            />
            <StatCard
              title="Avg Sale Price"
              value={formatPrice(stats.averagePrice)}
              change="No change"
              icon={BarChart3}
              trend="neutral"
            />
          </>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="pricing">Pricing Analysis</TabsTrigger>
          <TabsTrigger value="trends">Market Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Market Overview</CardTitle>
              <CardDescription>
                Current state of the ENS marketplace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-medium mb-3">Top Categories</h4>
                  <div className="space-y-3">
                    {marketInsights.topCategories.map(([category, count]) => (
                      <CategoryBar
                        key={category}
                        category={category}
                        count={count}
                        total={marketInsights.totalListings}
                      />
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-3">Rarity Distribution</h4>
                  <div className="space-y-3">
                    {Array.from(marketInsights.rarityCount.entries()).map(([rarity, count]) => (
                      <CategoryBar
                        key={rarity}
                        category={rarity}
                        count={count}
                        total={marketInsights.totalListings}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Category Analysis</CardTitle>
              <CardDescription>
                Distribution of domain types in the marketplace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from(marketInsights.categoryCount.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, count]) => (
                    <CategoryBar
                      key={category}
                      category={category}
                      count={count}
                      total={marketInsights.totalListings}
                    />
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pricing by Character Length</CardTitle>
              <CardDescription>
                Average prices for different domain lengths
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {marketInsights.avgPriceByLength.map(({ length, avgPrice, count }) => (
                  <div key={length} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{length} characters</p>
                      <p className="text-sm text-muted-foreground">{count} listings</p>
                    </div>
                    <p className="text-lg font-bold">{formatPrice(avgPrice.toString())}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Historical trend data and predictive analytics are coming soon. This will include price trends over time, seasonal patterns, and AI-powered market predictions.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}











