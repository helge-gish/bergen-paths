import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import type { Coordinate } from '../domain/types';
import { addressLabel, areaLabelFallback, areaLabelKey } from '../domain/areaLabel';
import { getStore } from '../data/native';

type CachedName = { name: string | null; checkedAt: number };
export function useAreaName(center: Coordinate | null, recording: boolean) {
  const key = center ? areaLabelKey(center) : '';
  const [resolved, setResolved] = useState<{ key: string; name: string } | null>(null);
  useEffect(() => {
    if (!center) return;
    let cancelled = false, timeout: ReturnType<typeof setTimeout> | undefined;
    const store = getStore(), cacheKey = `areaName:${key}`;
    const saved = store.setting<CachedName | null>(cacheKey, null);
    if (saved?.name) { setResolved({ key, name: saved.name }); return; }
    if (saved && Date.now() - saved.checkedAt < 3600000) return;
    void (async () => {
      // Use the pinned area's centre, not the moving GPS point. Never request
      // permission just to label the area or block maps when offline.
      if (!(await Location.getForegroundPermissionsAsync()).granted || cancelled) return;
      const addresses = await Promise.race([
        Location.reverseGeocodeAsync({ latitude: center.latitude, longitude: center.longitude }),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Area name timeout')), 8000); }),
      ]);
      if (cancelled) return;
      const name = addresses.map(addressLabel).find(Boolean) ?? null;
      store.setSetting(cacheKey, { name, checkedAt: Date.now() });
      if (name) setResolved({ key, name });
    })().catch(() => {
      if (!cancelled) store.setSetting(cacheKey, { name: null, checkedAt: Date.now() });
    }).finally(() => clearTimeout(timeout));
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [key, recording]);
  return resolved?.key === key ? resolved.name : areaLabelFallback(center);
}
