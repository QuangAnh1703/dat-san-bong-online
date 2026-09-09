import { useEffect, useState } from 'react';

/** Dem nguoc tung giay, dung lai o 0 */
export function useCountdown(from) {
  const [left, setLeft] = useState(from);

  useEffect(() => {
    if (left <= 0) return undefined;
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [left]);

  return left;
}
