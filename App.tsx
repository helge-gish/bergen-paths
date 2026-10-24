import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Image, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getStore } from './src/data/native';
import { automaticRecorder } from './src/services/automaticRecording';
import type { RecordingPreference } from './src/domain/automaticRecording';
import { fetchNatureMap } from './src/services/natureMap';
import { isNatureTrail } from './src/domain/nature';
import { movementTime } from './src/domain/natureTiming';
import { tripMetrics, durationLabel, kmLabel } from './src/domain/metrics';
import type { Discovery } from './src/domain/discoveries';
import type { Trip } from './src/domain/types';
import { activePeg } from './src/domain/activePeg';
import { trailChoices } from './src/domain/trailFinder';
import { useNearbyArea } from './src/ui/useNearbyArea';
import { useNatureTiming } from './src/ui/useNatureTiming';
import { TrailMap } from './src/ui/TrailMap';
import { TrailFinder } from './src/ui/TrailFinder';
import { ExploreSurface, type ExploreMode } from './src/ui/ExploreSurface';
import { WorkoutCard } from './src/ui/Workout';
import { workoutStatus } from './src/domain/workout';
import { syncWorkoutCoach, workoutAvailable } from './src/services/workoutCoach';
import { StretchResults } from './src/ui/StretchResults';
import { Button, Icon, Metric } from './src/ui/components';
import { RadiusPicker } from './src/ui/Goals';
import { exportLog } from './src/services/export';
import { colors, styles as s } from './src/ui/theme';

