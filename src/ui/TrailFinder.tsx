import {startPointGate} from '../domain/startGate';
import {speak} from '../services/voice';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, Pressable, Text, View } from 'react-native';
import * as Location from 'expo-location';
import type { Discovery } from '../domain/discoveries';
import type { Coordinate, Fix, Trail, Trip } from '../domain/types';
import { nearbyTrails, trailStart, targetAtStart, trailChoices, cameraStreetChoices, cameraChoicesNear, cameraPlaceType, type NearbyTrail } from '../domain/trailFinder';
import { freshPosition } from '../domain/position';
import { shortDistance } from '../domain/metrics';
import { getStore } from '../data/native';
import { toFix } from '../services/tracking';
import { ReadingText, ReadingButton } from './ReadingPanel';
import { TrailCamera } from './TrailCamera';
import { TrailMap } from './TrailMap';
import { Button } from './components';
import { colors, styles as s } from './theme';

export function TrailFinder({ items, trails, trips, current, segmentStart, busy, onRefresh, onMap, onStart, onGhost, initialTargetId, recording = true, embedded = false }: {
  recording?: boolean; initialTargetId?: string | null; embedded?: boolean; items: Discovery[]; trails: Trail[]; trips: Trip[]; current: Fix[] | undefined; segmentStart?: Coordinate | null; busy: boolean; onRefresh: () => void;
  onMap: (target: NearbyTrail) => void; onStart?: (target: NearbyTrail) => void; onGhost?: (trail: Trail) => void;
}) {
  const [position, setPosition] = useState<Fix | null>(() => {
    const p = getStore().lastPosition();
    return p ? { ...p, speed: null, altitude: null, altitudeAccuracy: null } : null;
  });
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [error, setError] = useState<string | null>(null), [retry, setRetry] = useState(0);
  const [mode, setMode] = useState<'map' | 'camera'>(embedded ? 'camera' : 'map');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [guide,setGuide]=useState<{id:string;point:Coordinate}|null>(null);const arrived=useRef(false);
  const initialHandled=useRef<string|null>(null);
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
  const nearby = useMemo(() => position ? nearbyTrails(cameraChoices, position, 5000) : [], [cameraChoices, position]);
  const listed = mode === 'camera' ? nearby : nearby.filter(target => target.item.kind !== 'street');
  useEffect(()=>{if(!initialTargetId||initialHandled.current===initialTargetId)return;const match=nearby.find(t=>t.id===initialTargetId||t.memberIds?.includes(initialTargetId));if(match){initialHandled.current=initialTargetId;setSelectedId(match.id);setDetailsOpen(true);}},[initialTargetId,nearby]);
  const selected = nearby.find(item => item.id === selectedId) ?? null;
  useEffect(() => { if (selectedId && !selected && position) { setSelectedId(null); setDetailsOpen(false); setGuide(null); } }, [selectedId, selected]);
  const guided=guide&&selected&&guide.id===selected.id&&position?targetAtStart(selected,guide.point,position):null;
  const gate=startPointGate(guide?.point,position,now);
  useEffect(()=>{if(!guided||!gate.ready||arrived.current)return;arrived.current=true;if(getStore().setting('trailVoice',true))void speak(`Du er ved starten av ${selected!.name}. ${recording?'Gå inn på stien eller strekket, så måles passeringen automatisk.':'Trykk Start tur i Utforsk hvis du vil registrere passeringen.'}`);},[guided?.id,gate.ready]);
  const beginGuide=()=>{if(!selected)return;const point=trailStart(selected);if(!point)return;arrived.current=false;setGuide({id:selected.id,point});setDetailsOpen(false);setMode('camera');};
  const live = freshPosition(position, now) && position!.accuracy <= 25;
  const selectionDetails = selected && <View style={[s.card, { borderColor: colors.coral }]}>
      <ReadingText style={s.small}>{cameraPlaceType(selected)}</ReadingText><ReadingText accessibilityRole="header" style={s.subheading}>{selected.name}</ReadingText><ReadingText style={s.small}>{shortDistance(selected.meters)} unna · luftlinje</ReadingText>
      <TrailInfo target={selected} />
      <ReadingButton title="Finn starten" onPress={beginGuide} />
      {onStart && <ReadingButton title={selected.item.kind === 'street' ? 'Velg gate og start tur' : 'Velg sti og start tur'} onPress={() => onStart(selected)} />}
      <ReadingButton secondary title="Vis på kartet" onPress={() => onMap(selected)} />
      {selected.saved && onGhost && <ReadingButton secondary icon="ghost" title="Gå strekket med skygge" onPress={() => onGhost(selected.saved!)} />}
      <Pressable accessibilityRole="button" onPress={() => { setSelectedId(null); setDetailsOpen(false); setGuide(null); }} style={{ minHeight: 44, justifyContent: 'center' }}><ReadingText style={s.small}>Fjern valg</ReadingText></Pressable>
    </View>;
  const select = (target: NearbyTrail) => { if(target.id!==selectedId)setGuide(null);setSelectedId(target.id); setDetailsOpen(true); };
  return <View style={{ gap: 16 }}>
    {!embedded && <Text style={s.body}>Finn en natursti eller et eget strekk.{recording?' Turen registreres.':' Start tur i Utforsk hvis du vil registrere hvor du går.'}</Text>}
    {!embedded && <View style={{ flexDirection: 'row', gap: 8 }}>
      {(['map', 'camera'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: mode === value }} onPress={() => setMode(value)} style={[s.chip, { backgroundColor: mode === value ? colors.ink : colors.pale }]}><Text style={[s.chipText, { color: mode === value ? colors.paper : colors.ink }]}>{value === 'map' ? 'Kart' : 'Kamera · AR'}</Text></Pressable>)}
    </View>}
    {mode === 'map'
      ? <TrailMap trips={trips} current={current} segmentStart={segmentStart} position={position} positionStale={!live} focus={selected?.coordinate ?? position} selectedDiscovery={selected?.item} discoveries={items} height={340} />
      : <TrailCamera active={active} position={position} targets={cameraChoicesNear(nearby, selectedId).map(t=>guided&&t.id===guided.id?guided:t)} selected={guided??selected} details={selectionDetails} detailsOpen={detailsOpen} onCloseDetails={() => setDetailsOpen(false)} now={now} onSelect={select} onRetryGps={() => setRetry(value => value + 1)} />}
    {guided&&<View style={s.notice}><Text accessibilityLiveRegion="polite" style={s.subheading}>{gate.ready?'✓ Du er ved start':`${shortDistance(guided.meters)} til start`}</Text><Text style={s.body}>{selected!.name}</Text><Text style={s.small}>{!live?'Venter på fersk GPS':gate.ready?recording?'Gå inn på stien eller strekket. Målingen starter automatisk.':'Start tur for å registrere passeringen.':'Følg pilen mot start · luftlinje.'}</Text><Button secondary title="Avslutt veivisning" onPress={()=>setGuide(null)} /></View>}
    {error && <View style={s.notice}><Text style={s.body}>{error}</Text><Button secondary title="Prøv GPS igjen" onPress={() => setRetry(value => value + 1)} /><Button secondary title="Åpne tillatelser" onPress={() => void Linking.openSettings()} /></View>}
    {mode === 'map' && !live && !error && <Text style={s.small}>{position ? 'Viser stier ved sist kjente posisjon. Venter på fersk GPS.' : 'Finner posisjonen din …'}</Text>}
    {mode === 'map' && selectionDetails}
    {!embedded && <><Text style={s.subheading}>{mode === 'camera' ? 'Stier og strekk nær deg' : 'Stier og strekk nær deg'}</Text>
    {listed.slice(0, 12).map(target => <Pressable key={target.id} accessibilityRole="button" accessibilityLabel={`Velg ${target.name}`} accessibilityState={{ selected: target.id === selectedId }} onPress={() => select(target)} style={[s.card, { padding: 14, borderColor: target.id === selectedId ? colors.coral : colors.pale }]}>
      <Text style={s.subheading}>{target.name}</Text><Text style={s.small}>{shortDistance(target.meters)} i luftlinje · {target.saved ? 'Ditt strekk' : target.item.kind === 'street' ? 'Gate · orienteringspunkt' : target.item.kind === 'steps' ? 'Kartlagt trapp' : 'Kartlagt sti'}</Text>
    </Pressable>)}
    </>}
    {position && !listed.length && <Text style={s.body}>Ingen treff i de nedlastede kartdataene innen 5 km. Hent kartdata for området rundt deg.</Text>}
    {(!embedded || !listed.length) && <Button secondary title={busy ? 'Henter stier …' : 'Hent stier rundt meg'} onPress={onRefresh} disabled={busy || !live} />}
    {!embedded && <Text style={s.small}>Avstanden er i luftlinje, ikke en anbefalt vei gjennom terrenget. Listen bruker OpenStreetMap og egne strekk. Merkede fotruter fra Kartverket vises som et eget lag på kartet.</Text>}
  </View>;
}

function TrailInfo({ target }: { target: NearbyTrail }) {
  const f = target.facts;
  return <View style={{ gap: 8 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      <View style={[s.chip, { backgroundColor: colors.pale, maxWidth: '100%', flexShrink: 1 }]}><ReadingText style={s.chipText}>{shortDistance(f.length)}</ReadingText><ReadingText style={s.small}>{f.saved ? 'Lagret strekk' : 'Kartlagte deler'}</ReadingText></View>
      {f.ascent!==null&&<View style={[s.chip, { backgroundColor: colors.pale, maxWidth: '100%', flexShrink: 1 }]}><ReadingText style={s.chipText}>↑ {Math.round(f.ascent)} m · ↓ {Math.round(f.descent!)} m</ReadingText><ReadingText style={s.small}>Høyde · GPS-estimat</ReadingText></View>}
    </View>
    {target.item.kind !== 'street' && f.grade && <ReadingText style={s.body}>{f.grade} · SAC{f.partialGrade ? ' · delvis gradert' : ''}</ReadingText>}
    <ReadingText style={s.small}>{f.saved?'Ditt lagrede spor.':'Lengde fra kartdata.'}{f.hasGaps?' GPS-hull · ufullstendig måling.':''}</ReadingText>
  </View>;
}
