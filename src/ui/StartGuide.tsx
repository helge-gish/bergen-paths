import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { startGate } from '../domain/startGate';
import type { Fix, Trip } from '../domain/types';
import { toFix } from '../services/tracking';
import { TrailMap } from './TrailMap';
import { Button } from './components';
import { styles as s } from './theme';
export function StartGuide({ reference, onReady }: { reference: Trip; onReady: (ready: boolean) => void }) {
  const [fix, setFix] = useState<Fix | null>(null), [now, setNow] = useState(Date.now());
  const [error, setError] = useState<string | null>(null), [retry, setRetry] = useState(0);
  useEffect(() => {
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
  }, [reference.id, retry, onReady]);
  const gate = startGate(reference, fix, now);
  useEffect(() => onReady(gate.ready), [gate.ready, onReady]);
  return <View style={s.card}><Text style={s.subheading}>Først: finn startpunktet</Text>
    <Text accessibilityLiveRegion="polite" style={s.body}>{error ?? gate.message}</Text>
    <TrailMap reference={reference.points} focus={gate.start} position={fix} startPosition={gate.start} guideStart height={240} />
    <Text style={s.small}>Blå DU er deg. START er begynnelsen. Turklokken starter først når du er innen 25 meter og trykker Start. Gåtur bort til start blir ikke registrert.</Text>
    {error && <Button secondary title="Prøv GPS igjen" onPress={() => setRetry(n => n + 1)} />}
    {gate.start && <Button secondary title="Vis gangvei til start" onPress={() => { const p = gate.start!; void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}&travelmode=walking`).catch(() => setError('Kunne ikke åpne kartappen. Bruk START-markøren i kartet over.')); }} />}
  </View>;
}