function snapshot() {
  const store = getStore();
  return { active: store.active(), trips: store.trips(), trails: store.trails(), items: store.setting<Discovery[]>('natureDiscoveries', []), preference: store.setting<RecordingPreference>('automaticRecording', 'unconfigured'), error: store.setting<string | null>('trackingError', null), limited: store.setting('automaticLimitReached', false) };
}
type Data = ReturnType<typeof snapshot>;
export function Trakk({ initial }: { initial: Data }) {
  const [data, setData] = useState(initial), [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState<'map' | 'log' | 'you'>('map');
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [mode, setMode] = useState<ExploreMode>('map');
  const [selected, setSelected] = useState<Discovery | null>(null), [detail, setDetail] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false), [loadingMap, setLoadingMap] = useState(false), [mapError, setMapError] = useState<string | null>(null);
  const [recenter, setRecenter] = useState(0), [mapRetry, setMapRetry] = useState(0);
  const running = useRef(false), mounted = useRef(true);
  const nearby = useNearbyArea();
  const refresh = useCallback(() => { if (mounted.current) { setData(snapshot()); setNow(Date.now()); } }, []);
  const act = useCallback(async (fn: () => unknown | Promise<unknown>) => {
    if (running.current) return;
    running.current = true; setBusy(true); setError(null);
    try { await fn(); } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : String(e)); }
    finally { running.current = false; if (mounted.current) { setBusy(false); refresh(); } }
  }, [refresh]);
  useEffect(() => {
    mounted.current = true;
    void act(() => automaticRecorder.ensure());
    const interval = setInterval(() => { if (AppState.currentState === 'active') refresh(); }, 2000);
    const sub = AppState.addEventListener('change', state => { if (state === 'active') { refresh(); void act(() => automaticRecorder.ensure()); } });
    return () => { mounted.current = false; clearInterval(interval); sub.remove(); };
  }, [act, refresh]);
  const center = nearby.area;
  const cell = center ? `${Math.round(center.latitude * 200)}:${Math.round(center.longitude * 200)}:${nearby.radius}` : '';
  const centerRef = useRef(center); centerRef.current = center;
  useEffect(() => {
    const point = centerRef.current; if (!point) return;
    const cache = getStore().setting<Record<string, number>>('natureMapFetched', {});
    if (!mapRetry && Date.now() - (cache[cell] ?? 0) < 86400000) return;
    const controller = new AbortController(); setLoadingMap(true); setMapError(null);
    void fetchNatureMap(point, nearby.radius, controller.signal).then(items => {
      if (controller.signal.aborted) return;
      const store = getStore(), merged = new Map(store.setting<Discovery[]>('natureDiscoveries', []).map(i => [i.id, i]));
      for (const item of items) merged.set(item.id, item);
      store.setSetting('natureDiscoveries', [...merged.values()]);
      store.setSetting('natureMapFetched', { ...store.setting('natureMapFetched', {}), [cell]: Date.now() });
      refresh();
    }).catch(e => { if (!controller.signal.aborted) setMapError(e instanceof Error ? e.message : String(e)); }).finally(() => { if (!controller.signal.aborted) setLoadingMap(false); });
    return () => controller.abort();
  }, [cell, nearby.radius, mapRetry, refresh]);
  const items = useMemo(() => data.items.filter(isNatureTrail), [data.items]);
  const timing = useNatureTiming(items, data.trails, data.trips, data.active);
  const metrics = useMemo(() => data.active ? tripMetrics(data.active, now) : null, [data.active, now]);
  const moving = useMemo(() => data.active ? movementTime(data.active) : 0, [data.active]);
  const trackPosition = metrics?.points.at(-1);
  const useTrack = !!trackPosition && trackPosition.timestamp >= (nearby.lastSeen ?? 0);
  const position = useTrack ? trackPosition : center ?? trackPosition;
  const stale = useTrack ? now - trackPosition!.timestamp > 30000 : !nearby.live;
  const window = data.active ? getStore().segmentWindow(data.active.id) : null;
  const peg = useMemo(() => data.active ? activePeg(data.active.startedAt, window?.from, metrics?.points ?? []) : null, [data.active?.id, window?.from, metrics?.points]);
  const latest = useMemo(() => timing.results.filter(r => data.active && r.startedAt >= data.active.startedAt), [timing.results, data.active?.startedAt]);
  const locate = () => { if (position && !stale) setRecenter(n => n + 1); else void act(async () => { await nearby.locate(); setRecenter(n => n + 1); }); };
  const pause = () => {
    // Pause is accepted even during an in-flight permission/start request.
    setBusy(true);
    void automaticRecorder.pause().catch(e => setError(String(e))).finally(() => { setBusy(false); refresh(); });
  };
  const workout = data.active?.workout;
  const workoutState = workout ? workoutStatus(workout, now) : null;
  const training = !!workout && workout.endedAt === null && !workoutState!.complete;
  const startTraining = () => { setTrainingOpen(false); void act(async () => {
    // Choosing the explicitly labelled training action can resume registration;
    // merely opening the selector never overrides a deliberate GPS pause.
    if (!getStore().active()) await automaticRecorder.enable();
    const current = getStore().active();
    if (!current) throw new Error('Registreringen kunne ikke starte.');
    const updated = getStore().startWorkout(current.id);
    await syncWorkoutCoach(updated);
  }); };
  const earned = new Set(timing.results.filter(r => r.source === 'nature').map(r => r.itemId)).size;
  return <SafeAreaView style={s.screen}><StatusBar style="dark" />
    <View style={[s.between, { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 16 }]}><View style={s.row}><View style={{ width: 38, height: 38, backgroundColor: colors.ink, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}><Image source={require('./assets/trakk-icon.png')} style={{ width: 38, height: 38, borderRadius: 12 }} /></View><Text style={{ fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -1.2 }}>tråkk<Text style={{ color: colors.coral }}>.</Text></Text></View></View>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" removeClippedSubviews={false}>
      {data.preference === 'unconfigured' && <View style={s.card}><Text style={s.heading}>Åpne Tråkk. Gå ut.</Text><Text style={s.body}>Tråkk registrerer når du åpner appen, også med låst skjerm. Stitider og egne strekk måles automatisk. Du kan alltid pause. GPS bruker batteri. Pause stopper registreringen helt.</Text><Button title="Tillat automatisk registrering" disabled={busy} onPress={() => void act(() => automaticRecorder.enable())} /><Text style={s.small}>Sporene blir på mobilen. Dette oppsettet gjøres én gang.</Text></View>}
      {(error || data.error) && <View style={s.notice}><Text style={s.body}>{error ?? data.error}</Text><Button secondary title="Prøv registrering igjen" disabled={busy} onPress={() => void act(() => automaticRecorder.ensure())} /><Button secondary title="Åpne tillatelser" onPress={() => void Linking.openSettings()} /></View>}
      {data.preference !== 'unconfigured' && <View style={[s.between, { flexWrap: 'wrap' }]}><View style={{ flex: 1 }}><Text style={s.subheading}>{busy ? 'Finner GPS …' : data.active ? '● Registrering på' : data.preference === 'paused' ? 'Registrering pauset' : data.limited ? '8 timer lagret · klar for mer' : 'Registrering venter'}</Text>{data.active && <Text style={s.small}>{stale ? 'Venter på fersk GPS' : 'Stitider måles automatisk'}</Text>}</View>{(data.preference === 'paused' || (!data.active && !busy)) ? <Button secondary title="Fortsett" disabled={busy} onPress={() => void act(() => automaticRecorder.enable())} /> : <Button secondary title="Pause" onPress={pause} />}</View>}
      {workoutAvailable && <Button secondary title={training ? `4×4 · ${workoutState!.paused ? 'pauset' : workoutState!.current?.label}` : 'Treningsmodus · fritt tempo'} onPress={() => setTrainingOpen(true)} />}
      {tab === 'map' && <>
        <RadiusPicker radius={nearby.radius} onRadius={nearby.setRadius} />
        <ExploreSurface mode={mode} onMode={setMode} enabled={!detail && !trainingOpen} map={<TrailMap onLocate={locate} locating={nearby.pending || busy} position={position} positionStale={stale} focus={position} recenter={recenter} discoveries={items} trips={data.trips} current={metrics?.points} segmentStart={peg?.point} selectedDiscovery={selected} height={350} />} camera={<TrailFinder embedded items={items} trails={data.trails} trips={data.trips} current={metrics?.points} segmentStart={peg?.point} busy={loadingMap} onRefresh={() => setMapRetry(n => n + 1)} onMap={target => { setSelected(target.item); setMode('map'); }} />} />
        {selected && <Pressable accessibilityRole="button" accessibilityLabel="Fjern kartvalg" onPress={() => setSelected(null)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={s.small}>{selected.name} · Lukk ×</Text></Pressable>}
        {mapError ? <View style={s.notice}><Text style={s.body}>{mapError}</Text><Button secondary title="Hent stier igjen" onPress={() => setMapRetry(n => n + 1)} disabled={loadingMap} /></View> : loadingMap ? <Text style={s.small}>Henter naturstier …</Text> : !items.length ? <Text style={s.body}>Ingen naturstier med tilstrekkelige kartdata her ennå. Prøv større radius. Asfalt og usikre gangforbindelser fremheves ikke.</Text> : null}
        {metrics && <View style={s.card}><View style={s.row}><Metric value={kmLabel(metrics.meters)} label="km registrert" /><Metric value={metrics.speedKmh === null ? '—' : metrics.speedKmh.toLocaleString('nb-NO', { maximumFractionDigits: 1 })} label="km/t nå" /><Metric value={metrics.hasElevation ? String(Math.round(metrics.ascent)) : '—'} label="høydemeter opp" /></View><Text style={s.small}>{durationLabel(moving)} i bevegelse · også adkomst til stiene</Text></View>}
        {data.active && <View style={s.card}><Text style={s.subheading}>Ditt strekk</Text><Text style={s.small}>{peg?.point ? `● Startmerke satt kl. ${new Date(peg.point.timestamp).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })} · vises på kartet` : 'Venter på første GPS-punkt'}</Text><Button secondary title="Sett start her" disabled={busy || !peg?.point || stale} onPress={() => void act(() => { getStore().setSegmentStart(data.active!.id); })} /><Button title="Lagre strekk hit" disabled={busy || !peg?.point || stale} onPress={() => void act(() => { const trail = getStore().clipSegment(data.active!.id); Alert.alert('Strekk lagret', `${trail.name}\nNeste gang du går her, måles tiden automatisk i begge retninger.`); })} /></View>}
        {!!latest.length && <StretchResults results={latest.slice(0, 5)} />}
      </>}
      {tab === 'log' && <>
        <Text style={s.heading}>Dine målinger</Text>
        {timing.pending && <Text style={s.small}>Oppdaterer stitider …</Text>}{timing.error && <Text style={s.body}>Stitider kunne ikke beregnes: {timing.error}</Text>}
        {!!timing.results.length && <StretchResults results={timing.results.slice(0, 20)} />}
        {!timing.results.length && <Text style={s.body}>Tider dukker opp når du går en kartlagt stidel eller et eget strekk fra ende til ende. Retningene måles hver for seg. GPS-hull gir ingen tid.</Text>}
        {data.trips.filter(trip => !trip.automatic || !!trip.workout || !!trip.workoutHistory?.length || tripMetrics(trip).meters >= 10).map(trip => <Pressable key={trip.id} accessibilityRole="button" onPress={() => setDetail(trip)} style={s.card}><Text style={s.subheading}>{trip.automatic ? new Date(trip.startedAt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long' }) : trip.name}</Text><Text style={s.small}>{kmLabel(tripMetrics(trip).meters)} km · {trip.automatic ? 'Automatisk registrering' : 'Tidligere tur'} →</Text></Pressable>)}
      </>}
      {tab === 'you' && <>
        <Text style={s.heading}>Dine stier</Text><View style={s.card}><Text style={s.heading}>{earned} stideler gått</Text><Text style={s.body}>{data.trails.length} egne strekk · {timing.results.length} målte gjennomføringer</Text><Text style={s.small}>Kartet kan dele samme navngitte sti i flere deler. Personlige tider sammenlignes innen samme del, geometri og retning.</Text></View>
        <View style={s.card}><Text style={s.subheading}>Personlige milepæler</Text>{[{ title: 'Første stitid', done: earned >= 1 }, { title: 'Fem stideler utforsket', done: earned >= 5 }, { title: 'Ti gjennomføringer', done: timing.results.length >= 10 }, { title: 'Ditt første strekk', done: data.trails.length >= 1 }].map(m => <Text key={m.title} style={s.body}>{m.done ? '✓' : '○'} {m.title}</Text>)}</View>
        {data.trails.map(trail => <Pressable key={trail.id} accessibilityRole="button" onPress={() => { setSelected(trailChoices([], [trail])[0].item); setTab('map'); setMode('map'); }} style={s.card}><Text style={s.subheading}>{trail.name}</Text><Text style={s.small}>Vis strekk på kartet →</Text></Pressable>)}
        <Button secondary title="Eksporter målinger og tidligere turer" onPress={() => void act(() => exportLog(data.trips, data.trails, getStore().setting<Discovery[]>('osmDiscoveries', []), getStore().setting('osmAwards', {})))} />
        <Text style={s.small}>Tråkk 0.4 · naturstier og enkel trening. Registrering med låst skjerm krever bakgrunnsposisjon. En pause varer til du velger Fortsett.</Text>
      </>}
    </ScrollView>
    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: colors.line }}>{([{ id: 'map', title: 'Utforsk', icon: 'map' }, { id: 'log', title: 'Målinger', icon: 'book' }, { id: 'you', title: 'Deg', icon: 'user' }] as const).map(t => <Pressable key={t.id} accessibilityRole="tab" accessibilityState={{ selected: tab === t.id }} onPress={() => { setTab(t.id); if (t.id !== 'map') setMode('map'); }} style={{ flex: 1, alignItems: 'center', gap: 5, paddingVertical: 14, backgroundColor: tab === t.id ? colors.pale : colors.paper }}><Icon name={t.icon} /><Text style={s.chipText}>{t.title}</Text></Pressable>)}</View>
    {trainingOpen && <Modal onRequestClose={() => setTrainingOpen(false)}><SafeAreaView style={s.screen}><Button secondary title="← Tilbake" onPress={() => setTrainingOpen(false)} /><ScrollView contentContainerStyle={s.content}><Text style={s.heading}>Treningsmodus</Text>
      {data.active?.workout && <WorkoutCard trip={data.active} now={now} onChange={refresh} />}
      {!training && <><Text style={s.body}>4×4 leder deg gjennom rask og rolig gange med tale og vibrasjon. Etter 35 minutter fortsetter du i fritt tempo.</Text><Button title={data.active ? '4×4 · skru på' : '4×4 · fortsett registrering'} disabled={busy} onPress={startTraining} /></>}
      {!!data.active?.workoutHistory?.length && <Text style={s.small}>{data.active.workoutHistory.length} tidligere treningsøkter er lagret i denne registreringen.</Text>}
    </ScrollView></SafeAreaView></Modal>}
    {detail && <Modal onRequestClose={() => setDetail(null)}><SafeAreaView style={s.screen}><Button secondary title="← Målinger" onPress={() => setDetail(null)} /><ScrollView contentContainerStyle={s.content}><Text style={s.heading}>{detail.name}</Text><TrailMap current={detail.points} fitRoute height={330} /><Text style={s.body}>{kmLabel(tripMetrics(detail).meters)} km · {durationLabel(movementTime(detail))} i bevegelse</Text>{[...(detail.workoutHistory ?? []), ...(detail.workout ? [detail.workout] : [])].map((w, i) => <Text key={w.id ?? i} style={s.body}>4×4 · {durationLabel(workoutStatus(w, detail.endedAt ?? now).elapsed)} · {workoutStatus(w, detail.endedAt ?? now).rounds} av 4 drag</Text>)}<Button secondary title="Slett registreringen" onPress={() => Alert.alert('Slette registreringen?', 'Strekk laget fra denne registreringen slettes også.', [{ text: 'Behold', style: 'cancel' }, { text: 'Slett', style: 'destructive', onPress: () => { getStore().deleteTrip(detail.id); setDetail(null); refresh(); } }])} /></ScrollView></SafeAreaView></Modal>}
  </SafeAreaView>;
}
class Boundary extends React.Component<{ children: React.ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() { return this.state.error ? <SafeAreaView style={s.content}><Text style={s.heading}>Kunne ikke åpne Tråkk</Text><Text style={s.body}>Lukk og åpne appen igjen. Ikke slett appdata; målingene er lagret lokalt.</Text></SafeAreaView> : this.props.children; }
}
function Startup() {
  const [data, setData] = useState<Data | null>(null), [error, setError] = useState<string | null>(null);
  useEffect(() => { const timer = setTimeout(() => { try { setData(snapshot()); } catch (e) { setError(String(e)); } }, 80); return () => clearTimeout(timer); }, []);
  return data ? <Trakk initial={data} /> : <SafeAreaView style={[s.screen, { justifyContent: 'center', padding: 24 }]}>{error ? <Text style={s.body}>{error}</Text> : <ActivityIndicator color={colors.ink} />}</SafeAreaView>;
}
export default function App() { return <SafeAreaProvider><Boundary><Startup /></Boundary></SafeAreaProvider>; }
