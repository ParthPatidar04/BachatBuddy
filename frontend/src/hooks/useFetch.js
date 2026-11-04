import { useCallback, useEffect, useState } from 'react';
import { errMsg } from '../api/client';
import { useData } from '../context/DataContext';

// useFetch(() => api.get(...).then(r => r.data), [deps])
// - refetches when deps change or when any part of the app calls bump()
// - keeps the previous data on screen while refetching (no flicker)
// - ignores stale responses from an earlier request
export default function useFetch(fetcher, deps = []) {
  const { version } = useData();
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcher()
      .then((data) => !cancelled && setState({ data, loading: false, error: null }))
      .catch((err) => !cancelled && setState((s) => ({ ...s, loading: false, error: errMsg(err) })));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version, tick]);

  return { ...state, reload };
}