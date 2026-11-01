import React, { createContext, useContext, useEffect, useState } from 'react';
import { request } from './api';

export const ConsoleContext = createContext(null);
export const useConsole = () => useContext(ConsoleContext);

export function useDocument(id, tick = 0) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    let active = true;
    if (!id) { setData(null); return undefined; }
    setLoading(true);
    setError(null);
    request(`/api/entities/${encodeURIComponent(id)}/resolved`).then((result) => {
      if (active) setData(result);
    }).catch((failure) => { if (active) { setError(failure); setData(null); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, tick]);
  return { data, loading, error };
}

export function useDirty(key, dirty) {
  const { setDirty } = useConsole();
  useEffect(() => { setDirty(key, dirty); return () => setDirty(key, false); }, [key, dirty, setDirty]);
}
