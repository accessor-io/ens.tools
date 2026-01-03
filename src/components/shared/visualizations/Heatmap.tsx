import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HeatmapDataPoint {
  date: Date;
  value: number;
  label?: string;
}

interface HeatmapProps {
  title: string;
  description?: string;
  data: HeatmapDataPoint[];
  colorScale?: (value: number, min: number, max: number) => string;
  formatValue?: (value: number) => string;
  cellSize?: number;
  cellGap?: number;
}

const defaultColorScale = (value: number, min: number, max: number): string => {
  if (value === 0) return '#ebedf0';
  const intensity = (value - min) / (max - min || 1);
  if (intensity < 0.25) return '#c6e48b';
  if (intensity < 0.5) return '#7bc96f';
  if (intensity < 0.75) return '#239a3b';
  return '#196127';
};

const formatCompactValue = (value: number): string => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

export function Heatmap({
  title,
  description,
  data,
  colorScale = defaultColorScale,
  formatValue = formatCompactValue,
  cellSize = 12,
  cellGap = 3,
}: HeatmapProps) {
  const { calendarData, minValue, maxValue, yearMonths } = useMemo(() => {
    // Group data by year and month
    const byYearMonth: Record<string, Record<number, HeatmapDataPoint[]>> = {};
    let min = Infinity;
    let max = -Infinity;

    data.forEach((point) => {
      const year = point.date.getFullYear();
      const month = point.date.getMonth();
      const day = point.date.getDate();

      if (!byYearMonth[year]) {
        byYearMonth[year] = {};
      }
      if (!byYearMonth[year][month]) {
        byYearMonth[year][month] = [];
      }

      byYearMonth[year][month].push({
        ...point,
        date: new Date(year, month, day),
      });

      min = Math.min(min, point.value);
      max = Math.max(max, point.value);
    });

    // Get all year-month combinations
    const yearMonthKeys = Object.keys(byYearMonth)
      .map(Number)
      .sort()
      .flatMap((year) =>
        Object.keys(byYearMonth[year])
          .map(Number)
          .sort()
          .map((month) => ({ year, month }))
      );

    return {
      calendarData: byYearMonth,
      minValue: min === Infinity ? 0 : min,
      maxValue: max === -Infinity ? 0 : max,
      yearMonths: yearMonthKeys,
    };
  }, [data]);

  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfWeek = (year: number, month: number): number => {
    return new Date(year, month, 1).getDay();
  };

  const getValueForDay = (year: number, month: number, day: number): number => {
    const monthData = calendarData[year]?.[month];
    if (!monthData) return 0;
    const dayData = monthData.find(
      (d) => d.date.getDate() === day && d.date.getMonth() === month && d.date.getFullYear() === year
    );
    return dayData?.value || 0;
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="flex gap-4">
              {/* Day labels */}
              <div className="flex flex-col gap-1 pt-6">
                {dayNames.map((day, idx) => (
                  <div
                    key={idx}
                    className="text-xs text-slate-500 text-right"
                    style={{ height: `${cellSize + cellGap}px`, lineHeight: `${cellSize + cellGap}px` }}
                  >
                    {idx % 2 === 0 ? day : ''}
                  </div>
                ))}
              </div>

              {/* Calendar grids */}
              <div className="flex gap-2">
                {yearMonths.map(({ year, month }) => {
                  const daysInMonth = getDaysInMonth(year, month);
                  const firstDay = getFirstDayOfWeek(year, month);
                  const cells: React.ReactNode[] = [];

                  // Empty cells for days before month starts
                  for (let i = 0; i < firstDay; i++) {
                    cells.push(
                      <div
                        key={`empty-${i}`}
                        className="rounded"
                        style={{
                          width: `${cellSize}px`,
                          height: `${cellSize}px`,
                          backgroundColor: '#ebedf0',
                        }}
                      />
                    );
                  }

                  // Cells for each day of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const value = getValueForDay(year, month, day);
                    const color = colorScale(value, minValue, maxValue);
                    const date = new Date(year, month, day);

                    cells.push(
                      <TooltipProvider key={`${year}-${month}-${day}`}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="rounded cursor-pointer hover:ring-2 hover:ring-slate-400 transition-all"
                              style={{
                                width: `${cellSize}px`,
                                height: `${cellSize}px`,
                                backgroundColor: color,
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-sm">
                              <div className="font-semibold">
                                {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                              </div>
                              <div className="text-slate-600">{formatValue(value)}</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  }

                  return (
                    <div key={`${year}-${month}`} className="flex flex-col">
                      <div className="text-xs text-slate-600 mb-1 text-center">
                        {monthNames[month]} {year}
                      </div>
                      <div
                        className="grid grid-cols-7 gap-0.5"
                        style={{ gap: `${cellGap}px` }}
                      >
                        {cells}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-4 ml-20">
              <span className="text-xs text-slate-600">Less</span>
              <div className="flex gap-0.5">
                {[0, 0.25, 0.5, 0.75, 1].map((intensity) => {
                  const value = minValue + intensity * (maxValue - minValue);
                  return (
                    <div
                      key={intensity}
                      className="rounded"
                      style={{
                        width: `${cellSize}px`,
                        height: `${cellSize}px`,
                        backgroundColor: colorScale(value, minValue, maxValue),
                      }}
                    />
                  );
                })}
              </div>
              <span className="text-xs text-slate-600">More</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}



