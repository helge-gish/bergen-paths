import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Text, Vibration, View } from 'react-native';
import * as Location from 'expo-location';
import { startGate, startPointGate } from '../domain/startGate';
import type { Coordinate, Fix, Trip } from '../domain/types';
import { toFix } from '../services/tracking';
import { TrailMap } from './TrailMap';
import { Button } from './components';
import { styles as s } from './theme';
export function StartGuide({ reference, destination, onReady }: { reference?: Trip; destination?: { id: string; point: Coordinate; saved: boolean }; onReady: (ready: boolean) => void }) {
  const [active, setActive] = useState(AppState.currentState === 'active');
  const arrivalArmed = useRef(true);
  useEffect(() => { arrivalArmed.current = true; }, [reference?.id, destination?.id]);
  useEffect(() => { const sub = AppState.addEventListener('change', state => setActive(state === 'active')); return () => sub.remove(); }, []);
  const [fix, setFix] = useState<Fix | null>(null), [now, setNow] = useState(Date.now());
  const [error, setError] = useState<string | null>(null), [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!active) { setFix(null); onReady(false); return; }
    let mounted = true, watcher: Location.LocationSubscription | undefined;
    setFix(null); setError(null); onReady(false);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    void (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Tillat nøyaktig posisjon for å finne startpunktet.');
      if (!mounted) return;
      watcher = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 0 }, p => { if (mounted) { setFix(toFix(p)); setNow(Date.now()); } });
      if (!mounted) watcher.remove();
    })().catch(e => { if (mounted) setError(e.message); });
    return () => { mounted = false; watcher?.remove(); clearInterval(timer); onReady(false); };
  }, [reference?.id, destination?.id, destination?.point.latitude, destination?.point.longitude, retry, onReady, active]);
  const gate = reference ? startGate(reference, fix, now) : startPointGate(destination?.point, fix, now);
  useEffect(() => onReady(active && gate.ready), [active, gate.ready, onReady]);
  useEffect(() => {
    if (!active) return;
    if (gate.ready && arrivalArmed.current) {
      arrivalArmed.current = false;
      Vibration.vibrate([0, 180, 100, 180]);
    } else if (fix && fix.accuracy <= 20 && now - fix.timestamp <= 15000 && fix.timestamp <= now + 2000 && gate.meters !== null && gate.meters > 45) {
      // Hysteresis prevents repeated buzzes from jitter at the 25 m boundary.
      arrivalArmed.current = true;
    }
  }, [active, gate.ready, gate.meters, fix, now]);
  return <View style={s.card}><Text style={s.subheading}>Først: finn startpunktet</Text>
    <Text accessibilityLiveRegion="polite" style={s.body}>{error ?? (!active ? 'Åpne Tråkk for å sjekke startsonen.' : gate.message)}</Text>
    <TrailMap reference={reference?.points} focus={gate.start} position={fix} startPosition={gate.start} guideStart height={240} />
    {destination && !destination.saved && <Text style={s.small}>Foreslått start ved et endepunkt i kartdataene. Adkomsten er ikke bekreftet.</Text>}
    <Text style={s.small}>Blå DU er deg. START er begynnelsen. Turklokken starter først når du er innen 25 meter og trykker Start. Tråkk vibrerer når startsonen er nådd mens appen er åpen. Gåturen bort til start blir ikke registrert.</Text>
    {error && <Button secondary title="Prøv GPS igjen" onPress={() => setRetry(n => n + 1)} />}
    {gate.start && <Button secondary title="Åpne gangvei i Google Maps" onPress={() => { const p = gate.start!; void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}&travelmode=walking`).catch(() => setError('Kunne ikke åpne kartappen. Bruk START-markøren i kartet over.')); }} />}
  </View>;
}
