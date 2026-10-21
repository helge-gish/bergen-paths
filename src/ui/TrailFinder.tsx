import { useEffect, useMemo, useState } from 'react';
import { AppState, Linking, Pressable, Text, View } from 'react-native';
import * as Location from 'expo-location';
import type { Discovery } from '../domain/discoveries';
import type { Coordinate, Fix, Trail, Trip } from '../domain/types';
import { nearbyTrails, trailChoices, cameraStreetChoices, cameraChoicesNear, cameraPlaceType, type NearbyTrail } from '../domain/trailFinder';
import { freshPosition } from '../domain/position';
import { shortDistance } from '../domain/metrics';
import { getStore } from '../data/native';
import { toFix } from '../services/tracking';
import { TrailCamera } from './TrailCamera';
import { TrailMap } from './TrailMap';
import { Button } from './components';
import { colors, styles as s } from './theme';

export function TrailFinder({ items, trails, trips, current, segmentStart, busy, onRefresh, onMap, onStart, onGhost }: {
  items: Discovery[]; trails: Trail[]; trips: Trip[]; current: Fix[] | undefined; segmentStart?: Coordinate | null; busy: boolean; onRefresh: () => void;
  onMap: (target: NearbyTrail) => void; onStart?: (target: NearbyTrail) => void; onGhost?: (trail: Trail) => void;
}) {
  const [position, setPosition] = useState<Fix | null>(() => {
    const p = getStore().lastPosition();
    return p ? { ...p, speed: null, altitude: null, altitudeAccuracy: null } : null;
  });
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [error, setError] = useState<string | null>(null), [retry, setRetry] = useState(0);
  const [mode, setMode] = useState<'map' | 'camera'>('map');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const sub = AppState.addEventListener('change', state => setActive(state === 'active')); return () => sub.remove(); }, []);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer);
  }, [active]);
  useEffect(() => {
    if (!active) return;
    let cancelled = false, watch: Location.LocationSubscription | undefined;
    setError(null);
    (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (!permission.granted) throw new Error('Tillat nøyaktig posisjon for å finne stier rundt deg.');
      watch = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 0 }, value => {
        if (!cancelled) { setPosition(toFix(value)); setNow(Date.now()); }
      });
      if (cancelled) watch.remove();
    })().catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Kunne ikke finne posisjonen.'); });
    return () => { cancelled = true; watch?.remove(); };
  }, [active, retry]);
  const choices = useMemo(() => trailChoices(items, trails), [items, trails]);
  const cameraChoices = useMemo(() => [...choices, ...cameraStreetChoices(items)], [choices, items]);
  const nearby = useMemo(() => position ? nearbyTrails(cameraChoices, position) : [], [cameraChoices, position]);
  const listed = mode === 'camera' ? nearby : nearby.filter(target => target.item.kind !== 'street');
  const selected = nearby.find(item => item.id === selectedId) ?? null;
  useEffect(() => { if (selectedId && !selected) { setSelectedId(null); setDetailsOpen(false); } }, [selectedId, selected]);
  const live = freshPosition(position, now) && position!.accuracy <= 25;
  const selectionDetails = selected && <View style={[s.card, { borderColor: colors.coral }]}>
      <Text style={s.small}>{cameraPlaceType(selected)}</Text><Text accessibilityRole="header" style={s.subheading}>{selected.name}</Text><Text style={s.small}>{shortDistance(selected.meters)} til nærmeste kartlagte punkt · luftlinje</Text>
      <TrailInfo target={selected} />
      {onStart && <Button title={selected.item.kind === 'street' ? 'Velg gate og start tur' : 'Velg sti og start tur'} onPress={() => onStart(selected)} />}
      <Button secondary title="Vis på kartet" onPress={() => onMap(selected)} />
      {selected.saved && onGhost && <Button secondary icon="ghost" title="Gå strekket med skygge" onPress={() => onGhost(selected.saved!)} />}
      <Pressable accessibilityRole="button" onPress={() => { setSelectedId(null); setDetailsOpen(false); }} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={s.small}>Fjern valg</Text></Pressable>
    </View>;
  const select = (target: NearbyTrail) => { setSelectedId(target.id); setDetailsOpen(true); };
  return <View style={{ gap: 16 }}>
    <Text style={s.body}>Finn en sti i nærheten og start turen derfra.</Text>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {(['map', 'camera'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: mode === value }} onPress={() => setMode(value)} style={[s.chip, { backgroundColor: mode === value ? colors.ink : colors.pale }]}><Text style={[s.chipText, { color: mode === value ? colors.paper : colors.ink }]}>{value === 'map' ? 'Kart' : 'Kamera · AR'}</Text></Pressable>)}
    </View>
    {mode === 'map'
      ? <TrailMap trips={trips} current={current} segmentStart={segmentStart} position={position} positionStale={!live} focus={selected?.coordinate ?? position} selectedDiscovery={selected?.item} discoveries={items} height={340} />
      : <TrailCamera active={active} position={position} targets={cameraChoicesNear(nearby, selectedId)} selected={selected} details={selectionDetails} detailsOpen={detailsOpen} onCloseDetails={() => setDetailsOpen(false)} now={now} onSelect={select} onRetryGps={() => setRetry(value => value + 1)} />}
    {error && <View style={s.notice}><Text style={s.body}>{error}</Text><Button secondary title="Prøv GPS igjen" onPress={() => setRetry(value => value + 1)} /><Button secondary title="Åpne tillatelser" onPress={() => void Linking.openSettings()} /></View>}
    {mode === 'map' && !live && !error && <Text style={s.small}>{position ? 'Viser stier ved sist kjente posisjon. Venter på fersk GPS.' : 'Finner posisjonen din …'}</Text>}
    {mode === 'map' && selectionDetails}
    <Text style={s.subheading}>{mode === 'camera' ? 'Stier og gater nær deg' : 'Stier nær deg'}</Text>
    {listed.slice(0, 12).map(target => <Pressable key={target.id} accessibilityRole="button" accessibilityLabel={`Velg ${target.name}`} accessibilityState={{ selected: target.id === selectedId }} onPress={() => select(target)} style={[s.card, { padding: 14, borderColor: target.id === selectedId ? colors.coral : colors.pale }]}>
      <Text style={s.subheading}>{target.name}</Text><Text style={s.small}>{shortDistance(target.meters)} i luftlinje · {target.saved ? 'Ditt strekk' : target.item.kind === 'street' ? 'Gate · orienteringspunkt' : target.item.kind === 'steps' ? 'Kartlagt trapp' : 'Kartlagt sti'}</Text>
    </Pressable>)}
    {position && !listed.length && <Text style={s.body}>Ingen treff i de nedlastede kartdataene innen 3 km. Hent kartdata for området rundt deg.</Text>}
    <Button secondary title={busy ? 'Henter stier …' : 'Hent stier rundt meg'} onPress={onRefresh} disabled={busy || !live} />
    <Text style={s.small}>Avstanden er i luftlinje, ikke en anbefalt vei gjennom terrenget. Listen bruker OpenStreetMap og egne strekk. Merkede fotruter fra Kartverket vises som et eget lag på kartet.</Text>
  </View>;
}

