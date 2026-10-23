import { useEffect, useState } from 'react';

// Returns `value`, but only after it has stopped changing for `delay` ms.
// Used so search sends one request when the user pauses, not one per keystroke.
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
