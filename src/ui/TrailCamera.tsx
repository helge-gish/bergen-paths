import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { requireOptionalNativeModule } from 'expo';
import type { Fix } from '../domain/types';
import { cameraTarget, type CameraHeading, type NearbyTrail } from '../domain/trailFinder';
import { usablePosition } from '../domain/position';
import { shortDistance } from '../domain/metrics';
import { Button } from './components';
import { styles as s } from './theme';

const headingSensor = requireOptionalNativeModule<{
  start(latitude: number, longitude: number, altitude: number): Promise<boolean>;
  stop(): Promise<void>;
  addListener(name: 'heading', listener: (heading: CameraHeading) => void): { remove(): void };
}>('TrakkCameraHeading');

export function TrailCamera(props: { active: boolean; position: Fix | null; targets: NearbyTrail[]; now: number; onSelect: (target: NearbyTrail) => void }) {
  const [attempt, setAttempt] = useState(0);
  const [full, setFull] = useState(false);
  const session = <TrailCameraSession key={attempt} {...props} fullscreen={full} onRetry={() => setAttempt(value => value + 1)} />;
  return <View style={{ gap: 8 }}>
    <Pressable accessibilityRole="button" accessibilityLabel="Åpne kamera i fullskjerm" onPress={() => setFull(true)} style={{ alignSelf: 'flex-end', minHeight: 44, padding: 10 }}><Text style={s.chipText}>Fullskjerm ⛶</Text></Pressable>
    {!full ? session : <View style={{ height: 380 }} />}
    {full && <Modal visible hardwareAccelerated animationType="fade" onRequestClose={() => setFull(false)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F5EE', paddingHorizontal: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 8 }}><Text style={s.subheading}>Finn sti · Kamera</Text><Pressable accessibilityRole="button" accessibilityLabel="Minimer kameraet" onPress={() => setFull(false)} style={{ minHeight: 44, padding: 12 }}><Text style={s.chipText}>Minimer ↙</Text></Pressable></View>
        {session}
      </SafeAreaView>
    </Modal>}
  </View>;
}

function TrailCameraSession({ fullscreen, onRetry, active, position, targets, now, onSelect }: { fullscreen: boolean; onRetry: () => void; active: boolean; position: Fix | null; targets: NearbyTrail[]; now: number; onSelect: (target: NearbyTrail) => void }) {
  const [permission, requestPermission, refreshPermission] = useCameraPermissions();
  useEffect(() => { if (active) void refreshPermission(); }, [active, refreshPermission]);
  const [heading, setHeading] = useState<CameraHeading | null>(null);
  const [sensorError, setSensorError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [size, setSize] = useState({ width: 0, height: 380 });
  const { width, height } = size;
  const [cameraReady, setCameraReady] = useState(false);
  useEffect(() => {
    setCameraReady(false); setCameraError(null);
  }, [active]);
  useEffect(() => {
    if (!active || !permission?.granted || width <= 0 || cameraReady || cameraError) return;
    const timeout = setTimeout(() => setCameraError('Kameraet svarte ikke. Prøv å åpne det igjen.'), 10000);
    return () => clearTimeout(timeout);
  }, [active, permission?.granted, width, cameraReady, cameraError]);
  const live = usablePosition(position) && position.accuracy <= 25 && now - position.timestamp <= 15000 && position.timestamp <= now + 5000;
  // Restart only when a camera session starts or reliable location becomes
  // available, not on every GPS fix or every sensor event.
  useEffect(() => {
    setHeading(null);
    if (!active || !permission?.granted || !live || !position) return;
    if (!headingSensor) { setSensorError('Kameraretning støttes ikke på denne enheten. Bruk kartet.'); return; }
    let cancelled = false;
    setSensorError(null);
    const listener = headingSensor.addListener('heading', value => { if (!cancelled) setHeading(value); });
    void headingSensor.start(position.latitude, position.longitude, position.altitude ?? 0).then(ok => {
      if (cancelled) return;
      if (!ok) setSensorError('Telefonen mangler retningssensor. Bruk kartet.');
    }).catch(() => { if (!cancelled) setSensorError('Kunne ikke lese kameraretningen. Bruk kartet.'); });
    return () => { cancelled = true; listener.remove(); void headingSensor?.stop().catch(() => {}); };
  }, [active, permission?.granted, live]);
  if (!permission?.granted) return <View style={s.card}><Text style={s.subheading}>Se stiene gjennom kameraet</Text><Text style={s.body}>Retning og navn legges over kamerabildet. Ingen bilder eller lyd tas opp.</Text><Button title={permission?.canAskAgain === false ? 'Åpne kameratillatelse' : 'Tillat kamera'} onPress={() => permission?.canAskAgain === false ? void Linking.openSettings() : void requestPermission().catch(() => setCameraError('Kunne ikke be om kameratilgang.'))} />{cameraError && <Text style={s.small}>{cameraError}</Text>}</View>;
  const directional = targets.map(target => ({ target, screen: cameraTarget(target, heading, position, now) }));
  const visible = directional.filter(item => item.screen?.visible).slice(0, 3);
  const behind = directional.find(item => item.screen && !item.screen.visible);
  const status = !live ? 'Venter på fersk, nøyaktig GPS …' : sensorError ?? (!heading || now - heading.timestamp > 2500 ? 'Finner kameraretningen …'
    : !heading.reliable ? 'Kompasset er usikkert. Beveg mobilen rolig i et åttetall.'
      : Math.abs(heading.pitch) > 55 ? 'Løft mobilen og pek mot horisonten.'
        : targets[0]?.meters < 8 ? 'Du er ved stien. Se deg rundt.'
          : !visible.length ? behind ? `Snu mot ${behind.screen!.delta < 0 ? 'venstre' : 'høyre'} for å se stien` : 'Pek rundt deg for å finne en sti' : null);
  return <View style={{ gap: 10, ...(fullscreen ? { flex: 1 } : {}) }}><View collapsable={false} onLayout={e => { const { width, height } = e.nativeEvent.layout; setSize({ width, height: height || 380 }); }} style={{ ...(fullscreen ? { flex: 1, minHeight: 120 } : { height: 380 }), borderRadius: 20, overflow: 'hidden', backgroundColor: '#172821' }}>
    {active && width > 0 && !cameraError && <CameraView style={{ width, height }} facing="back" mode="picture" mute onCameraReady={() => { setCameraReady(true); setCameraError(null); }} onMountError={() => setCameraError('Kameraet kunne ikke åpnes. Prøv igjen eller sjekk kameratilgangen.')} />}
    <View collapsable={false} pointerEvents="box-none" style={[StyleSheet.absoluteFillObject, { zIndex: 2 }]}>

    <View pointerEvents="none" style={{ position: 'absolute', left: '49%', top: '45%' }}><Text style={{ color: 'white', fontSize: 30 }}>+</Text></View>
    {cameraReady && !status && !cameraError && visible.map(({ target, screen }, i) => <Pressable key={target.id} accessibilityRole="button" accessibilityLabel={`Velg ${target.name}`} onPress={() => onSelect(target)} style={{ position: 'absolute', left: Math.max(8, Math.min(width - 168, screen!.fraction * width - 80)), top: 30 + i * Math.min(88, Math.max(0, (height - 120) / 3)), width: 160, borderRadius: 12, backgroundColor: '#183D32ED', borderWidth: 1, borderColor: 'white', padding: 9 }}>
      <Text numberOfLines={2} style={{ color: 'white', fontWeight: '700' }}>{target.name}</Text><Text style={{ color: '#E9EDE2', fontSize: 12 }}>{shortDistance(target.meters)} · luftlinje</Text><Text numberOfLines={1} style={{ color: '#F4D796', fontSize: 11, marginTop: 3 }}>{shortDistance(target.facts.length)} {target.saved ? 'strekk' : 'kartlagt'}{target.facts.ascent !== null ? ` · ↑${Math.round(target.facts.ascent)} m` : ''}</Text>
    </Pressable>)}
    </View>
    </View>
    <View accessibilityLiveRegion="polite" style={{ gap: 8 }}>
      <Text style={s.body}>{!active ? 'Kameraet er pauset.' : cameraError ?? (!cameraReady ? 'Åpner kameraet …' : status ?? 'Trykk på et stinavn for å velge.')}</Text>
      <Text style={s.small}>Retningsvisning · ikke en presis linje på bakken</Text>
      {active && <Button secondary title="Prøv kamera igjen" onPress={onRetry} />}
      {cameraError && <Button secondary title="Åpne kameratillatelse" onPress={() => void Linking.openSettings()} />}
    </View>
  </View>;
}

