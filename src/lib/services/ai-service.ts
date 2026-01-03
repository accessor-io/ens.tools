/**
 * AI Service
 * Main service for AI/LLM integration with RAG support
 * Provides domain suggestions, metadata generation, and ENS documentation Q&A
 */

import { aiInputValidator } from './ai-input-validator';
import { aiBlockchainValidator } from './ai-blockchain-validator';
import { aiCacheService } from './ai-cache-service';
import { AIDomainSuggestion } from './ai-blockchain-validator';

export interface AIConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  enableRAG?: boolean;
  enableCaching?: boolean;
}

export interface DomainSuggestionRequest {
  description: string;
  preferences?: {
    length?: number;
    style?: 'professional' | 'creative' | 'technical';
    keywords?: string[];
  };
}

export interface MetadataGenerationRequest {
  domain: string;
  description: string;
  category?: string;
  tags?: string[];
}

export interface RAGQuery {
  question: string;
  context?: {
    domain?: string;
    category?: string;
  };
}

export class AIService {
  private config: AIConfig;
  private modelVersion = '1.0.0';

  constructor(config: AIConfig = {}) {
    this.config = {
      model: config.model || 'gpt-4',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens || 1000,
      enableRAG: config.enableRAG ?? true,
      enableCaching: config.enableCaching ?? true,
      ...config,
    };
  }

