import { NATURE_RADIUS } from '../domain/natureArea';
import { localDialect } from '../domain/dialect';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import type { HomeArea } from '../domain/areas';
import { freshPosition, latestPosition, usablePosition, type MapPosition } from '../domain/position';
import { getStore } from '../data/native';

export const nearbyRadii = [1000, 3000, 5000];
export function useNearbyArea() {
  const radius = NATURE_RADIUS;
  const [fix, setFix] = useState<MapPosition | null>(() => getStore().lastPosition());
  const [live, setLive] = useState(false);
  const [status, setStatus] = useState('Finner GPS-posisjonen din …');
  const [needsSettings, setNeedsSettings] = useState(false);
  const [pending, setPending] = useState(true);
  const current = useRef<MapPosition | null>(null);
  const generation = useRef(0), watch = useRef<Location.LocationSubscription | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stale = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stop = useCallback(() => { generation.current++; watch.current?.remove(); watch.current = null; clearTimeout(timeout.current); clearTimeout(stale.current); }, []);
  const accept = useCallback((p: Location.LocationObject, allowSaved = false) => {
    const value: MapPosition = { latitude: p.coords.latitude, longitude: p.coords.longitude, timestamp: p.timestamp, accuracy: p.coords.accuracy ?? 999 };
    if (!usablePosition(value) || (!allowSaved && !freshPosition(value))) return false;
    if (!freshPosition(value)) { setFix(old => latestPosition(old, value)); return false; }
    current.current = value; setFix(value); setLive(true); setPending(false); setStatus('GPS funnet · området følger deg.');
    getStore().setSetting('lastMapPosition', value);
    getStore().setSetting('localDialect', localDialect(value));
    clearTimeout(timeout.current); clearTimeout(stale.current);
    stale.current = setTimeout(() => { current.current = null; setLive(false); setStatus('GPS mangler akkurat nå. Viser sist kjente posisjon.'); }, 30000);
    return true;
  }, []);
  const start = useCallback(async () => {
    stop(); const token = generation.current;
    setFix(old => latestPosition(old, getStore().lastPosition()));
    current.current = null; setLive(false); setPending(true); setStatus('Finner GPS-posisjonen din …');
    timeout.current = setTimeout(() => { if (token === generation.current) { setPending(false); setStatus('Ingen fersk GPS. Slå på posisjon eller gå under åpen himmel.'); } }, 15000);
    try {
      const permission = await Location.getForegroundPermissionsAsync();
      if (token !== generation.current) return;
      setNeedsSettings(!permission.granted && !permission.canAskAgain);
      if (!permission.granted) { clearTimeout(timeout.current); setPending(false); setStatus('Tillat posisjon for å finne deg på kartet.'); return; }
      void Location.getLastKnownPositionAsync().then(p => { if (p && token === generation.current) accept(p, true); }).catch(() => {});
      const sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 0, mayShowUserSettingsDialog: false }, p => { if (token === generation.current) accept(p); });
      if (token === generation.current) watch.current = sub; else sub.remove();
    } catch {
      if (token === generation.current) { clearTimeout(timeout.current); setPending(false); setStatus('Kan ikke finne GPS. Sjekk posisjonstilgangen.'); }
    }
  }, [stop, accept]);
  useEffect(() => {
    getStore().setSetting('nearbyRadius', radius);
    getStore().setSetting('homeArea', null);
    getStore().setSetting('localDialect', localDialect(getStore().lastPosition()));
    void start();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') void start();
      else { stop(); current.current = null; setLive(false); }
    });
    return () => { stop(); sub.remove(); };
  }, [start, stop]);
  const locate = useCallback(async (): Promise<HomeArea> => {
    setPending(true); setStatus('Finner GPS-posisjonen din …');
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      setNeedsSettings(!permission.granted && !permission.canAskAgain);
      if (!permission.granted) throw new Error('Tillat posisjon for å vise hvor du er.');
      if (!await Location.hasServicesEnabledAsync()) throw new Error('Slå på GPS/posisjon i hurtiginnstillingene på mobilen.');
      if (!watch.current) void start();
      const p = freshPosition(current.current) ? current.current! : null;
      if (p) return { ...p, name: 'der du er nå', radius };
      const location = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Fant ikke fersk GPS. Sist kjente posisjon beholdes på kartet.')), 15000); }),
      ]);
      if (AppState.currentState !== 'active' || !accept(location)) throw new Error('GPS-posisjonen er for usikker. Prøv igjen under åpen himmel.');
      return { latitude: location.coords.latitude, longitude: location.coords.longitude, name: 'der du er nå', radius };
    } catch (e) { setStatus(e instanceof Error ? e.message : String(e)); throw e; }
    finally { clearTimeout(timer); setPending(false); }
  }, [radius, accept, start]);
  const area = useMemo<HomeArea | null>(() => fix ? { latitude: fix.latitude, longitude: fix.longitude, name: live ? 'der du er nå' : 'sist kjente posisjon', radius } : null, [fix, radius, live]);
  return { needsSettings, area, radius, pending, status, locate, live, lastSeen: fix?.timestamp ?? null };
}