function TrailInfo({ target }: { target: NearbyTrail }) {
  const f = target.facts;
  return <View style={{ gap: 8 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      <View style={[s.chip, { backgroundColor: colors.pale }]}><Text style={s.chipText}>{shortDistance(f.length)}</Text><Text style={s.small}>{f.saved ? 'Lagret strekk' : 'Kartlagte deler'}</Text></View>
      <View style={[s.chip, { backgroundColor: colors.pale }]}><Text style={s.chipText}>{f.ascent === null ? 'Ukjent' : `↑ ${Math.round(f.ascent)} m · ↓ ${Math.round(f.descent!)} m`}</Text><Text style={s.small}>Høydemeter{f.ascent !== null ? ' · GPS-estimat' : ''}</Text></View>
    </View>
    {target.item.kind !== 'street' && <Text style={s.body}>Vanskelighetsgrad: {f.grade ?? 'Ikke registrert'}{f.partialGrade ? ' · delvis gradert' : ''}</Text>}
    {f.grade && <Text style={s.small}>SAC-grad fra OpenStreetMap, høyeste registrerte grad blant delene. Dette er ikke norsk fargegradering.</Text>}
    <Text style={s.small}>{f.saved ? 'Lengde og høyde gjelder ditt lagrede spor, i retningen det ble gått.' : target.item.kind === 'street' ? 'Lengden gjelder kartlagte deler av gaten.' : 'Lengden er summen av tilgjengelige stideler, ikke nødvendigvis en sammenhengende tur fra start til mål.'}{f.hasGaps ? ' Sporet har GPS-hull; lengde og høyde kan være ufullstendige.' : ''}</Text>
  </View>;
}
