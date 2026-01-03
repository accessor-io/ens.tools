/**
 * AI Domain Suggestion Service
 * High-level service for AI-powered domain name suggestions with blockchain validation
 */

import { aiService } from './ai-service';
import { aiBlockchainValidator } from './ai-blockchain-validator';
import { AIDomainSuggestion } from './ai-blockchain-validator';

export interface DomainSuggestionOptions {
  description: string;
  count?: number;
  preferences?: {
    length?: number;
    style?: 'professional' | 'creative' | 'technical';
    keywords?: string[];
  };
  chainId?: number;
}

export interface DomainSuggestionResult {
  suggestions: AIDomainSuggestion[];
  totalGenerated: number;
  availableCount: number;
  processingTime: number;
}

export class AIDomainSuggestionService {
  /**
   * Get domain name suggestions with blockchain validation
   */
  async getSuggestions(options: DomainSuggestionOptions): Promise<DomainSuggestionResult> {
    const startTime = Date.now();

    // Initialize blockchain validator with chain ID
    if (options.chainId) {
      aiBlockchainValidator.initialize(options.chainId);
    }

    // Generate suggestions using AI service
    const suggestions = await aiService.suggestDomainNames({
      description: options.description,
      preferences: options.preferences,
    });

    // Limit to requested count
    const limitedSuggestions = options.count
      ? suggestions.slice(0, options.count)
      : suggestions;

    const processingTime = Date.now() - startTime;

    return {
      suggestions: limitedSuggestions,
      totalGenerated: suggestions.length,
      availableCount: limitedSuggestions.filter(s => s.onChainVerified).length,
      processingTime,
    };
  }

  /**
   * Get a single best suggestion
   */
  async getBestSuggestion(options: Omit<DomainSuggestionOptions, 'count'>): Promise<AIDomainSuggestion | null> {
    const result = await this.getSuggestions({ ...options, count: 1 });
    return result.suggestions[0] || null;
  }

  /**
   * Validate a specific domain suggestion
   */
  async validateSuggestion(domain: string, chainId?: number): Promise<AIDomainSuggestion> {
    if (chainId) {
      aiBlockchainValidator.initialize(chainId);
    }

    return await aiBlockchainValidator.validateDomainSuggestion(domain);
  }
}

export const aiDomainSuggestionService = new AIDomainSuggestionService();
