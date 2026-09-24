import { useEffect, useState } from 'react';

// Phones (below Tailwind's `md` breakpoint) get the touch layout: the control
// panel as a bottom sheet, a two-row species bar and touch hints.
const MOBILE_QUERY = '(max-width: 767px)';

export function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches;
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(isMobileViewport);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}
