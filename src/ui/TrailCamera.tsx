import { useEffect, useState, type ReactNode } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import { requireOptionalNativeModule } from 'expo';
import type { Fix } from '../domain/types';
import { cameraTarget, cameraPositionReady, cameraHeadingFresh, cameraPlaceType, type CameraHeading, type NearbyTrail } from '../domain/trailFinder';
import { freshPosition, usablePosition } from '../domain/position';
import { shortDistance } from '../domain/metrics';
import { Button } from './components';
import { styles as s } from './theme';
import { ReadingPanel, ReadingButton } from './ReadingPanel';
import { GroundCamera, installGroundAr } from './GroundCamera';
import { groundGuide, type GroundState } from '../domain/groundAr';

const headingSensor = requireOptionalNativeModule<{
  start(latitude: number, longitude: number, altitude: number): Promise<boolean>;
  stop(): Promise<void>;
  addListener(name: 'heading', listener: (heading: CameraHeading) => void): { remove(): void };
}>('TrakkCameraHeading');

type CameraProps = { active: boolean; position: Fix | null; targets: NearbyTrail[]; now: number; onSelect: (target: NearbyTrail) => void; onRetryGps: () => void;
  selected?: NearbyTrail | null; details?: ReactNode; detailsOpen?: boolean; onCloseDetails?: () => void;
};
export function TrailCamera(props: CameraProps) {
  const [attempt, setAttempt] = useState(0);
  const [full, setFull] = useState(false);
  const session = <TrailCameraSession key={attempt} {...props} onSelect={target => { setFull(true); props.onSelect(target); }} fullscreen={full} onRetry={() => setAttempt(value => value + 1)} />;
  return <View style={{ gap: 8 }}>
    <Pressable accessibilityRole="button" accessibilityLabel="Åpne kamera i fullskjerm" onPress={() => setFull(true)} style={{ alignSelf: 'flex-end', minHeight: 44, padding: 10 }}><Text style={s.chipText}>Fullskjerm ⛶</Text></Pressable>
    {!full ? session : <View style={{ height: 380 }} />}
    {full && <Modal visible hardwareAccelerated animationType="fade" onRequestClose={() => setFull(false)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#102A24' }}>
        <View style={{ flex: 1 }}>
        {session}
        <Pressable accessibilityRole="button" accessibilityLabel="Minimer kameraet" onPress={() => setFull(false)} style={{ position: 'absolute', zIndex: 10, top: 8, right: 8, minHeight: 44, padding: 12, borderRadius: 12, backgroundColor: '#F7F5EEF2' }}><Text style={s.chipText}>Minimer ↙</Text></Pressable>
        </View>
      </SafeAreaView>
    </Modal>}
  </View>;
}

function TrailCameraSession({ fullscreen, onRetry, active, position, targets, now, onSelect, onRetryGps, selected, details, detailsOpen, onCloseDetails }: CameraProps & { fullscreen: boolean; onRetry: () => void }) {
  const [permission, requestPermission, refreshPermission] = useCameraPermissions();
  useEffect(() => { if (active) void refreshPermission(); }, [active, refreshPermission]);
  const [ground, setGround] = useState<GroundState | null>(null);
  const [showStatus, setShowStatus] = useState(false);
  const [heading, setHeading] = useState<CameraHeading | null>(null);
  const [sensorError, setSensorError] = useState<string | null>(null);
  const [sensorAttempt, setSensorAttempt] = useState(0);
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
  const live = cameraPositionReady(position, now);
  const guide = !active || detailsOpen ? null : groundGuide(selected, heading, position, now);
  const anchored = !!guide && ground?.state === 'anchored' && ground.targetId === guide.id;
  const grounding = !!guide && !!ground && ['anchored', 'surface', 'tracking', 'searching'].includes(ground.state);
  const hasCoordinates = !!position && Number.isFinite(position.latitude) && Math.abs(position.latitude) <= 90 && Number.isFinite(position.longitude) && Math.abs(position.longitude) <= 180;
  // Location is only a coarse reference for magnetic declination. Keep the
  // sensor alive through stale/imprecise GPS; gate directional labels separately.
  useEffect(() => {
    setHeading(null);
    if (!active || !permission?.granted || !hasCoordinates || !position) return;
    if (!headingSensor) { setSensorError('Kameraretning støttes ikke på denne enheten. Bruk kartet.'); return; }
    let cancelled = false;
    setSensorError(null);
    const listener = headingSensor.addListener('heading', value => { if (!cancelled) setHeading(value); });
    void headingSensor.start(position.latitude, position.longitude, Number.isFinite(position.altitude) ? position.altitude! : 0).then(ok => {
      if (cancelled) return;
      if (!ok) setSensorError('Telefonen mangler retningssensor. Bruk kartet.');
    }).catch(() => { if (!cancelled) setSensorError('Kunne ikke lese kameraretningen. Bruk kartet.'); });
    return () => { cancelled = true; listener.remove(); void headingSensor?.stop().catch(() => {}); };
  }, [active, permission?.granted, hasCoordinates, sensorAttempt]);
  if (!permission?.granted) return <View style={s.card}><Text style={s.subheading}>Se stiene gjennom kameraet</Text><Text style={s.body}>Retning og navn legges over kamerabildet. Ingen bilder eller lyd tas opp.</Text><Button title={permission?.canAskAgain === false ? 'Åpne kameratillatelse' : 'Tillat kamera'} onPress={() => permission?.canAskAgain === false ? void Linking.openSettings() : void requestPermission().catch(() => setCameraError('Kunne ikke be om kameratilgang.'))} />{cameraError && <Text style={s.small}>{cameraError}</Text>}</View>;
  const directional = targets.map(target => ({ target, screen: cameraTarget(target, heading, position, now) }));
  directional.sort((a, b) => Number(b.target.id === selected?.id) - Number(a.target.id === selected?.id));
  const selectedScreen = selected ? cameraTarget(selected, heading, position, now) : null;
  const hasCloseTarget = targets.some(target => target.meters < Math.max(8, position?.accuracy ?? 8));
  const visible = directional.filter(item => item.screen?.visible).slice(0, hasCloseTarget ? 2 : 3);
  const behind = directional.find(item => item.screen && !item.screen.visible);
  const headingFresh = cameraHeadingFresh(heading, now);
  const approximate = heading?.quality === 'approximate';
  const status = grounding ? (anchored ? 'Pil festet i underlaget · omtrentlig retning mot målet.' : ground?.reason) : !live ? 'Venter på fersk, nøyaktig GPS …' : sensorError ?? (!headingFresh ? 'Finner kameraretningen …'
    : !heading!.reliable ? 'Retningen er usikker. Nærliggende steder vises uten retning.'
      : Math.abs(heading.pitch) > 55 ? 'Løft mobilen og pek mot horisonten.'
        : selected ? selectedScreen ? (selectedScreen.visible ? `${approximate ? 'Omtrentlig retning' : 'Klar'} · ${selected.name} er foran deg.` : `Snu mot ${selectedScreen.delta < 0 ? 'venstre' : 'høyre'} for ${selected.name}.`) : 'Valgt sted er innenfor GPS-usikkerheten. Se plasseringen på kartet.'
        : visible.length ? (approximate ? 'Omtrentlig retning · trykk på et navn for å velge.' : null)
          : behind ? `${approximate ? 'Omtrentlig retning' : 'Klar'} · snu mot ${behind.screen!.delta < 0 ? 'venstre' : 'høyre'} for flere steder.`
            : targets.length ? 'Klar · nærmeste sted er innenfor GPS-usikkerheten.' : 'Klar · ingen stier eller gater i kartdataene her.');
  const fallback = !visible.length ? targets.slice(0, 3) : targets.filter(target => target.meters < Math.max(8, position?.accuracy ?? 8)).slice(0, 1);
  const gpsStatus = usablePosition(position) ? `${live ? 'GPS: klar' : freshPosition(position, now) ? 'GPS: upresis' : 'GPS: sist kjent'} · ±${Math.ceil(position.accuracy)} m · ${Math.max(0, Math.floor((now - position.timestamp) / 1000))} s siden` : 'GPS: venter på posisjon';
  const compassStatus = sensorError ? 'Kompass: utilgjengelig' : !headingFresh ? 'Kompass: venter' : heading!.reliable ? (approximate ? 'Kompass: omtrentlig retning' : 'Kompass: klart') : 'Kompass: usikkert';
  const compactStatus = anchored ? 'Pil festet · lokal retning' : grounding ? 'Sporer underlaget' : !active ? 'Pauset' : cameraError ? 'Kamerafeil' : !cameraReady ? 'Åpner kamera …' : !live ? 'GPS usikker' : sensorError ? 'Kompass utilgjengelig' : !headingFresh ? 'Venter på kompass' : !heading!.reliable ? 'Kompass usikkert' : Math.abs(heading!.pitch) > 55 ? 'Løft mobilen' : selectedScreen && !selectedScreen.visible ? (selectedScreen.delta < 0 ? '← Snu mot venstre' : 'Snu mot høyre →') : approximate ? 'Omtrentlig retning' : 'Klar';
  const sensorDetails = heading ? `${heading.source === 'magnetic' ? 'Magnetisk kompass' : 'Rotasjonssensor'} · Android-status ${heading.accuracy ?? 'ukjent'}${heading.errorDegrees != null ? ` · ±${Math.round(heading.errorDegrees)}°` : ''} · ${Math.max(0, Math.floor((now - heading.timestamp) / 1000))} s siden${heading.magneticMicrotesla != null ? `\nMagnetfelt: ${Math.round(heading.magneticMicrotesla)} µT · status ${heading.magneticAccuracy ?? 'ukjent'}` : ''}` : 'Ingen retningsmåling mottatt.';
  return <View style={{ gap: fullscreen ? 0 : 10, ...(fullscreen ? { flex: 1 } : {}) }}><View collapsable={false} onLayout={e => { const { width, height } = e.nativeEvent.layout; setSize({ width, height: height || 380 }); }} style={{ ...(fullscreen ? { flex: 1, minHeight: 120 } : { height: 380 }), borderRadius: fullscreen ? 0 : 20, overflow: 'hidden', backgroundColor: '#172821' }}>
    {active && width > 0 && !cameraError && <GroundCamera active={active} guide={guide} style={{ width, height }} onGroundState={value => { setGround(value); if (!value.ready) setCameraReady(false); }} onReady={() => { setCameraReady(true); setCameraError(null); }} onError={() => setCameraError('Kameraet kunne ikke åpnes. Prøv igjen eller sjekk kameratilgangen.')} />}
    <View collapsable={false} pointerEvents="box-none" accessibilityElementsHidden={!!detailsOpen} importantForAccessibility={detailsOpen ? 'no-hide-descendants' : 'auto'} style={[StyleSheet.absoluteFillObject, { zIndex: 2 }]}>

    {selected && !detailsOpen && <Pressable accessibilityRole="button" accessibilityLabel={`Vis info om ${selected.name}`} onPress={() => onSelect(selected)} style={{ position: 'absolute', top: fullscreen ? 60 : 8, left: 8, right: 8, minHeight: 44, padding: 10, borderRadius: 12, backgroundColor: '#F7F5EEF5' }}><Text numberOfLines={1} style={s.chipText}>Valgt: {selected.name} · Info</Text></Pressable>}
    <View pointerEvents="none" style={{ position: 'absolute', left: '49%', top: '45%' }}><Text style={{ color: 'white', fontSize: 30 }}>+</Text></View>
    {active && cameraReady && !cameraError && visible.filter(item => !anchored || item.target.id !== selected?.id).map(({ target, screen }, i) => {
      const chosen = target.id === selected?.id;
      const anchorX = Math.max(12, Math.min(width - 12, screen!.fraction * width));
      const top = (selected ? (fullscreen ? 114 : 66) : (fullscreen ? 64 : 16)) + i * 94;
      const cardWidth = Math.min(190, width - 48);
      const left = i % 2 ? Math.max(8, width - cardWidth - 8) : 8;
      const anchorY = Math.min(height - (hasCloseTarget ? 118 : 24), top + 116);
      const tint = chosen || approximate ? '#F4D796' : target.item.kind === 'street' ? '#DFE8E4' : '#94F4DC';
      return <View key={target.id} pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
        <Svg pointerEvents="none" width={width} height={height} style={StyleSheet.absoluteFillObject}>
          <Polyline testID={`${approximate ? 'approximate-callout' : 'callout'}-${target.id}`} points={`${left + cardWidth / 2},${top + 78} ${left + cardWidth / 2},${top + 88} ${anchorX},${anchorY}`} fill="none" stroke="#102A24" strokeWidth={4} />
          <Polyline points={`${left + cardWidth / 2},${top + 78} ${left + cardWidth / 2},${top + 88} ${anchorX},${anchorY}`} fill="none" stroke={tint} strokeWidth={2} strokeDasharray="5 5" />
          {approximate
            ? <Circle testID={`uncertainty-${target.id}`} cx={anchorX} cy={anchorY} r={18} fill="#F4D79618" stroke={tint} strokeWidth={1.5} strokeDasharray="3 5" />
            : <Circle cx={anchorX} cy={anchorY} r={7} fill="#102A24AA" stroke={tint} strokeWidth={2} />}
          <Polyline points={`${anchorX - 6},${anchorY - 9} ${anchorX},${anchorY} ${anchorX + 6},${anchorY - 9}`} fill="none" stroke={tint} strokeWidth={2.5} />
        </Svg>
        <Pressable accessibilityRole="button" accessibilityLabel={`Velg ${target.name}`} accessibilityState={{ selected: chosen }} onPress={() => onSelect(target)} style={{ position: 'absolute', left, top, width: cardWidth, minHeight: 78, borderRadius: 10, backgroundColor: '#102A24F2', borderLeftWidth: chosen ? 4 : 2, borderWidth: 1, borderColor: tint, padding: 9 }}>
          <Text numberOfLines={2} style={{ color: 'white', fontSize: 14, fontWeight: '700' }}>{target.name}</Text>
          <Text style={{ color: tint, fontSize: 12 }}>{shortDistance(target.meters)} · luftlinje</Text>
          <Text numberOfLines={1} style={{ color: '#DFE8E4', fontSize: 11, marginTop: 3 }}>{approximate ? '≈ Omtrentlig · ' : ''}{cameraPlaceType(target)}</Text>
        </Pressable>
      </View>;
    })}
    {active && cameraReady && !cameraError && !grounding && fallback.length > 0 && <View testID="camera-proximity" style={{ position: 'absolute', left: 10, right: 10, bottom: 10, padding: 10, borderRadius: 12, backgroundColor: '#F7F5EEF5', gap: 4 }}>
      <Text style={s.chipText}>{freshPosition(position, now) ? 'I nærheten · uten retningsplassering' : 'Ved sist kjente posisjon'}</Text>
      {fallback.map(target => <Pressable key={target.id} accessibilityRole="button" accessibilityLabel={`Velg ${target.name} fra nærlisten`} onPress={() => onSelect(target)} style={{ minHeight: 44, justifyContent: 'center', paddingVertical: 4 }}>
        <Text numberOfLines={1} style={s.subheading}>{target.name}</Text><Text style={s.small}>{cameraPlaceType(target)} · ca. {shortDistance(Math.round(target.meters / 10) * 10)} i luftlinje</Text>
      </Pressable>)}
    </View>}
    {active && cameraReady && grounding && !detailsOpen && <View pointerEvents="none" testID="ground-guide-status" style={{ position: 'absolute', bottom: 12, left: 12, right: 12, padding: 12, borderRadius: 12, backgroundColor: '#102A24ED' }}>
      <Text style={{ color: '#94F4DC', fontWeight: '700' }}>{anchored ? `Pil mot ${selected?.name}` : ground?.state === 'surface' ? 'Pek rolig mot bakken foran deg' : ground?.reason}</Text>
      <Text style={{ color: '#F4D796', fontSize: 12, marginTop: 4 }}>{anchored ? 'Festet i underlaget · retningen mot målet er omtrentlig' : 'Retningsvisning er tilgjengelig mens underlaget søkes'}</Text>
    </View>}
    </View>
    {fullscreen && !detailsOpen && <Pressable accessibilityRole="button" accessibilityLabel="Vis GPS- og kompasstatus" onPress={() => setShowStatus(value => !value)} style={{ position: 'absolute', top: 8, left: 8, right: 136, minHeight: 44, padding: 12, borderRadius: 12, backgroundColor: '#102A24ED', zIndex: 3 }}><Text numberOfLines={1} style={{ color: '#DAF5E9', fontWeight: '700' }}>{compactStatus} ⓘ</Text></Pressable>}
    {detailsOpen && selected && details && <View testID="camera-selection-details" style={[StyleSheet.absoluteFillObject, { zIndex: 3, backgroundColor: '#F7F5EE' }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Tilbake til kamera" onPress={onCloseDetails} style={{ minHeight: 56, padding: 12, paddingRight: fullscreen ? 136 : 12 }}><Text style={s.chipText}>← Kamera</Text></Pressable>
      <ReadingPanel><ReadingButton title="Vis retning i kamera" onPress={onCloseDetails ?? (() => {})} />{details}</ReadingPanel>
    </View>}
    </View>
    {(!fullscreen || (showStatus && !detailsOpen)) && <View accessibilityLiveRegion="polite" style={{ gap: 8, ...(fullscreen ? { position: 'absolute', top: 60, left: 8, right: 8, padding: 14, borderRadius: 12, backgroundColor: '#F7F5EE', zIndex: 5 } : {}) }}>
      <Text style={s.body}>{!active ? 'Kameraet er pauset.' : cameraError ?? (!cameraReady ? 'Åpner kameraet …' : status ?? 'Klar · trykk på et navn for å velge.')}</Text>
      {active && cameraReady && !cameraError && <Text style={s.small}>{gpsStatus}{'\n'}{compassStatus}{'\n'}{sensorDetails}</Text>}
      <Text style={s.small}>{anchored ? 'Lokal pil festet i underlaget. GPS og kompass gir omtrentlig retning mot målet.' : 'Retningsvisning · ikke en presis linje på bakken'}</Text>
      {ground && <Text style={s.small}>{ground.reason}</Text>}
      {ground?.state === 'install' && <Button secondary title="Aktiver bakkeankre" onPress={() => void installGroundAr().then(onRetry)} />}
      {ground?.state === 'unavailable' && <Button secondary title="Prøv bakkeankre igjen" onPress={onRetry} />}
      {active && cameraError && <Button secondary title="Prøv kamera igjen" onPress={onRetry} />}
      {active && cameraReady && !cameraError && !live && <Button secondary title="Oppdater GPS" onPress={onRetryGps} />}
      {active && cameraReady && !cameraError && (sensorError || !headingFresh || !heading?.reliable) && <Button secondary title="Prøv kompass igjen" onPress={() => setSensorAttempt(value => value + 1)} />}
      {cameraError && <Button secondary title="Åpne kameratillatelse" onPress={() => void Linking.openSettings()} />}
      {fullscreen && <Button secondary title="Lukk status" onPress={() => setShowStatus(false)} />}
    </View>}
  </View>;
}

