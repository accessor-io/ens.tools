import type { ComponentAdaptation, ComputedAdaptations } from '../types';
import { cn } from '../../../components/ui/utils';

/**
 * Compose adapted props
 * Merges original props with computed adaptations
 */
export function composeAdaptedProps<TProps extends Record<string, any>>(
  originalProps: TProps,
  computedAdaptations: ComputedAdaptations
): TProps {
  const { className: adaptedClassName, style: adaptedStyle, props: adaptedProps } =
    computedAdaptations;

  const mergedProps: TProps = {
    ...originalProps,
    ...adaptedProps,
  };

  if (adaptedClassName) {
    mergedProps.className = cn(originalProps.className, adaptedClassName);
  }

  if (adaptedStyle) {
    mergedProps.style = {
      ...originalProps.style,
      ...adaptedStyle,
    };
  }

  return mergedProps;
}

/**
 * Merge multiple adaptations into single props object
 */
export function mergeAdaptations<TProps extends Record<string, any>>(
  originalProps: TProps,
  ...adaptations: ComputedAdaptations[]
): TProps {
  let result = originalProps;

  for (const adaptation of adaptations) {
    result = composeAdaptedProps(result, adaptation);
  }

  return result;
}

/**
 * Apply default adaptation if provided
 */
export function applyDefaultAdaptation<TProps extends Record<string, any>>(
  props: TProps,
  defaultAdaptation?: ComponentAdaptation
): TProps {
  if (!defaultAdaptation) {
    return props;
  }

  const { className, style, ...rest } = defaultAdaptation;

  return {
    ...props,
    ...rest,
    className: cn(props.className, className),
    style: {
      ...props.style,
      ...style,
    },
  };
}
