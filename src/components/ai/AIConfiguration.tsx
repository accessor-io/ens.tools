/**
 * AI Configuration Component
 * Allows users to configure AI service settings
 */

import { useState, useEffect } from 'react';
import { aiService } from '../../lib/services/ai-service';
import { aiCacheService } from '../../lib/services/ai-cache-service';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Switch } from '../ui/switch';
import { Settings, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function AIConfiguration() {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4');
  const [temperature, setTemperature] = useState(0.7);
  const [enableRAG, setEnableRAG] = useState(true);
  const [enableCaching, setEnableCaching] = useState(true);
  const [cacheStats, setCacheStats] = useState(aiCacheService.getCacheStats());

  useEffect(() => {
    const config = aiService.getConfig();
    setModel(config.model || 'gpt-4');
    setTemperature(config.temperature ?? 0.7);
    setEnableRAG(config.enableRAG ?? true);
    setEnableCaching(config.enableCaching ?? true);
    
    // Load API key from localStorage (in production, use secure storage)
    const storedKey = localStorage.getItem('ai_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  const handleSave = () => {
    aiService.updateConfig({
      apiKey: apiKey || undefined,
      model,
      temperature,
      enableRAG,
      enableCaching,
    });

    // Store API key (in production, use secure storage)
    if (apiKey) {
      localStorage.setItem('ai_api_key', apiKey);
    } else {
      localStorage.removeItem('ai_api_key');
    }

    toast.success('AI configuration saved');
  };

  const handleClearCache = () => {
    aiCacheService.clearAllCache();
    setCacheStats(aiCacheService.getCacheStats());
    toast.success('Cache cleared');
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCacheStats(aiCacheService.getCacheStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          AI Configuration
        </CardTitle>
        <CardDescription>
          Configure AI service settings and preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="api-key">API Key (optional)</Label>
          <Input
            id="api-key"
            type="password"
            placeholder="Enter your API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to use placeholder implementation
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <select
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="claude-3-opus">Claude 3 Opus</option>
            <option value="claude-3-sonnet">Claude 3 Sonnet</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="temperature">
            Temperature: {temperature.toFixed(1)}
          </Label>
          <input
            id="temperature"
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>More factual (0.0)</span>
            <span>More creative (1.0)</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable RAG</Label>
              <p className="text-xs text-muted-foreground">
                Use retrieval-augmented generation for better accuracy
              </p>
            </div>
            <Switch
              checked={enableRAG}
              onCheckedChange={setEnableRAG}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Caching</Label>
              <p className="text-xs text-muted-foreground">
                Cache queries to reduce API costs
              </p>
            </div>
            <Switch
              checked={enableCaching}
              onCheckedChange={setEnableCaching}
            />
          </div>
        </div>

        {enableCaching && (
          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <Label>Cache Statistics</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearCache}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Cache
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Queries</div>
                <div className="font-semibold">{cacheStats.totalQueries}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Embeddings</div>
                <div className="font-semibold">{cacheStats.totalEmbeddings}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Size</div>
                <div className="font-semibold">
                  {(cacheStats.totalSize / 1024).toFixed(1)} KB
                </div>
              </div>
            </div>
          </div>
        )}

        <Button onClick={handleSave} className="w-full">
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Save Configuration
        </Button>

        <Alert>
          <AlertDescription>
            <strong>Note:</strong> Current implementation uses placeholder logic.
            Configure your API key and integrate with LLM APIs for full functionality.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
