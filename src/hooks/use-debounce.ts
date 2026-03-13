/**
 * useDebounce – delays updating a value until the user stops changing it.
 *
 * Usage:
 *   const debouncedSearch = useDebounce(search, 400);
 *   // debouncedSearch only updates 400 ms after `search` stops changing.
 */
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
