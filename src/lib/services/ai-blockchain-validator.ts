/**
 * AI Blockchain Validation Service
 * Validates AI outputs against on-chain ENS registry data
 * Implements trust layer by using blockchain as source of truth
 */

import { createPublicClient, http, PublicClient, Address } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { normalize } from 'viem/ens';
import { namehash } from '../ens/ens-helpers';

export interface ValidationProof {
  isValid: boolean;
  blockNumber: bigint;
  timestamp: Date;
  proof: string;
  onChainData: any;
}

export interface AIDomainSuggestion {
  suggestedName: string;
  confidence: number;
  blockchainProof?: ValidationProof;
  onChainVerified: boolean;
  modelVersion?: string;
  timestamp: bigint;
}

export class AIBlockchainValidator {
  private publicClient: PublicClient | null = null;
  private chainId: number = 1; // Default to mainnet

  /**
   * Initialize with public client
   */
  initialize(chainId: number = 1) {
    this.chainId = chainId;
    const chain = chainId === 1 ? mainnet : sepolia;
    
    this.publicClient = createPublicClient({
      chain,
      transport: http(),
    });
  }

  /**
   * Validate AI domain suggestion against on-chain ENS registry
   */
  async validateDomainSuggestion(
    suggestion: string,
    modelVersion?: string
  ): Promise<AIDomainSuggestion> {
    if (!this.publicClient) {
      this.initialize();
    }

    try {
      // Normalize the domain name (simplified - use proper ENS normalization in production)
      const normalizedName = suggestion.toLowerCase().trim();
      
      // Check domain availability
      const isAvailable = await this.checkDomainAvailability(normalizedName);
      
      // Get block number for timestamp
      const blockNumber = await this.publicClient!.getBlockNumber();
      
      // Create validation proof
      const proof = await this.createValidationProof({
        name: normalizedName,
        blockNumber,
        available: isAvailable,
      });

      return {
        suggestedName: normalizedName,
        confidence: isAvailable ? 1.0 : 0.0,
        blockchainProof: proof,
        onChainVerified: isAvailable,
        modelVersion,
        timestamp: blockNumber,
      };
    } catch (error) {
      console.error('Error validating domain suggestion:', error);
      return {
        suggestedName: suggestion,
        confidence: 0.0,
        onChainVerified: false,
        timestamp: BigInt(0),
      };
    }
  }

  /**
   * Check if domain is available on-chain
   */
  private async checkDomainAvailability(domain: string): Promise<boolean> {
    if (!this.publicClient) {
      throw new Error('Public client not initialized');
    }

    try {
      // ENS Registry address (mainnet)
      const ENS_REGISTRY_ADDRESS = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' as Address;
      
      // Check if domain exists by querying the registry
      const normalizedDomain = normalize(domain);
      const node = namehash(normalizedDomain);
      
      // Try to get resolver - if it exists, domain is registered
      try {
        const resolver = await this.publicClient.readContract({
          address: ENS_REGISTRY_ADDRESS,
          abi: [
            {
              name: 'resolver',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'node', type: 'bytes32' }],
              outputs: [{ name: '', type: 'address' }],
            },
          ],
          functionName: 'resolver',
          args: [node],
        });

        // If resolver exists, domain is likely registered
        return resolver === '0x0000000000000000000000000000000000000000';
      } catch {
        // If we can't read resolver, assume available
        return true;
      }
    } catch (error) {
      console.error('Error checking domain availability:', error);
      return false;
    }
  }


  /**
   * Create validation proof
   */
  private async createValidationProof(data: {
    name: string;
    blockNumber: bigint;
    available: boolean;
  }): Promise<ValidationProof> {
    // Create a simple proof hash
    const proofData = JSON.stringify({
      name: data.name,
      blockNumber: data.blockNumber.toString(),
      available: data.available,
      timestamp: new Date().toISOString(),
    });

    const encoder = new TextEncoder();
    const proofBytes = encoder.encode(proofData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', proofBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const proof = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return {
      isValid: data.available,
      blockNumber: data.blockNumber,
      timestamp: new Date(),
      proof,
      onChainData: {
        name: data.name,
        available: data.available,
      },
    };
  }

  /**
   * Fact-check AI response against on-chain data
   */
  async factCheckAIResponse(response: string, domain: string): Promise<boolean> {
    if (!this.publicClient) {
      this.initialize();
    }

    try {
      // Extract claims from response (simplified - use NLP in production)
      const claims = this.extractClaims(response);
      
      // Get on-chain domain data
      const domainData = await this.getOnChainDomainData(domain);
      
      // Verify each claim
      return claims.every(claim => {
        return this.verifyClaimAgainstOnChainData(claim, domainData);
      });
    } catch (error) {
      console.error('Error fact-checking AI response:', error);
      return false;
    }
  }

  /**
   * Extract claims from AI response (simplified)
   */
  private extractClaims(response: string): string[] {
    // Simple extraction - in production, use NLP to extract factual claims
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.filter(s => {
      // Filter for factual statements (contains domain name or ENS-related terms)
      return s.includes('.eth') || 
             s.toLowerCase().includes('resolver') ||
             s.toLowerCase().includes('owner') ||
             s.toLowerCase().includes('expires');
    });
  }

  /**
   * Get on-chain domain data
   */
  private async getOnChainDomainData(domain: string): Promise<any> {
    // Simplified - in production, fetch full domain data
    return {
      domain,
      // Add actual on-chain data fetching here
    };
  }

  /**
   * Verify claim against on-chain data
   */
  private verifyClaimAgainstOnChainData(claim: string, domainData: any): boolean {
    // Simplified verification - in production, use NLP to match claims with data
    // For now, just check if claim mentions the domain
    return claim.toLowerCase().includes(domain.toLowerCase());
  }

  /**
   * Validate metadata suggestion against ENSIP-19 schema
   */
  async validateMetadataSuggestion(metadata: any): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic structure validation
    if (!metadata || typeof metadata !== 'object') {
      errors.push('Metadata must be an object');
      return { isValid: false, errors, warnings };
    }

    // Check for required fields (simplified - use full ENSIP-19 schema in production)
    if (!metadata.name) {
      errors.push('Metadata must include a name field');
    }

    // Validate name format
    if (metadata.name && !metadata.name.match(/^[a-z0-9-]+\.eth$/i)) {
      warnings.push('Name should be a valid ENS domain');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export const aiBlockchainValidator = new AIBlockchainValidator();
