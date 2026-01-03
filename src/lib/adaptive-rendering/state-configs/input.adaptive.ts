import * as React from 'react';
import type { ComponentAdaptations } from '../types';
import {
  createInvalidStateAdaptation,
  createValidStateAdaptation,
  createDisabledStateAdaptation,
  createProcessingStateAdaptation,
} from '../utils/adaptation-helpers';

type InputProps = React.ComponentProps<'input'>;

export const inputAdaptations: ComponentAdaptations<InputProps> = {
  domain: [
    {
      when: (state) => state.isBulkMode,
      adapt: createDisabledStateAdaptation(),
      priority: 10,
    },
  ],
  theme: [
    {
      when: (state) => state.compactMode,
      adapt: {
        className: 'h-9 px-3 text-sm',
      },
      priority: 10,
    },
    {
      when: (state) => state.highContrast,
      adapt: {
        className: 'border-2',
      },
      priority: 8,
    },
    {
      when: (state) => state.isDarkMode,
      adapt: {
        className: 'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
      },
      priority: 5,
    },
  ],
  device: [
    {
      when: (state) => state.deviceType === 'mobile',
      adapt: {
        className: 'h-12 text-base',
      },
      priority: 12,
    },
    {
      when: (state) => state.touchSupport,
      adapt: {
        className: 'touch-target-min',
      },
      priority: 8,
    },
  ],
  workflow: [
    {
      when: (state) => state.validationState === 'invalid',
      adapt: createInvalidStateAdaptation(),
      priority: 15,
    },
    {
      when: (state) => state.validationState === 'valid',
      adapt: createValidStateAdaptation(),
      priority: 12,
    },
    {
      when: (state) => state.isProcessing === true,
      adapt: createProcessingStateAdaptation(),
      priority: 10,
    },
  ],
  network: [
    {
      when: (state) => !state.isConnected,
      adapt: createDisabledStateAdaptation(),
      priority: 20,
    },
  ],
  validation: [
    {
      when: (state) => state.isValid === false,
      adapt: createInvalidStateAdaptation(),
      priority: 18,
    },
    {
      when: (state) => !!state.errors && state.errors.length > 0,
      adapt: createInvalidStateAdaptation({ includeRing: false }),
      priority: 16,
    },
    {
      when: (state) => !!state.errorMessageId,
      adapt: (state) => ({
        'aria-describedby': state.errorMessageId,
      }),
      priority: 14,
    },
    {
      when: (state) => state.isRequired === true,
      adapt: {
        'aria-required': true,
      },
      priority: 5,
    },
  ],
  default: {
    className: '',
  },
};
