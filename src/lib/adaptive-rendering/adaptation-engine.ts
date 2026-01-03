import type {
  ComponentAdaptations,
  AdaptiveContextState,
  ComputedAdaptations,
  AdaptationEngineOptions,
} from './types';
import {
  computeAdaptationsFromRules,
  resolveAdaptationConflicts,
} from './utils/adaptation-resolver';
import { applyDefaultAdaptation } from './utils/prop-composer';

/**
 * Adaptation Engine
 * Core logic for computing adaptations from context state
 */

const defaultOptions: Required<AdaptationEngineOptions> = {
  mergeStrategy: 'merge',
  classNameMergeStrategy: 'smart',
  priorityThreshold: 0,
};

/**
 * Compute adaptations for a component based on context state
 */
export function computeAdaptations<TProps extends Record<string, any>>(
  props: TProps,
  contextState: AdaptiveContextState,
  adaptations: ComponentAdaptations<TProps>,
  options: AdaptationEngineOptions = {}
): TProps {
  const opts = { ...defaultOptions, ...options };
  const allAdaptations: ComputedAdaptations[] = [];

  if (adaptations.domain) {
    const domainAdaptations = computeAdaptationsFromRules(
      adaptations.domain,
      contextState.domain,
      props
    );
    allAdaptations.push(...domainAdaptations);
  }

  if (adaptations.theme) {
    const themeAdaptations = computeAdaptationsFromRules(
      adaptations.theme,
      contextState.theme,
      props
    );
    allAdaptations.push(...themeAdaptations);
  }

  if (adaptations.device) {
    const deviceAdaptations = computeAdaptationsFromRules(
      adaptations.device,
      contextState.device,
      props
    );
    allAdaptations.push(...deviceAdaptations);
  }

  if (adaptations.workflow) {
    const workflowAdaptations = computeAdaptationsFromRules(
      adaptations.workflow,
      contextState.workflow,
      props
    );
    allAdaptations.push(...workflowAdaptations);
  }

  if (adaptations.network) {
    const networkAdaptations = computeAdaptationsFromRules(
      adaptations.network,
      contextState.network,
      props
    );
    allAdaptations.push(...networkAdaptations);
  }

  if (adaptations.user) {
    const userAdaptations = computeAdaptationsFromRules(
      adaptations.user,
      contextState.user,
      props
    );
    allAdaptations.push(...userAdaptations);
  }

  if (adaptations.validation) {
    const validationAdaptations = computeAdaptationsFromRules(
      adaptations.validation,
      contextState.validation,
      props
    );
    allAdaptations.push(...validationAdaptations);
  }

  if (adaptations.transaction) {
    const transactionAdaptations = computeAdaptationsFromRules(
      adaptations.transaction,
      contextState.transaction,
      props
    );
    allAdaptations.push(...transactionAdaptations);
  }

  const filteredAdaptations = allAdaptations.filter(
    (adaptation) => (adaptation.priority || 0) >= opts.priorityThreshold
  );

  const resolved = resolveAdaptationConflicts(filteredAdaptations);

  let adaptedProps = props;

  if (resolved.className || resolved.style || Object.keys(resolved.props).length > 0) {
    adaptedProps = {
      ...props,
      ...resolved.props,
      className: resolved.className
        ? `${props.className || ''} ${resolved.className}`.trim()
        : props.className,
      style: {
        ...props.style,
        ...resolved.style,
      },
    };
  }

  if (adaptations.default) {
    adaptedProps = applyDefaultAdaptation(adaptedProps, adaptations.default);
  }

  return adaptedProps;
}

/**
 * Check if adaptations should be applied
 */
export function shouldApplyAdaptations(
  contextState: AdaptiveContextState,
  adaptations: ComponentAdaptations
): boolean {
  if (adaptations.domain && adaptations.domain.length > 0) {
    return true;
  }
  if (adaptations.theme && adaptations.theme.length > 0) {
    return true;
  }
  if (adaptations.device && adaptations.device.length > 0) {
    return true;
  }
  if (adaptations.workflow && adaptations.workflow.length > 0) {
    return true;
  }
  if (adaptations.network && adaptations.network.length > 0) {
    return true;
  }
  if (adaptations.user && adaptations.user.length > 0) {
    return true;
  }
  if (adaptations.validation && adaptations.validation.length > 0) {
    return true;
  }
  if (adaptations.transaction && adaptations.transaction.length > 0) {
    return true;
  }
  if (adaptations.default) {
    return true;
  }
  return false;
}
