/**
 * React hook for AI-powered domain name suggestions
 */

import { useState, useCallback } from 'react';
import { aiDomainSuggestionService } from '../services/ai-domain-suggestion-service';
import { AIDomainSuggestion } from '../services/ai-blockchain-validator';
import { DomainSuggestionOptions, DomainSuggestionResult } from '../services/ai-domain-suggestion-service';

export interface UseAIDomainSuggestionsReturn {
  suggestions: AIDomainSuggestion[];
  isLoading: boolean;
  error: string | null;
  getSuggestions: (options: DomainSuggestionOptions) => Promise<void>;
  clearSuggestions: () => void;
  stats: {
    totalGenerated: number;
    availableCount: number;
    processingTime: number;
  } | null;
}

export function useAIDomainSuggestions(): UseAIDomainSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<AIDomainSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DomainSuggestionResult['processingTime'] | null>(null);

  const getSuggestions = useCallback(async (options: DomainSuggestionOptions) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await aiDomainSuggestionService.getSuggestions(options);
      setSuggestions(result.suggestions);
      setStats({
        totalGenerated: result.totalGenerated,
        availableCount: result.availableCount,
        processingTime: result.processingTime,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get domain suggestions';
      setError(errorMessage);
      setSuggestions([]);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
    setStats(null);
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    getSuggestions,
    clearSuggestions,
    stats: stats ? {
      totalGenerated: stats.totalGenerated,
      availableCount: stats.availableCount,
      processingTime: stats.processingTime,
    } : null,
  };
}
