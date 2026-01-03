import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown } from 'lucide-react';
import { getSemanticColors, getStatusFromChange } from '@/utils/semanticColors';

interface ComparisonData {
  label: string;
  value: number;
  category?: string;
  [key: string]: any;
}

interface ComparisonViewProps {
  title: string;
  description?: string;
  currentPeriod: {
    label: string;
    data: ComparisonData[];
  };
  previousPeriod: {
    label: string;
    data: ComparisonData[];
  };
  comparisonType?: 'YoY' | 'QoQ' | 'MoM' | 'custom';
  metrics?: string[];
  showDeltas?: boolean;
  highlightChanges?: boolean;
  formatValue?: (value: number) => string;
  dataKey?: string;
  categoryKey?: string;
}

const formatCompactUSD = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value || 0);

export function ComparisonView({
  title,
  description,
  currentPeriod,
  previousPeriod,
  comparisonType = 'custom',
  showDeltas = true,
  highlightChanges = true,
  formatValue = formatCompactUSD,
  dataKey = 'value',
  categoryKey = 'category',
}: ComparisonViewProps) {
  const comparisonData = useMemo(() => {
    const currentMap = new Map(
      currentPeriod.data.map((item) => [item.label || item.name || item[categoryKey] || 'Unknown', item])
    );
    const previousMap = new Map(
      previousPeriod.data.map((item) => [item.label || item.name || item[categoryKey] || 'Unknown', item])
    );

    const allKeys = new Set([...currentMap.keys(), ...previousMap.keys()]);
    const comparison: Array<{
      name: string;
      current: number;
      previous: number;
      delta: number;
      deltaPercent: number;
      category?: string;
    }> = [];

    allKeys.forEach((key) => {
      const current = currentMap.get(key);
      const previous = previousMap.get(key);
      const currentValue = current?.[dataKey] || 0;
      const previousValue = previous?.[dataKey] || 0;
      const delta = currentValue - previousValue;
      const deltaPercent = previousValue > 0 ? (delta / previousValue) * 100 : (currentValue > 0 ? 100 : 0);

      comparison.push({
        name: key,
        current: currentValue,
        previous: previousValue,
        delta,
        deltaPercent,
        category: current?.[categoryKey] || previous?.[categoryKey],
      });
    });

    return comparison.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [currentPeriod, previousPeriod, dataKey, categoryKey]);

  const totalDelta = useMemo(() => {
    const currentTotal = currentPeriod.data.reduce((sum, item) => sum + (item[dataKey] || 0), 0);
    const previousTotal = previousPeriod.data.reduce((sum, item) => sum + (item[dataKey] || 0), 0);
    return {
      current: currentTotal,
      previous: previousTotal,
      delta: currentTotal - previousTotal,
      deltaPercent: previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0,
    };
  }, [currentPeriod, previousPeriod, dataKey]);

  const COLORS: Record<string, string> = {
    Ecosystem: '#3b82f6',
    'Public Goods': '#8b5cf6',
    'Meta-Governance': '#ec4899',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription className="mt-1">{description}</CardDescription>}
          </div>
          <Badge variant="outline">{comparisonType}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="detailed">Detailed Comparison</TabsTrigger>
            <TabsTrigger value="deltas">Changes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-600 mb-1">{currentPeriod.label}</div>
                <div className="text-2xl font-bold text-slate-900">{formatValue(totalDelta.current)}</div>
                {showDeltas && (
                  <div className="flex items-center gap-2 mt-2">
                    {totalDelta.deltaPercent >= 0 ? (
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-600" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        totalDelta.deltaPercent >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {totalDelta.deltaPercent >= 0 ? '+' : ''}
                      {totalDelta.deltaPercent.toFixed(1)}%
                    </span>
                    <span className="text-xs text-slate-500">vs {previousPeriod.label}</span>
                  </div>
                )}
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-600 mb-1">{previousPeriod.label}</div>
                <div className="text-2xl font-bold text-slate-900">{formatValue(totalDelta.previous)}</div>
                <div className="text-xs text-slate-500 mt-2">Baseline period</div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Top Changes</h4>
              <div className="space-y-2">
                {comparisonData.slice(0, 5).map((item, index) => {
                  const status = getStatusFromChange(item.deltaPercent, true);
                  const colors = getSemanticColors(status);
                  return (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        highlightChanges && Math.abs(item.deltaPercent) > 10
                          ? colors.border + ' ' + colors.bg + ' bg-opacity-10'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900">{item.name}</div>
                        {item.category && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {item.category}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-sm font-semibold text-slate-900">{formatValue(item.current)}</div>
                        {showDeltas && (
                          <div className={`flex items-center gap-1 text-xs ${colors.text}`}>
                            {item.deltaPercent >= 0 ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                            {item.deltaPercent >= 0 ? '+' : ''}
                            {item.deltaPercent.toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="detailed" className="space-y-4">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={comparisonData.map((item) => ({
                  name: item.name,
                  [currentPeriod.label]: item.current,
                  [previousPeriod.label]: item.previous,
                  category: item.category,
                }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 12 }}
                  stroke="#64748b"
                />
                <YAxis
                  tickFormatter={(value) => formatValue(value)}
                  tick={{ fontSize: 12 }}
                  stroke="#64748b"
                />
                <Tooltip
                  formatter={(value: number) => formatValue(value)}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey={currentPeriod.label} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey={previousPeriod.label} fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="deltas" className="space-y-4">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={comparisonData
                  .filter((item) => item.delta !== 0)
                  .map((item) => ({
                    name: item.name,
                    delta: item.delta,
                    deltaPercent: item.deltaPercent,
                    category: item.category,
                  }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 12 }}
                  stroke="#64748b"
                />
                <YAxis
                  tickFormatter={(value) => formatValue(value)}
                  tick={{ fontSize: 12 }}
                  stroke="#64748b"
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'deltaPercent') {
                      return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
                    }
                    return formatValue(value);
                  }}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="delta" radius={[4, 4, 0, 0]}>
                  {comparisonData
                    .filter((item) => item.delta !== 0)
                    .map((item, index) => {
                      const status = getStatusFromChange(item.deltaPercent, true);
                      const colors = getSemanticColors(status);
                      const colorMap: Record<string, string> = {
                        positive: '#10b981',
                        negative: '#ef4444',
                        neutral: '#94a3b8',
                      };
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={colorMap[status] || COLORS[item.category || ''] || '#94a3b8'}
                        />
                      );
                    })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}







