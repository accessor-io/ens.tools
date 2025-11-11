import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';

export interface TransactionConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  action: string;
  details?: string;
  gasEstimate?: string;
  warning?: string;
  destructive?: boolean;
  requiresConfirmation?: boolean;
  onConfirm: () => Promise<void>;
  onCancel?: () => void;
}

export function TransactionConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  action,
  details,
  gasEstimate,
  warning,
  destructive = false,
  requiresConfirmation = true,
  onConfirm,
  onCancel,
}: TransactionConfirmationProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(!requiresConfirmation);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Transaction confirmation error:', error);
      throw error;
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
    setConfirmed(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={destructive ? 'text-red-600' : ''}>
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {warning && (
            <Alert className={destructive ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}>
              <AlertTriangle className={`h-4 w-4 ${destructive ? 'text-red-600' : 'text-amber-600'}`} />
              <AlertTitle className={destructive ? 'text-red-900' : 'text-amber-900'}>
                Warning
              </AlertTitle>
              <AlertDescription className={destructive ? 'text-red-800' : 'text-amber-800'}>
                {warning}
              </AlertDescription>
            </Alert>
          )}

          {details && (
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="text-sm text-slate-700">{details}</p>
            </div>
          )}

          {gasEstimate && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-slate-600">Estimated Gas:</span>
              <span className="text-sm font-medium text-slate-900">{gasEstimate}</span>
            </div>
          )}

          {requiresConfirmation && (
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <input
                type="checkbox"
                id="confirm-action"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="confirm-action" className="text-sm text-slate-700">
                I understand this action {destructive ? 'cannot be undone' : 'will execute a blockchain transaction'}
              </label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isConfirming}
          >
            Cancel
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isConfirming || !confirmed}
          >
            {isConfirming ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              action
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

