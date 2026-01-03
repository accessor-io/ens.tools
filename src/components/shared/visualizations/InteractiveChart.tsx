import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZoomIn } from 'lucide-react';

interface InteractiveChartProps {
  title: string;
  description?: string;
  children: (props: {
    onBarClick?: (data: any, index: number) => void;
    onBarHover?: (data: any, index: number) => void;
    hoveredIndex?: number | null;
    selectedIndex?: number | null;
  }) => React.ReactNode;
  detailView?: (data: any) => React.ReactNode;
  defaultChart?: React.ReactNode;
}

export function InteractiveChart({
  title,
  description,
  children,
  detailView,
  defaultChart,
}: InteractiveChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedData, setSelectedData] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleBarClick = useCallback((data: any, index: number) => {
    setSelectedData(data);
    setSelectedIndex(index);
    if (detailView) {
      setIsDetailOpen(true);
    }
  }, [detailView]);

  const handleBarHover = useCallback((data: any, index: number) => {
    setHoveredIndex(index);
  }, []);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
            {selectedData && detailView && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailOpen(true)}
              >
                <ZoomIn className="w-4 h-4 mr-2" />
                View Details
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div
            onMouseLeave={() => setHoveredIndex(null)}
            className="relative"
          >
            {children({
              onBarClick: handleBarClick,
              onBarHover: handleBarHover,
              hoveredIndex,
              selectedIndex,
            })}
            {defaultChart}
          </div>
        </CardContent>
      </Card>

      {isDetailOpen && selectedData && detailView && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{title} - Details</DialogTitle>
            </DialogHeader>
            {detailView(selectedData)}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}







