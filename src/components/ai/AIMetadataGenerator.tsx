/**
 * AI Metadata Generator Component
 * Provides UI for AI-powered metadata generation with ENSIP-19 compliance
 */

import { useState } from 'react';
import { useAIMetadataGeneration } from '../../lib/hooks/useAIMetadataGeneration';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Sparkles, Copy, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export function AIMetadataGenerator({ domain }: { domain?: string }) {
  const [inputDomain, setInputDomain] = useState(domain || '');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const { metadata, isLoading, error, warnings, generateMetadata, clearMetadata } = useAIMetadataGeneration();

  const handleGenerate = async () => {
    if (!inputDomain.trim()) {
      toast.error('Please enter a domain name');
      return;
    }

    if (!description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    await generateMetadata({
      domain: inputDomain.trim(),
      description: description.trim(),
      category: category.trim() || undefined,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    });
  };

  const handleCopyMetadata = () => {
    if (metadata) {
      navigator.clipboard.writeText(JSON.stringify(metadata, null, 2));
      toast.success('Metadata copied to clipboard');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Metadata Generator
        </CardTitle>
        <CardDescription>
          Generate ENSIP-19 compliant metadata using AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Domain Name</label>
          <Input
            placeholder="example.eth"
            value={inputDomain}
            onChange={(e) => setInputDomain(e.target.value)}
            disabled={isLoading || !!domain}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            placeholder="Describe your domain, project, or organization..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Category (optional)</label>
            <Input
              placeholder="DeFi, NFT, DAO, etc."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Tags (comma-separated)</label>
            <Input
              placeholder="tag1, tag2, tag3"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleGenerate}
            disabled={isLoading || !inputDomain.trim() || !description.trim()}
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
                Generate Metadata
              </>
            )}
          </Button>
          {metadata && (
            <Button variant="outline" onClick={clearMetadata}>
              Clear
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {warnings.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {warnings.map((warning, index) => (
                  <div key={index}>{warning}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {metadata && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Generated Metadata:</h3>
              <Button variant="outline" size="sm" onClick={handleCopyMetadata}>
                <Copy className="h-4 w-4 mr-2" />
                Copy JSON
              </Button>
            </div>
            <Card className="p-4 bg-muted">
              <pre className="text-xs overflow-auto max-h-96">
                {JSON.stringify(metadata, null, 2)}
              </pre>
            </Card>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Metadata validated against ENSIP-19 schema</span>
            </div>
          </div>
        )}

        {!metadata && !isLoading && !error && (
          <div className="text-center text-muted-foreground py-8">
            Fill in the form above to generate AI-powered metadata
          </div>
        )}
      </CardContent>
    </Card>
  );
}
