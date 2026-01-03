import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { bannerCustomizationService, type BannerCustomization } from '../lib/services/banner-customization-service';
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react';

export function BannerCustomization() {
  const [customization, setCustomization] = useState<BannerCustomization>(() =>
    bannerCustomizationService.getCustomization()
  );

  const handleSave = () => {
    bannerCustomizationService.saveCustomization(customization);
    toast.success('Banner customization saved');
  };

  const handleReset = () => {
    const defaultCustomization = bannerCustomizationService.resetCustomization();
    setCustomization(defaultCustomization);
    toast.success('Banner reset to defaults');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Banner Customization</CardTitle>
            <CardDescription>
              Customize the banner appearance and height
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="show-banner">Show Banner</Label>
            <p className="text-sm text-muted-foreground">
              Toggle banner visibility
            </p>
          </div>
          <Switch
            id="show-banner"
            checked={customization.showBanner}
            onCheckedChange={(checked) =>
              setCustomization({ ...customization, showBanner: checked })
            }
          />
        </div>

        {customization.showBanner && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="banner-height">Height</Label>
                <Input
                  id="banner-height"
                  type="number"
                  value={customization.height}
                  onChange={(e) =>
                    setCustomization({
                      ...customization,
                      height: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height-unit">Unit</Label>
                <Select
                  value={customization.heightUnit}
                  onValueChange={(value: 'px' | 'vh' | 'rem') =>
                    setCustomization({ ...customization, heightUnit: value })
                  }
                >
                  <SelectTrigger id="height-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="px">px</SelectItem>
                    <SelectItem value="vh">vh</SelectItem>
                    <SelectItem value="rem">rem</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="banner-opacity">Opacity</Label>
              <Input
                id="banner-opacity"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={customization.opacity}
                onChange={(e) =>
                  setCustomization({
                    ...customization,
                    opacity: parseFloat(e.target.value) || 0,
                  })
                }
              />
              <p className="text-sm text-muted-foreground">
                Background opacity (0.0 - 1.0)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gradient-start">Gradient Start Color</Label>
              <Input
                id="gradient-start"
                type="color"
                value={customization.gradientStart || '#6b7a8f'}
                onChange={(e) =>
                  setCustomization({ ...customization, gradientStart: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gradient-end">Gradient End Color</Label>
              <Input
                id="gradient-end"
                type="color"
                value={customization.gradientEnd || '#7a8a9f'}
                onChange={(e) =>
                  setCustomization({ ...customization, gradientEnd: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="background-color">Background Color (optional)</Label>
              <Input
                id="background-color"
                type="color"
                value={customization.backgroundColor || ''}
                onChange={(e) =>
                  setCustomization({
                    ...customization,
                    backgroundColor: e.target.value || undefined,
                  })
                }
              />
              <p className="text-sm text-muted-foreground">
                Leave empty to use gradient
              </p>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </CardContent>
    </Card>
  );
}
