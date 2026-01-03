import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import type {
  ComponentAdaptations,
  AdaptiveComponentProps,
  PolymorphicProps,
} from './types';
import { useAdaptiveContexts } from './contexts/AdaptiveContextProvider';
import { computeAdaptations } from './adaptation-engine';

/**
 * Create an adaptive component wrapper
 * Transforms a component into a polymorphic, context-aware rendering engine
 */
export function createAdaptiveComponent<
  T extends React.ElementType,
  TProps = React.ComponentProps<T>
>(
  Component: T,
  adaptations: ComponentAdaptations<TProps>
): React.ForwardRefExoticComponent<
  AdaptiveComponentProps<T, TProps> & React.RefAttributes<any>
> {
  const AdaptiveComponent = React.forwardRef<
    any,
    AdaptiveComponentProps<T, TProps>
  >((props, ref) => {
    const {
      adaptive = true,
      overrideAdaptations,
      as,
      asChild,
      ...componentProps
    } = props;

    const contextState = useAdaptiveContexts();

    let finalAdaptations = adaptations;
    if (overrideAdaptations) {
      finalAdaptations = {
        ...adaptations,
        ...overrideAdaptations,
      };
    }

    let adaptedProps: any = componentProps;

    if (adaptive) {
      adaptedProps = computeAdaptations(
        componentProps as TProps,
        contextState,
        finalAdaptations
      );
    }

    if (asChild) {
      return (
        <Slot ref={ref} {...adaptedProps}>
          {props.children}
        </Slot>
      );
    }

    const Element = (as || Component) as React.ElementType;

    return <Element ref={ref} {...adaptedProps} />;
  });

  AdaptiveComponent.displayName = `Adaptive(${
    Component.displayName || Component.name || 'Component'
  })`;

  return AdaptiveComponent as React.ForwardRefExoticComponent<
    AdaptiveComponentProps<T, TProps> & React.RefAttributes<any>
  >;
}

/**
 * Higher-order component to make any component adaptive
 */
export function withAdaptive<T extends React.ComponentType<any>>(
  Component: T,
  adaptations: ComponentAdaptations<React.ComponentProps<T>>
): React.ForwardRefExoticComponent<
  AdaptiveComponentProps<React.ElementType, React.ComponentProps<T>> &
    React.RefAttributes<any>
> {
  return createAdaptiveComponent(Component, adaptations);
}
