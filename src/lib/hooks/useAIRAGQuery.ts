/**
 * React hook for AI-powered RAG queries about ENS documentation
 */

import { useState, useCallback } from 'react';
import { aiService } from '../services/ai-service';
import { RAGQuery } from '../services/ai-service';

export interface UseAIRAGQueryReturn {
  answer: string | null;
  isLoading: boolean;
  error: string | null;
  askQuestion: (question: string, context?: RAGQuery['context']) => Promise<void>;
  clearAnswer: () => void;
}

export function useAIRAGQuery(): UseAIRAGQueryReturn {
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const askQuestion = useCallback(async (question: string, context?: RAGQuery['context']) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await aiService.answerQuestion({
        question,
        context,
      });
      setAnswer(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get answer';
      setError(errorMessage);
      setAnswer(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearAnswer = useCallback(() => {
    setAnswer(null);
    setError(null);
  }, []);

  return {
    answer,
    isLoading,
    error,
    askQuestion,
    clearAnswer,
  };
}
