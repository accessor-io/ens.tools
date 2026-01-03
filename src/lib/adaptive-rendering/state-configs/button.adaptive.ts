import * as React from 'react';
import type { ComponentAdaptations } from '../types';
import type { VariantProps } from 'class-variance-authority';
import type { buttonVariants } from '../../../components/ui/button';

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export const buttonAdaptations: ComponentAdaptations<ButtonProps> = {
  domain: [
    {
      when: (state) => state.isBulkMode,
      adapt: {
        className: 'opacity-75 cursor-not-allowed',
        disabled: true,
      },
      priority: 10,
    },
    {
      when: (state) => !state.selectedDomain && !state.isBulkMode,
      adapt: {
        className: 'opacity-50',
      },
      priority: 5,
    },
  ],
  theme: [
    {
      when: (state) => state.compactMode,
      adapt: {
        className: 'h-8 px-3 text-xs',
      },
      priority: 8,
    },
    {
      when: (state) => state.reducedMotion,
      adapt: {
        className: 'transition-none',
      },
      priority: 5,
    },
    {
      when: (state) => state.highContrast,
      adapt: {
        className: 'border-2',
      },
      priority: 7,
    },
  ],
  device: [
    {
      when: (state) => state.deviceType === 'mobile',
      adapt: {
        className: 'h-12 min-h-[44px] touch-target-min',
        size: 'lg' as const,
      },
      priority: 10,
    },
    {
      when: (state) => state.deviceType === 'tablet',
      adapt: {
        className: 'h-11 min-h-[40px]',
      },
      priority: 8,
    },
    {
      when: (state) => state.touchSupport,
      adapt: {
        className: 'touch-target-min',
      },
      priority: 6,
    },
    {
      when: (state) => state.orientation === 'portrait' && state.deviceType === 'mobile',
      adapt: {
        className: 'w-full',
      },
      priority: 7,
    },
  ],
  workflow: [
    {
      when: (state) => state.transactionState === 'pending' || state.transactionState === 'confirming',
      adapt: {
        disabled: true,
        className: 'opacity-50 cursor-wait',
      },
      priority: 15,
    },
    {
      when: (state) => state.isProcessing === true,
      adapt: {
        disabled: true,
        className: 'opacity-50 cursor-wait',
      },
      priority: 12,
    },
    {
      when: (state) => state.validationState === 'invalid',
      adapt: {
        disabled: true,
        className: 'opacity-50 cursor-not-allowed',
      },
      priority: 10,
    },
  ],
  network: [
    {
      when: (state) => !state.isConnected,
      adapt: {
        disabled: true,
        className: 'opacity-50 cursor-not-allowed',
      },
      priority: 20,
    },
    {
      when: (state) => state.networkStatus === 'switching',
      adapt: {
        disabled: true,
        className: 'opacity-50 cursor-wait',
      },
      priority: 18,
    },
  ],
  transaction: [
    {
      when: (state) => (state.pendingTransactions || 0) > 0,
      adapt: {
        className: 'relative',
      },
      priority: 5,
    },
    {
      when: (state) => !!state.transactionError,
      adapt: {
        variant: 'destructive' as const,
      },
      priority: 8,
    },
  ],
  default: {
    className: '',
  },
};
