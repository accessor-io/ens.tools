/**
 * AI Domain Suggestions Component
 * Provides UI for AI-powered domain name suggestions with blockchain validation
 */

import { useState } from 'react';
import { useAIDomainSuggestions } from '../../lib/hooks/useAIDomainSuggestions';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Sparkles, CheckCircle2, XCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';

export function AIDomainSuggestions() {
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState<'professional' | 'creative' | 'technical'>('professional');
  const { suggestions, isLoading, error, getSuggestions, clearSuggestions, stats } = useAIDomainSuggestions();

  const handleGetSuggestions = async () => {
    if (!description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    await getSuggestions({
      description: description.trim(),
      count: 5,
      preferences: {
        style,
      },
    });
  };

  const handleCopyDomain = (domain: string) => {
    navigator.clipboard.writeText(domain);
    toast.success(`Copied ${domain} to clipboard`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Domain Suggestions
        </CardTitle>
        <CardDescription>
          Get AI-powered domain name suggestions validated against the blockchain
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder="Describe what you're looking for in a domain name..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Style:</label>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as any)}
            className="px-3 py-1 border rounded-md text-sm"
            disabled={isLoading}
          >
            <option value="professional">Professional</option>
            <option value="creative">Creative</option>
            <option value="technical">Technical</option>
          </select>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleGetSuggestions}
            disabled={isLoading || !description.trim()}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Get Suggestions
              </>
            )}
          </Button>
          {suggestions.length > 0 && (
            <Button variant="outline" onClick={clearSuggestions}>
              Clear
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {stats && (
          <div className="text-sm text-muted-foreground">
            Generated {stats.totalGenerated} suggestions, {stats.availableCount} available
            {stats.processingTime > 0 && ` (${stats.processingTime}ms)`}
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Suggestions:</h3>
            {suggestions.map((suggestion, index) => (
              <Card key={index} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{suggestion.suggestedName}</span>
                    {suggestion.onChainVerified ? (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Available
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="h-3 w-3 mr-1" />
                        Taken
                      </Badge>
                    )}
                    {suggestion.confidence > 0 && (
                      <Badge variant="outline">
                        {(suggestion.confidence * 100).toFixed(0)}% match
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyDomain(suggestion.suggestedName)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {suggestion.blockchainProof && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Verified on-chain at block {suggestion.blockchainProof.blockNumber.toString()}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {suggestions.length === 0 && !isLoading && !error && (
          <div className="text-center text-muted-foreground py-8">
            Enter a description above to get AI-powered domain suggestions
          </div>
        )}
      </CardContent>
    </Card>
  );
}
