import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// A tiny "something changed" signal. After any create/update/delete the code calls bump(),
// and every useFetch on screen (dashboard cards, bell, lists) refetches once.
const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const value = useMemo(() => ({ version, bump }), [version, bump]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);