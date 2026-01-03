import type {
  ComponentAdaptation,
  AdaptationRule,
  ComputedAdaptations,
  AdaptiveContextState,
} from '../types';

/**
 * Resolve adaptation conflicts
 * Handles priority and merges conflicting adaptations
 */
export function resolveAdaptationConflicts(
  adaptations: ComputedAdaptations[]
): ComputedAdaptations {
  if (adaptations.length === 0) {
    return { props: {}, priority: 0 };
  }

  adaptations.sort((a, b) => (b.priority || 0) - (a.priority || 0));

  const merged: ComputedAdaptations = {
    className: '',
    style: {},
    props: {},
    priority: adaptations[0].priority || 0,
  };

  for (const adaptation of adaptations) {
    if (adaptation.className) {
      merged.className = merged.className
        ? `${merged.className} ${adaptation.className}`
        : adaptation.className;
    }

    if (adaptation.style) {
      merged.style = { ...merged.style, ...adaptation.style };
    }

    if (adaptation.props) {
      merged.props = { ...merged.props, ...adaptation.props };
    }
  }

  return merged;
}

/**
 * Evaluate adaptation rule
 * Checks if rule condition is met and returns adaptation
 */
export function evaluateAdaptationRule<TContextState>(
  rule: AdaptationRule<TContextState>,
  contextState: TContextState,
  componentProps: any
): ComponentAdaptation | null {
  if (!rule.when(contextState)) {
    return null;
  }

  if (typeof rule.adapt === 'function') {
    return rule.adapt(contextState, componentProps);
  }

  return rule.adapt;
}

/**
 * Compute adaptations from rules
 */
export function computeAdaptationsFromRules<TContextState>(
  rules: AdaptationRule<TContextState>[] | undefined,
  contextState: TContextState,
  componentProps: any
): ComputedAdaptations[] {
  if (!rules || rules.length === 0) {
    return [];
  }

  return rules
    .map((rule) => {
      const adaptation = evaluateAdaptationRule(rule, contextState, componentProps);
      if (!adaptation) {
        return null;
      }

      return {
        className: adaptation.className,
        style: adaptation.style,
        props: { ...adaptation, className: undefined, style: undefined },
        priority: rule.priority || 0,
      };
    })
    .filter((adaptation): adaptation is ComputedAdaptations => adaptation !== null);
}
