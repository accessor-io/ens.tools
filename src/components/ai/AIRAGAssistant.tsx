/**
 * AI RAG Assistant Component
 * Provides Q&A interface for ENS documentation using RAG
 */

import { useState } from 'react';
import { useAIRAGQuery } from '../../lib/hooks/useAIRAGQuery';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, MessageSquare, Sparkles, X } from 'lucide-react';
import { useDomainContext } from '../../lib/contexts/DomainContext';

export function AIRAGAssistant() {
  const [question, setQuestion] = useState('');
  const [questionHistory, setQuestionHistory] = useState<string[]>([]);
  const { selectedDomain } = useDomainContext();
  const { answer, isLoading, error, askQuestion, clearAnswer } = useAIRAGQuery();

  const handleAsk = async () => {
    if (!question.trim()) return;

    const currentQuestion = question.trim();
    setQuestionHistory(prev => [...prev, currentQuestion]);
    
    await askQuestion(currentQuestion, {
      domain: selectedDomain?.name,
    });

    setQuestion('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          ENS Documentation Assistant
        </CardTitle>
        <CardDescription>
          Ask questions about ENS protocol, domain management, and best practices
          {selectedDomain && (
            <span className="block mt-1 text-xs">
              Context: {selectedDomain.name}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Ask a question about ENS..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleAsk}
              disabled={isLoading || !question.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </Button>
          </div>
          {questionHistory.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {questionHistory.slice(-3).map((q, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuestion(q);
                    handleAsk();
                  }}
                  className="text-xs"
                >
                  {q.length > 30 ? q.substring(0, 30) + '...' : q}
                </Button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {answer && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Answer:</h3>
              <Button variant="ghost" size="sm" onClick={clearAnswer}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Card className="p-4 bg-muted">
              <p className="text-sm whitespace-pre-wrap">{answer}</p>
            </Card>
          </div>
        )}

        {!answer && !isLoading && !error && (
          <div className="text-center text-muted-foreground py-8">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Ask a question to get started</p>
            <p className="text-xs mt-2">
              Examples: "How do I set up a resolver?", "What is ENSIP-19?", "How do I delegate permissions?"
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
