import * as React from 'react';
import type { ComponentAdaptations } from '../types';

type AccordionProps = React.ComponentProps<'div'>;

export const accordionAdaptations: ComponentAdaptations<AccordionProps> = {
  theme: [
    {
      when: (state) => state.compactMode,
      adapt: {
        className: 'gap-2',
      },
      priority: 10,
    },
    {
      when: (state) => state.reducedMotion,
      adapt: {
        className: '[&_[data-state]]:transition-none',
      },
      priority: 8,
    },
  ],
  device: [
    {
      when: (state) => state.deviceType === 'mobile',
      adapt: {
        className: 'text-sm',
      },
      priority: 10,
    },
  ],
  workflow: [
    {
      when: (state) => state.isProcessing === true,
      adapt: {
        className: 'opacity-75 pointer-events-none',
      },
      priority: 12,
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
