import { useEffect, useRef } from 'react';

export function useLegacyStellarApp() {
  const hasBootedRef = useRef(false);

  useEffect(() => {
    if (hasBootedRef.current) return;
    hasBootedRef.current = true;

    import('../../app.js');
  }, []);
}
