import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Badge } from './ui/badge';
import { getShortcutHelp } from '../hooks/useKeyboardShortcuts';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  const shortcuts = getShortcutHelp();
  
  const additionalShortcuts = [
    { key: '?', description: 'Show keyboard shortcuts' },
    { key: 'Esc', description: 'Close dialogs / Return to dashboard' },
    { key: '/', description: 'Focus search (in Name Browser)' },
    { key: 'Ctrl+S', description: 'Save / Submit form' },
    { key: 'Ctrl+K', description: 'Command palette (if implemented)' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Speed up your workflow with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Navigation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {shortcuts.map((shortcut) => (
                <div
                  key={shortcut.key}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm text-slate-700">{shortcut.description}</span>
                  <Badge variant="outline" className="font-mono">
                    {shortcut.key}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">General</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {additionalShortcuts.map((shortcut) => (
                <div
                  key={shortcut.key}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm text-slate-700">{shortcut.description}</span>
                  <Badge variant="outline" className="font-mono">
                    {shortcut.key}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-slate-500">
              Note: Shortcuts are disabled when typing in input fields, textareas, or contenteditable elements.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

