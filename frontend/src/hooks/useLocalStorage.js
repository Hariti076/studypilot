import { useEffect, useState } from 'react';

const resolve = (v) => (typeof v === 'function' ? v() : v);

/** useState that persists to localStorage (safe against blocked/unavailable storage). */
export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : resolve(initial);
    } catch {
      return resolve(initial);
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable — ignore */
    }
  }, [key, value]);

  return [value, setValue];
}
