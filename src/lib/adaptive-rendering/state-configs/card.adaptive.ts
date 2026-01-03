import * as React from 'react';
import type { ComponentAdaptations } from '../types';

type CardProps = React.ComponentProps<'div'>;

export const cardAdaptations: ComponentAdaptations<CardProps> = {
  domain: [
    {
      when: (state) => state.isBulkMode,
      adapt: {
        className: 'border-dashed opacity-75',
      },
      priority: 8,
    },
    {
      when: (state) => !!state.selectedDomain,
      adapt: {
        className: 'ring-2 ring-purple-500/20',
      },
      priority: 5,
    },
  ],
  theme: [
    {
      when: (state) => state.compactMode,
      adapt: {
        className: 'gap-4 p-4',
      },
      priority: 10,
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
        className: 'rounded-lg p-4',
      },
      priority: 10,
    },
    {
      when: (state) => state.viewport.width < 640,
      adapt: {
        className: 'w-full',
      },
      priority: 8,
    },
  ],
  workflow: [
    {
      when: (state) => state.validationState === 'invalid',
      adapt: {
        className: 'border-red-500/50 bg-red-500/5',
      },
      priority: 12,
    },
    {
      when: (state) => state.validationState === 'valid',
      adapt: {
        className: 'border-green-500/50 bg-green-500/5',
      },
      priority: 10,
    },
    {
      when: (state) => state.isProcessing === true,
      adapt: {
        className: 'opacity-75',
      },
      priority: 8,
    },
  ],
  network: [
    {
      when: (state) => !state.isConnected,
      adapt: {
        className: 'opacity-50',
      },
      priority: 15,
    },
  ],
  default: {
    className: '',
  },
};
