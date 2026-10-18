import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import type { HomeArea } from '../domain/areas';
import { getStore } from '../data/native';

export const nearbyRadii = [1000, 3000, 5000];
export function useNearbyArea() {
  const [radius, setRadiusState] = useState(() => {
    const store = getStore(), saved = store.setting('nearbyRadius', store.setting<HomeArea | null>('homeArea', null)?.radius ?? 3000);
    return nearbyRadii.includes(saved) ? saved : 3000;
  });
  const [fix, setFix] = useState<Location.LocationObject | null>(null);
  const [status, setStatus] = useState('Finner posisjonen din …');
  const [pending, setPending] = useState(true);
  const current = useRef<Location.LocationObject | null>(null);
  const generation = useRef(0), watch = useRef<Location.LocationSubscription | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stop = useCallback(() => { generation.current++; watch.current?.remove(); watch.current = null; clearTimeout(timeout.current); }, []);
  const accept = useCallback((p: Location.LocationObject) => {
    if (Date.now() - p.timestamp > 30000 || p.coords.accuracy === null || p.coords.accuracy > 100) return false;
    current.current = p; setFix(p); setPending(false); setStatus('Området følger posisjonen din.');
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => { current.current = null; setFix(null); setPending(false); setStatus('Venter på en fersk posisjon. Prøv igjen når du har GPS-dekning.'); }, 60000);
    return true;
  }, []);
  const start = useCallback(async () => {
    stop(); const token = generation.current;
    current.current = null; setFix(null); setPending(true); setStatus('Finner posisjonen din …');
    timeout.current = setTimeout(() => { if (token === generation.current) { setPending(false); setStatus('Det tar tid å finne deg. Sjekk at posisjon er slått på, og prøv igjen.'); } }, 20000);
    try {
      const permission = await Location.getForegroundPermissionsAsync();
      if (token !== generation.current) return;
      if (!permission.granted) { clearTimeout(timeout.current); setPending(false); setStatus('Tillat posisjon for å finne området rundt deg.'); return; }
      const sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 0, mayShowUserSettingsDialog: false }, p => { if (token === generation.current) accept(p); });
      if (token === generation.current) watch.current = sub; else sub.remove();
    } catch {
      if (token === generation.current) { clearTimeout(timeout.current); setPending(false); setStatus('Kan ikke finne posisjonen. Sjekk posisjonstilgangen og prøv igjen.'); }
    }
  }, [stop, accept]);
  useEffect(() => {
    // Migrate only the radius. A previous home coordinate must never stand in for live GPS.
    getStore().setSetting('nearbyRadius', radius);
    getStore().setSetting('homeArea', null);
    void start();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') void start();
      else { stop(); current.current = null; setFix(null); }
    });
    return () => { stop(); sub.remove(); };
  }, [start, stop]);
  const setRadius = useCallback((value: number) => {
    if (!nearbyRadii.includes(value)) return;
    getStore().setSetting('nearbyRadius', value); setRadiusState(value);
  }, []);
  const locate = useCallback(async (): Promise<HomeArea> => {
    setPending(true); setStatus('Finner posisjonen din …');
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Tillat posisjon for å bruke området rundt deg.');
      // Also start foreground updates when permission was first granted here.
      if (!watch.current) void start();
      const p = current.current && Date.now() - current.current.timestamp <= 10000 ? current.current : await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Fant ikke posisjonen i tide. Sjekk GPS-dekningen og prøv igjen.')), 20000); }),
      ]);
      if (AppState.currentState !== 'active' || !accept(p)) throw new Error('GPS-posisjonen er for usikker. Prøv igjen.');
      return { latitude: p.coords.latitude, longitude: p.coords.longitude, name: 'der du er nå', radius };
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e)); throw e;
    } finally { clearTimeout(timer); setPending(false); }
  }, [radius, accept, start]);
  const area = useMemo<HomeArea | null>(() => fix ? { latitude: fix.coords.latitude, longitude: fix.coords.longitude, name: 'der du er nå', radius } : null, [fix, radius]);
  return { area, radius, setRadius, pending, status, locate };
}
