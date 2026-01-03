import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, TrendingDown, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SparkCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  change?: {
    value: number;
    label?: string;
    positiveIsGood?: boolean;
  };
  series?: number[];
  tooltip?: {
    period?: string;
    dataSource?: string;
    insight?: string;
    methodology?: string;
  };
}

const SPARK_WIDTH = 180;
const SPARK_HEIGHT = 50;

const normalizeSeries = (data: number[]) => {
  if (data.length === 0) return '';
  if (data.length === 1) return `M0 ${SPARK_HEIGHT / 2} L${SPARK_WIDTH} ${SPARK_HEIGHT / 2}`;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  return data
    .map((value, idx) => {
      const x = (idx / (data.length - 1)) * SPARK_WIDTH;
      const y = SPARK_HEIGHT - ((value - min) / range) * SPARK_HEIGHT;
      return `${idx === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
};

export function SparkCard({ title, value, subtitle, icon, change, series = [], tooltip }: SparkCardProps) {
  const path = normalizeSeries(series);
  const showPositive = change ? (change.positiveIsGood ? change.value >= 0 : change.value < 0) : false;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm text-slate-600">{title}</CardTitle>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-slate-400 hover:text-slate-600 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-2 text-xs">
                  {tooltip.period && (
                    <div>
                      <span className="font-semibold">Period: </span>
                      {tooltip.period}
                    </div>
                  )}
                  {tooltip.dataSource && (
                    <div>
                      <span className="font-semibold">Data Source: </span>
                      {tooltip.dataSource}
                    </div>
                  )}
                  {tooltip.insight && (
                    <div className="pt-1 border-t border-slate-200">
                      <span className="font-semibold">Insight: </span>
                      {tooltip.insight}
                    </div>
                  )}
                  {tooltip.methodology && (
                    <div className="pt-1 border-t border-slate-200 text-slate-500">
                      <span className="font-semibold">Methodology: </span>
                      {tooltip.methodology}
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-slate-900 text-2xl font-semibold">{value}</div>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        {change && (
          <p className={`text-xs flex items-center gap-1 mt-1 ${showPositive ? 'text-green-600' : 'text-red-600'}`}>
            {showPositive ? <ArrowUpRight className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {change.value > 0 ? '+' : ''}
            {change.value.toFixed(1)}%
            {change.label && <span className="text-slate-500 ml-1">{change.label}</span>}
          </p>
        )}
        <div className="mt-4">
          <svg width="100%" height={SPARK_HEIGHT} viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}>
            <defs>
              <linearGradient id="sparkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            {series.length > 1 && (
              <>
                <path
                  d={`${path} L ${SPARK_WIDTH} ${SPARK_HEIGHT} L 0 ${SPARK_HEIGHT} Z`}
                  fill="url(#sparkGradient)"
                  opacity={0.6}
                />
                <path d={path} stroke="#3b82f6" strokeWidth="2" fill="none" strokeLinecap="round" />
              </>
            )}
            {series.length === 0 && (
              <line
                x1={0}
                y1={SPARK_HEIGHT / 2}
                x2={SPARK_WIDTH}
                y2={SPARK_HEIGHT / 2}
                stroke="#e2e8f0"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
            )}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}

