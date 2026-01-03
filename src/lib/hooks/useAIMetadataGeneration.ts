/**
 * React hook for AI-powered metadata generation
 */

import { useState, useCallback } from 'react';
import { aiService } from '../services/ai-service';
import { MetadataGenerationRequest } from '../services/ai-service';

export interface UseAIMetadataGenerationReturn {
  metadata: any | null;
  isLoading: boolean;
  error: string | null;
  warnings: string[];
  generateMetadata: (request: MetadataGenerationRequest) => Promise<void>;
  clearMetadata: () => void;
}

export function useAIMetadataGeneration(): UseAIMetadataGenerationReturn {
  const [metadata, setMetadata] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const generateMetadata = useCallback(async (request: MetadataGenerationRequest) => {
    setIsLoading(true);
    setError(null);
    setWarnings([]);

    try {
      const result = await aiService.generateMetadata(request);
      setMetadata(result);
      if (result.warnings) {
        setWarnings(result.warnings);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate metadata';
      setError(errorMessage);
      setMetadata(null);
      setWarnings([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearMetadata = useCallback(() => {
    setMetadata(null);
    setError(null);
    setWarnings([]);
  }, []);

  return {
    metadata,
    isLoading,
    error,
    warnings,
    generateMetadata,
    clearMetadata,
  };
}
