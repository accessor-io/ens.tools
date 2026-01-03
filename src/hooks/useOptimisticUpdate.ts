import { useState, useCallback } from 'react';

/**
 * Hook for optimistic updates
 * Updates UI immediately, then reverts if the operation fails
 * 
 * @param initialValue - Initial state value
 * @param updateFn - Function to perform the actual update
 * @returns [currentValue, optimisticUpdate, isUpdating]
 */
export function useOptimisticUpdate<T>(
  initialValue: T,
  updateFn: (value: T) => Promise<T>
): [T, (value: T) => Promise<void>, boolean] {
  const [value, setValue] = useState<T>(initialValue);
  const [isUpdating, setIsUpdating] = useState(false);
  const [previousValue, setPreviousValue] = useState<T | null>(null);

  const optimisticUpdate = useCallback(async (newValue: T) => {
    // Store previous value for rollback
    setPreviousValue(value);
    
    // Optimistically update UI
    setValue(newValue);
    setIsUpdating(true);

    try {
      // Perform actual update
      const result = await updateFn(newValue);
      setValue(result);
    } catch (error) {
      // Rollback on error
      if (previousValue !== null) {
        setValue(previousValue);
      }
      throw error;
    } finally {
      setIsUpdating(false);
      setPreviousValue(null);
    }
  }, [value, updateFn, previousValue]);

  return [value, optimisticUpdate, isUpdating];
}