  /**
   * Suggest domain names based on description
   */
  async suggestDomainNames(request: DomainSuggestionRequest): Promise<AIDomainSuggestion[]> {
    // Validate input
    const validation = aiInputValidator.validateInput(request.description, 'domain');
    if (!validation.isValid) {
      throw new Error(`Invalid input: ${validation.errors.join(', ')}`);
    }

    // Check cache first
    if (this.config.enableCaching) {
      const cached = aiCacheService.getCachedQuery(
        `domain_suggestion:${validation.sanitizedInput}`
      );
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // Cache corrupted, continue
        }
      }
    }

    // Generate suggestions (placeholder - integrate with actual LLM API)
    const suggestions = await this.generateDomainSuggestions(
      validation.sanitizedInput,
      request.preferences
    );

    // Validate each suggestion against blockchain
    const validatedSuggestions = await Promise.all(
      suggestions.map(suggestion =>
        aiBlockchainValidator.validateDomainSuggestion(suggestion, this.modelVersion)
      )
    );

    // Filter to only available domains
    const availableSuggestions = validatedSuggestions.filter(s => s.onChainVerified);

    // Cache results
    if (this.config.enableCaching) {
      aiCacheService.cacheQuery(
        `domain_suggestion:${validation.sanitizedInput}`,
        JSON.stringify(availableSuggestions),
        3600000 // 1 hour
      );
    }

    return availableSuggestions;
  }

  /**
   * Generate domain name suggestions (placeholder - integrate with LLM API)
   */
  private async generateDomainSuggestions(
    description: string,
    preferences?: DomainSuggestionRequest['preferences']
  ): Promise<string[]> {
    // Placeholder implementation
    // In production, call OpenAI/Anthropic API here
    
    // Extract keywords from description
    const keywords = description
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5);

    // Generate simple suggestions based on keywords
    const suggestions: string[] = [];
    
    keywords.forEach(keyword => {
      // Clean keyword for ENS domain
      const cleanKeyword = keyword.replace(/[^a-z0-9-]/g, '');
      if (cleanKeyword.length >= 3) {
        suggestions.push(`${cleanKeyword}.eth`);
      }
    });

    // Add variations
    if (keywords.length > 0) {
      const firstKeyword = keywords[0].replace(/[^a-z0-9-]/g, '');
      if (firstKeyword.length >= 3) {
        suggestions.push(`${firstKeyword}dao.eth`);
        suggestions.push(`${firstKeyword}protocol.eth`);
      }
    }

    return suggestions.slice(0, 5); // Return top 5
  }

  /**
   * Generate metadata for domain using AI
   */
  async generateMetadata(request: MetadataGenerationRequest): Promise<any> {
    // Validate input
    const validation = aiInputValidator.validateInput(request.description, 'metadata');
    if (!validation.isValid) {
      throw new Error(`Invalid input: ${validation.errors.join(', ')}`);
    }

    // Check cache
    if (this.config.enableCaching) {
      const cached = aiCacheService.getCachedQuery(
        `metadata:${request.domain}:${validation.sanitizedInput}`
      );
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // Cache corrupted
        }
      }
    }

    // Generate metadata (placeholder - integrate with LLM API)
    const metadata = await this.generateMetadataContent(request, validation.sanitizedInput);

    // Validate against ENSIP-19 schema
    const validationResult = await aiBlockchainValidator.validateMetadataSuggestion(metadata);

    if (!validationResult.isValid) {
      throw new Error(`Invalid metadata: ${validationResult.errors.join(', ')}`);
    }

    // Cache result
    if (this.config.enableCaching) {
      aiCacheService.cacheQuery(
        `metadata:${request.domain}:${validation.sanitizedInput}`,
        JSON.stringify(metadata),
        3600000
      );
    }

    return {
      ...metadata,
      warnings: validationResult.warnings,
    };
  }

  /**
   * Generate metadata content (placeholder)
   */
  private async generateMetadataContent(
    request: MetadataGenerationRequest,
    sanitizedDescription: string
  ): Promise<any> {
    // Placeholder - in production, call LLM API
    return {
      name: request.domain,
      description: sanitizedDescription,
      attributes: [
        {
          trait_type: 'Category',
          value: request.category || 'General',
        },
        ...(request.tags || []).map(tag => ({
          trait_type: 'Tag',
          value: tag,
        })),
      ],
    };
  }

  /**
   * Answer question using RAG with ENS documentation
   */
  async answerQuestion(query: RAGQuery): Promise<string> {
    // Validate input
    const validation = aiInputValidator.validateInput(query.question);
    if (!validation.isValid) {
      throw new Error(`Invalid input: ${validation.errors.join(', ')}`);
    }

    // Check cache
    if (this.config.enableCaching) {
      const cached = aiCacheService.getCachedQuery(`rag:${validation.sanitizedInput}`);
      if (cached) {
        return cached;
      }
    }

    if (!this.config.enableRAG) {
      // Without RAG, return simple response
      return await this.simpleAnswer(validation.sanitizedInput);
    }

    // Retrieve relevant documentation chunks (placeholder)
    const relevantDocs = await this.retrieveRelevantDocs(validation.sanitizedInput, query.context);

    // Get on-chain data if domain context provided
    let onChainData = null;
    if (query.context?.domain) {
      onChainData = await this.getOnChainContext(query.context.domain);
    }

    // Build context for LLM
    const context = this.buildRAGContext(relevantDocs, onChainData);

    // Generate answer (placeholder - integrate with LLM API)
    const answer = await this.generateAnswer(validation.sanitizedInput, context);

    // Fact-check against blockchain if domain context provided
    if (query.context?.domain) {
      const factCheck = await aiBlockchainValidator.factCheckAIResponse(
        answer,
        query.context.domain
      );
      if (!factCheck) {
        console.warn('AI response failed fact-check against on-chain data');
      }
    }

    // Cache result
    if (this.config.enableCaching) {
      aiCacheService.cacheQuery(`rag:${validation.sanitizedInput}`, answer, 3600000);
    }

    return answer;
  }

  /**
   * Retrieve relevant documentation chunks (placeholder)
   */
  private async retrieveRelevantDocs(
    query: string,
    context?: RAGQuery['context']
  ): Promise<string[]> {
    // Placeholder - in production, use vector database (FAISS, Pinecone, etc.)
    // For now, return empty array
    return [];
  }

  /**
   * Get on-chain context for domain
   */
  private async getOnChainContext(domain: string): Promise<any> {
    // Placeholder - fetch actual on-chain data
    return {
      domain,
      // Add actual on-chain data fetching here
    };
  }

  /**
   * Build RAG context from docs and on-chain data
   */
  private buildRAGContext(docs: string[], onChainData: any | null): string {
    const parts: string[] = [];

    if (docs.length > 0) {
      parts.push('Relevant ENS Documentation:');
      parts.push(...docs);
    }

    if (onChainData) {
      parts.push('\nOn-Chain Data:');
      parts.push(JSON.stringify(onChainData, null, 2));
    }

    return parts.join('\n\n');
  }

  /**
   * Generate answer with context (placeholder)
   */
  private async generateAnswer(query: string, context: string): Promise<string> {
    // Placeholder - in production, call LLM API with context
    return `Based on the provided context, here's information about: ${query}`;
  }

  /**
   * Simple answer without RAG (placeholder)
   */
  private async simpleAnswer(query: string): Promise<string> {
    // Placeholder - in production, call LLM API
    return `I can help you with: ${query}`;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AIConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AIConfig {
    return { ...this.config };
  }
}

// Default instance
export const aiService = new AIService();
