import { useEffect } from 'react';

export type ViewType = 'dashboard' | 'domains' | 'name-browser' | 'metadata' | 'security' | 'governance' | 'audit' | 'naming' | 'protocol' | 'best-practices' | 'settings' | 'dao-registry' | 'integrations' | 'metadata-tools' | 'contracts' | 'contract-registration' | 'analytics' | 'preflight-checker' | 'marketplace' | 'dnssec' | 'fee-management' | 'master-database' | 'admin-panel' | 'guided-workflow';

interface KeyboardShortcuts {
  [key: string]: {
    view: ViewType;
    description: string;
  };
}

const SHORTCUTS: KeyboardShortcuts = {
  '1': { view: 'dashboard', description: 'Dashboard' },
  '2': { view: 'domains', description: 'Domain Management' },
  '3': { view: 'marketplace', description: 'Marketplace' },
  '4': { view: 'metadata', description: 'Metadata Editor' },
  '5': { view: 'analytics', description: 'Analytics' },
  '6': { view: 'security', description: 'Security Monitor' },
  '7': { view: 'settings', description: 'Settings' },
};

export function useKeyboardShortcuts(
  onViewChange: (view: ViewType) => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Check for number keys (1-7)
      if (e.key >= '1' && e.key <= '7' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const shortcut = SHORTCUTS[e.key];
        if (shortcut) {
          e.preventDefault();
          onViewChange(shortcut.view);
        }
      }

      // Escape key to go to dashboard (only if no modal is open)
      if (e.key === 'Escape' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (
          target.tagName !== 'INPUT' &&
          target.tagName !== 'TEXTAREA' &&
          !target.isContentEditable
        ) {
          // Check if there's an open dialog/modal
          const openDialog = document.querySelector('[data-state="open"][data-slot="dialog-overlay"], [data-state="open"][data-slot="alert-dialog-overlay"], [data-state="open"][role="dialog"]');
          const openModal = document.querySelector('.fixed.inset-0.z-50[style*="display"]:not([style*="display: none"])');
          
          // If a modal/dialog is open, don't change view - let the modal handle the escape
          if (!openDialog && !openModal) {
            onViewChange('dashboard');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onViewChange, enabled]);
}

export function getShortcutHelp(): Array<{ key: string; description: string }> {
  return Object.entries(SHORTCUTS).map(([key, { description }]) => ({
    key,
    description,
  }));
}







