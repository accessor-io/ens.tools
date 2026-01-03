import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { stateRecollectionManager } from '../../lib/adaptive-rendering/state-recollection';
import { useTransactionManager } from '../../lib/hooks/useTransactionManager';
import { useWeb3 } from '../../lib/services';
import { TransactionBuilder } from '../../lib/ens/transaction-builder';
import { FileText, Send, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { StagedEdit } from '../../lib/adaptive-rendering/state-recollection';

interface TransactionStagingPanelProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TransactionStagingPanel({ open, onOpenChange }: TransactionStagingPanelProps) {
  const [isOpen, setIsOpen] = useState(open ?? false);
  const [stagedEdits, setStagedEdits] = useState<StagedEdit[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { walletClient, publicClient } = useWeb3();
  const txManager = useTransactionManager();

  useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(isOpen);
    }
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    const updateStagedEdits = () => {
      const edits = stateRecollectionManager.getTransactionReadyEdits();
      setStagedEdits(edits);
    };

    updateStagedEdits();
    const unsubscribe = stateRecollectionManager.subscribe('transaction-ready', updateStagedEdits);
    const unsubscribe2 = stateRecollectionManager.subscribe('edit-staged', updateStagedEdits);
    const unsubscribe3 = stateRecollectionManager.subscribe('context-switched', updateStagedEdits);

    const interval = setInterval(updateStagedEdits, 2000);
    return () => {
      unsubscribe();
      unsubscribe2();
      unsubscribe3();
      clearInterval(interval);
    };
  }, []);

  const groupedEdits = stagedEdits.reduce((acc, edit) => {
    const key = `${edit.domainName}-${edit.editType}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(edit);
    return acc;
  }, {} as Record<string, StagedEdit[]>);

  const handleSubmitAll = async () => {
    if (!walletClient || !publicClient) {
      toast.error('Wallet not connected');
      return;
    }

    if (stagedEdits.length === 0) {
      toast.error('No staged edits to submit');
      return;
    }

    setIsSubmitting(true);
    try {
      const builder = new TransactionBuilder(publicClient, walletClient);

      for (const edit of stagedEdits) {
        if (edit.editType === 'metadata' && edit.changes.textRecords) {
          const records = edit.changes.textRecords;
          for (const record of records) {
            if (record.key && record.value) {
              builder.addTextRecord(edit.domainName, record.key, record.value);
            }
          }
        } else if (edit.editType === 'metadata' && edit.changes.metadata) {
          for (const [key, value] of Object.entries(edit.changes.metadata)) {
            if (value) {
              builder.addTextRecord(edit.domainName, key, value);
            }
          }
        }
      }

      if (builder.getOperationCount() === 0) {
        toast.error('No valid operations to submit');
        setIsSubmitting(false);
        return;
      }

      const operationCount = builder.getOperationCount();
      const executeFn = async () => {
        const hashes = await builder.execute();
        return hashes[0];
      };

      await txManager.addTransaction(executeFn, {
        description: `Submit ${operationCount} staged edit${operationCount !== 1 ? 's' : ''}`,
        onSuccess: () => {
          stateRecollectionManager.clearStagedEdits(undefined, stagedEdits.map(e => e.id));
          setStagedEdits([]);
          toast.success('Staged edits submitted successfully');
        },
      });
    } catch (error) {
      console.error('Error submitting staged edits:', error);
      toast.error('Failed to submit staged edits', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitGroup = async (domainName: string, editType: string) => {
    if (!walletClient || !publicClient) {
      toast.error('Wallet not connected');
      return;
    }

    const groupKey = `${domainName}-${editType}`;
    const groupEdits = groupedEdits[groupKey] || [];
    
    if (groupEdits.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const builder = new TransactionBuilder(publicClient, walletClient);

      for (const edit of groupEdits) {
        if (edit.editType === 'metadata' && edit.changes.textRecords) {
          const records = edit.changes.textRecords;
          for (const record of records) {
            if (record.key && record.value) {
              builder.addTextRecord(edit.domainName, record.key, record.value);
            }
          }
        } else if (edit.editType === 'metadata' && edit.changes.metadata) {
          for (const [key, value] of Object.entries(edit.changes.metadata)) {
            if (value) {
              builder.addTextRecord(edit.domainName, key, value);
            }
          }
        }
      }

      if (builder.getOperationCount() === 0) {
        toast.error('No valid operations to submit');
        setIsSubmitting(false);
        return;
      }

      const operationCount = builder.getOperationCount();
      const executeFn = async () => {
        const hashes = await builder.execute();
        return hashes[0];
      };

      await txManager.addTransaction(executeFn, {
        description: `Submit ${editType} edits for ${domainName} (${operationCount} operation${operationCount !== 1 ? 's' : ''})`,
        onSuccess: () => {
          stateRecollectionManager.clearStagedEdits(undefined, groupEdits.map(e => e.id));
          setStagedEdits(prev => prev.filter(e => !groupEdits.includes(e)));
          toast.success('Staged edits submitted successfully');
        },
      });
    } catch (error) {
      console.error('Error submitting staged edits:', error);
      toast.error('Failed to submit staged edits', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearEdit = (editId: string) => {
    stateRecollectionManager.clearStagedEdits(undefined, [editId]);
    setStagedEdits(prev => prev.filter(e => e.id !== editId));
  };

  if (stagedEdits.length === 0 && !isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative"
          onClick={() => setIsOpen(true)}
        >
          <FileText className="h-4 w-4 mr-2" />
          Staged Edits
          {stagedEdits.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {stagedEdits.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaction Staging</DialogTitle>
          <DialogDescription>
            Review and submit staged edits ready for transaction
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {stagedEdits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No staged edits ready for submission</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {stagedEdits.length} staged edit{stagedEdits.length !== 1 ? 's' : ''} ready
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Grouped by domain and edit type
                  </p>
                </div>
                <Button
                  onClick={handleSubmitAll}
                  disabled={isSubmitting}
                  size="sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit All
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-3">
                {Object.entries(groupedEdits).map(([key, edits]) => {
                  const [domainName, editType] = key.split('-');
                  const edit = edits[0];
                  
                  return (
                    <Card key={key}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-sm">{domainName}</CardTitle>
                            <CardDescription className="text-xs">
                              {editType} - {edits.length} edit{edits.length !== 1 ? 's' : ''}
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSubmitGroup(domainName, editType)}
                              disabled={isSubmitting}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Submit
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {edits.map((edit) => (
                            <div
                              key={edit.id}
                              className="flex items-center justify-between p-2 border rounded text-sm"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {edit.editType === 'metadata' && edit.changes.textRecords
                                    ? `${edit.changes.textRecords.length} text record${edit.changes.textRecords.length !== 1 ? 's' : ''}`
                                    : edit.editType === 'metadata' && edit.changes.metadata
                                    ? `${Object.keys(edit.changes.metadata).length} metadata field${Object.keys(edit.changes.metadata).length !== 1 ? 's' : ''}`
                                    : edit.editType}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(edit.timestamp).toLocaleString()}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => handleClearEdit(edit.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
