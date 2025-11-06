import { useState, useEffect, useCallback } from 'react';

/**
 * Helper to serialize/deserialize Sets and Maps
 */
function serializeValue(value: any): any {
  if (value instanceof Set) {
    return { __type: 'Set', value: Array.from(value) };
  }
  if (value instanceof Map) {
    return { __type: 'Map', value: Array.from(value.entries()) };
  }
  return value;
}

function deserializeValue(value: any): any {
  if (value && typeof value === 'object' && '__type' in value) {
    if (value.__type === 'Set') {
      return new Set(value.value);
    }
    if (value.__type === 'Map') {
      return new Map(value.value);
    }
  }
  return value;
}

/**
 * Hook to persist state across tab changes and component remounts
 * Uses sessionStorage to persist state for the current session
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T,
  persist: boolean = true
): [T, (value: T | ((prev: T) => T)) => void] {
  // Try to load from sessionStorage
  const getStoredValue = useCallback((): T => {
    if (!persist || typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = sessionStorage.getItem(key);
      if (item !== null) {
        const parsed = JSON.parse(item);
        return deserializeValue(parsed) as T;
      }
    } catch (error) {
      console.warn(`Error loading state for key ${key}:`, error);
    }

    return initialValue;
  }, [key, initialValue, persist]);

  const [state, setState] = useState<T>(getStoredValue);

  // Save to sessionStorage whenever state changes
  useEffect(() => {
    if (!persist || typeof window === 'undefined') {
      return;
    }

    try {
      const serialized = serializeValue(state);
      sessionStorage.setItem(key, JSON.stringify(serialized));
    } catch (error) {
      console.warn(`Error saving state for key ${key}:`, error);
    }
  }, [key, state, persist]);

  // Update state function that handles both direct values and functions
  const setPersistentState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const newValue = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
        return newValue;
      });
    },
    []
  );

  return [state, setPersistentState];
}

/**
 * Hook to persist state with a domain-specific key
 * Useful for DomainProfile where state should be per-domain
 */
export function useDomainPersistentState<T>(
  domainName: string,
  key: string,
  initialValue: T,
  persist: boolean = true
): [T, (value: T | ((prev: T) => T)) => void] {
  const domainKey = `domain:${domainName}:${key}`;
  return usePersistentState(domainKey, initialValue, persist);
}

/**
 * Hook to persist multiple state values at once
 */
export function usePersistentStateMap<T extends Record<string, any>>(
  prefix: string,
  initialValues: T,
  persist: boolean = true
): [T, <K extends keyof T>(key: K, value: T[K] | ((prev: T[K]) => T[K])) => void, () => void] {
  const [stateMap, setStateMap] = useState<T>(() => {
    if (!persist || typeof window === 'undefined') {
      return initialValues;
    }

    try {
      const stored: Partial<T> = {};
      Object.keys(initialValues).forEach((key) => {
        const item = sessionStorage.getItem(`${prefix}:${key}`);
        if (item !== null) {
          try {
            stored[key as keyof T] = JSON.parse(item);
          } catch {
            stored[key as keyof T] = initialValues[key];
          }
        }
      });
      return { ...initialValues, ...stored };
    } catch (error) {
      console.warn(`Error loading state map for prefix ${prefix}:`, error);
      return initialValues;
    }
  });

  // Save individual keys to sessionStorage
  useEffect(() => {
    if (!persist || typeof window === 'undefined') {
      return;
    }

    Object.entries(stateMap).forEach(([key, value]) => {
      try {
        sessionStorage.setItem(`${prefix}:${key}`, JSON.stringify(value));
      } catch (error) {
        console.warn(`Error saving state for ${prefix}:${key}:`, error);
      }
    });
  }, [prefix, stateMap, persist]);

  const updateState = useCallback(
    <K extends keyof T>(key: K, value: T[K] | ((prev: T[K]) => T[K])) => {
      setStateMap((prev) => {
        const newValue = typeof value === 'function' ? (value as (prev: T[K]) => T[K])(prev[key]) : value;
        return { ...prev, [key]: newValue };
      });
    },
    []
  );

  const resetState = useCallback(() => {
    setStateMap(initialValues);
    if (persist && typeof window !== 'undefined') {
      Object.keys(initialValues).forEach((key) => {
        try {
          sessionStorage.removeItem(`${prefix}:${key}`);
        } catch (error) {
          console.warn(`Error clearing state for ${prefix}:${key}:`, error);
        }
      });
    }
  }, [prefix, initialValues, persist]);

  return [stateMap, updateState, resetState];
}

