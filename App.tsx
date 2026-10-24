import { approveAreaHere, stageAreaConsent } from './src/services/areaConsent';
import { useNatureProgress } from './src/ui/useNatureProgress';
import { ProfileSettings } from './src/ui/ProfileSettings';
import { syncTripStatus } from './src/services/tripStatus';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Image, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getStore } from './src/data/native';
import { automaticRecorder } from './src/services/automaticRecording';
import type { RecordingPreference } from './src/domain/automaticRecording';
import { fetchNatureMap } from './src/services/natureMap';
import { areaNatureTrails, natureArea, natureVisitSummary, needsAreaConsent, NATURE_RADIUS } from './src/domain/natureArea';
import type { HomeArea } from './src/domain/areas';
import { movementTime } from './src/domain/natureTiming';
import { tripMetrics, durationLabel, kmLabel } from './src/domain/metrics';
import type { Discovery } from './src/domain/discoveries';
import type { Trip, Trail } from './src/domain/types';
import { activePeg } from './src/domain/activePeg';
import { useNearbyArea } from './src/ui/useNearbyArea';
import { useNatureTiming } from './src/ui/useNatureTiming';
import { TrailMap } from './src/ui/TrailMap';
import { TrailFinder } from './src/ui/TrailFinder';
import { ExploreSurface, type ExploreMode } from './src/ui/ExploreSurface';
import { WorkoutCard } from './src/ui/Workout';
import { workoutStatus, workoutPlan, workoutPlans, type WorkoutKind } from './src/domain/workout';
import { syncWorkoutCoach, workoutAvailable } from './src/services/workoutCoach';
import { StretchResults } from './src/ui/StretchResults';
import { Button, Icon, Metric } from './src/ui/components';
import { exportLog } from './src/services/export';
import { colors, styles as s } from './src/ui/theme';

const EMPTY_AR_TRAILS: Trail[] = [];
function snapshot() {
  const store = getStore();
  return { active: store.active(), trips: store.trips(), trails: store.trails(), items: store.setting<Discovery[]>('natureDiscoveries', []), preference: store.setting<RecordingPreference>('automaticRecording', 'unconfigured'), error: store.setting<string | null>('trackingError', null), limited: store.setting('automaticLimitReached', false), pendingArea: store.setting<HomeArea | null>('pendingNatureArea', null), pauseReason: store.setting<string | null>('automaticPauseReason', null) };
}
type Data = ReturnType<typeof snapshot>;
function Brand() { return (
    <View style={[s.between, { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 16 }]}><View style={s.row}><View style={{ width: 38, height: 38, backgroundColor: colors.ink, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}><Image source={require('./assets/trakk-icon.png')} style={{ width: 38, height: 38, borderRadius: 12 }} /></View><Text style={{ fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -1.2 }}>tråkk<Text style={{ color: colors.coral }}>.</Text></Text></View></View>
); }
export function Trakk({ initial }: { initial: Data }) {
  const [data, setData] = useState(initial), [now, setNow] = useState(Date.now());
  const [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const running = useRef(false), mounted = useRef(true);
  const refresh = useCallback(() => { if (mounted.current) { setData(snapshot()); setNow(Date.now()); } }, []);
  const act = useCallback(async (fn: () => unknown | Promise<unknown>) => {
    if (running.current) return;
    running.current = true; setBusy(true); setError(null);
    try { await fn(); } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : String(e)); }
    finally { running.current = false; if (mounted.current) { setBusy(false); refresh(); } }
  }, [refresh]);
  useEffect(() => {
    mounted.current = true;
    if (getStore().active()) void act(() => automaticRecorder.ensure());
    const interval = setInterval(() => { if (AppState.currentState === 'active') refresh(); }, 2000);
    const sub = AppState.addEventListener('change', state => { if (state === 'active') { refresh(); if (getStore().active()) void act(() => automaticRecorder.ensure()); } });
    return () => { mounted.current = false; clearInterval(interval); sub.remove(); };
  }, [act, refresh]);
  const pause = () => {
    // Pause is accepted even during an in-flight permission/start request.
    setBusy(true);
    getStore().setSetting('automaticPauseReason', null);
    void automaticRecorder.pause().catch(e => setError(String(e))).finally(() => { setBusy(false); refresh(); });
  };

  if (!data.active || data.preference !== 'enabled') return <SafeAreaView style={s.screen}><StatusBar style="dark" /><Brand />
    <ScrollView contentContainerStyle={[s.content, { flexGrow: 1, justifyContent: 'center' }]}>
      <Text style={s.heading}>{data.pendingArea ? 'Utforsk et nytt område?' : data.preference === 'paused' ? 'Klar for flere stier?' : 'Naturstiene rundt deg.'}</Text>
      <Text style={s.body}>{data.pendingArea ? 'Registreringen er stoppet fordi du er langt fra det festede området. Utforsk her aktiverer et nytt område på 5 km rundt deg.' : data.preference === 'paused' ? data.pauseReason === 'idle' ? 'Tråkk tok pause etter 10 minutter uten tydelig bevegelse. GPS er stoppet for å spare batteri.' : 'Registreringen er pauset.' : 'Oppdag naturstier innen 5 km. Start fester området der du er.'}</Text>
      {data.preference === 'unconfigured' && <Text style={s.body}>Når du trykker Start, ber vi om posisjon og bakgrunnstilgang. Tråkk registrerer hvor du går, også med låst skjerm, til du trykker Pause. Sporene lagres på mobilen. Tråkk pauser automatisk etter 10 minutter i ro, utenom pågående trening.</Text>}
      {(error || data.error) && <Text accessibilityLiveRegion="polite" style={s.body}>{error ?? data.error}</Text>}
      <Button title={data.pendingArea ? "Utforsk her" : "Start"} disabled={busy} onPress={() => void act(async () => { if (data.pendingArea) await approveAreaHere(); await automaticRecorder.enable(); })} />
      {busy && <Text accessibilityLiveRegion="polite" style={s.small}>Et øyeblikk …</Text>}
      {(error || data.error) && <Text accessibilityRole="link" onPress={() => void Linking.openSettings()} style={[s.small, { paddingVertical: 12 }]}>Åpne tillatelser</Text>}
    </ScrollView>
  </SafeAreaView>;
  return <ActiveTrakk data={data} now={now} error={error} busy={busy} act={act} refresh={refresh} pause={pause} />;
}
type ActiveProps = { data: Data; now: number; error: string | null; busy: boolean; act: (fn: () => unknown | Promise<unknown>) => Promise<void>; refresh: () => void; pause: () => void };
function ActiveTrakk({ data, now, error, busy, act, refresh, pause }: ActiveProps) {
  const [tab, setTab] = useState<'map' | 'log'>('map');
  const [settingsOpen, setSettingsOpen] = useState(false), [areaOpen, setAreaOpen] = useState(false);
  const [areaCandidate, setAreaCandidate] = useState<HomeArea | null>(null);
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [mode, setMode] = useState<ExploreMode>('map');
  const [selected, setSelected] = useState<Discovery | null>(null), [detail, setDetail] = useState<Trip | null>(null);
  const [loadingMap, setLoadingMap] = useState(false), [mapError, setMapError] = useState<string | null>(null);
  const [recenter, setRecenter] = useState(0), [mapRetry, setMapRetry] = useState(0);
  const nearby = useNearbyArea();
  const [center, setCenter] = useState(() => natureArea(getStore().setting<HomeArea | null>('activeNatureArea', null), nearby.area));
  useEffect(() => {
    if (nearby.live && nearby.area && center && needsAreaConsent(center, nearby.area)) {
      if (stageAreaConsent({ ...nearby.area, timestamp: nearby.lastSeen ?? now, accuracy: 25 })) pause();
    } else setCenter(old => natureArea(old, nearby.area));
  }, [nearby.area]);
  useEffect(() => { if (center) getStore().setSetting('activeNatureArea', center); }, [center]);
  const cell = center ? `${Math.round(center.latitude * 200)}:${Math.round(center.longitude * 200)}:${NATURE_RADIUS}` : '';
  const centerRef = useRef(center); centerRef.current = center;
  useEffect(() => {
    const point = centerRef.current; if (!point) return;
    const cache = getStore().setting<Record<string, number>>('natureMapFetched', {});
    if (!mapRetry && Date.now() - (cache[cell] ?? 0) < 86400000) return;
    const controller = new AbortController(); setLoadingMap(true); setMapError(null);
    void fetchNatureMap(point, NATURE_RADIUS, controller.signal).then(items => {
      if (controller.signal.aborted) return;
      const store = getStore(), merged = new Map(store.setting<Discovery[]>('natureDiscoveries', []).map(i => [i.id, i]));
      for (const item of items) merged.set(item.id, item);
      store.setSetting('natureDiscoveries', [...merged.values()]);
      store.setSetting('natureMapFetched', { ...store.setting('natureMapFetched', {}), [cell]: Date.now() });
      refresh();
    }).catch(e => { if (!controller.signal.aborted) setMapError(e instanceof Error ? e.message : String(e)); }).finally(() => { if (!controller.signal.aborted) setLoadingMap(false); });
    return () => controller.abort();
  }, [cell, mapRetry, refresh]);
  const items = useMemo(() => areaNatureTrails(data.items, center), [data.items, center]);
  const timing = useNatureTiming(items, data.trails, data.trips, data.active);
  const visits = useNatureProgress(items, data.trips, data.active, tab === 'log');
  const metrics = useMemo(() => data.active ? tripMetrics(data.active, now) : null, [data.active, now]);
  const moving = useMemo(() => data.active ? movementTime(data.active) : 0, [data.active]);
  const trackPosition = metrics?.points.at(-1);
  const useTrack = !!trackPosition && trackPosition.timestamp >= (nearby.lastSeen ?? 0);
  const position = useTrack ? trackPosition : nearby.area ?? trackPosition;
  const stale = useTrack ? now - trackPosition!.timestamp > 30000 : !nearby.live;
  const window = data.active ? getStore().segmentWindow(data.active.id) : null;
  const peg = useMemo(() => data.active && window?.draft ? activePeg(data.active.startedAt, window?.from, metrics?.points ?? []) : null, [data.active?.id, window?.from, window?.draft, metrics?.points]);
  const canMarkSegment = !!trackPosition && now - trackPosition.timestamp <= 20000 && !stale;
  const latest = useMemo(() => timing.results.filter(r => data.active && r.startedAt >= data.active.startedAt), [timing.results, data.active?.startedAt]);
  const locate = () => { if (position && !stale) setRecenter(n => n + 1); else void act(async () => { await nearby.locate(); setRecenter(n => n + 1); }); };
  const workout = data.active?.workout;
  const workoutState = workout ? workoutStatus(workout, now) : null;
  const training = !!workout && workout.endedAt === null && !workoutState!.complete;
  const startTraining = (kind: WorkoutKind) => { setTrainingOpen(false); void act(async () => {
    // Training is available only inside an active recording.
    const current = getStore().active();
    if (!current) throw new Error('Registreringen kunne ikke starte.');
    const updated = getStore().startWorkout(current.id, kind);
    await Promise.all([syncWorkoutCoach(updated), syncTripStatus(updated)]);
  }); };
  const progress = useMemo(() => natureVisitSummary(items, visits.progress), [items, visits.progress]);
  const areaLoaded = !!getStore().setting<Record<string, number>>('natureMapFetched', {})[cell];
  const progressLabel = center && (areaLoaded || items.length) ? `${progress.walked} av ${progress.total} stier gått` : '— av — stier gått';
  return <SafeAreaView style={s.screen}><StatusBar style="dark" />
    <View style={[s.between, { paddingRight: 20 }]}><Brand /><View style={s.row}><Pressable accessibilityRole="button" accessibilityLabel="Innstillinger" onPress={() => setSettingsOpen(true)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name="settings" /></Pressable><Button secondary title="Pause" disabled={busy} onPress={pause} /></View></View>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" removeClippedSubviews={false}>
      {(error || data.error) && <View style={s.notice}><Text style={s.body}>{error ?? data.error}</Text><Button secondary title="Prøv registrering igjen" disabled={busy} onPress={() => void act(() => automaticRecorder.ensure())} /><Button secondary title="Åpne tillatelser" onPress={() => void Linking.openSettings()} /></View>}
      {tab === 'map' && <>
        <ExploreSurface trailing={workoutAvailable && <Pressable accessibilityRole="button" accessibilityLabel={training ? `Trening: ${workoutPlan(workout!.kind).name}` : 'Velg treningsmodus'} onPress={() => setTrainingOpen(true)} style={{ alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}><Text style={s.chipText}>{training ? '● Trening' : 'Trening'}</Text></Pressable>} mode={mode} onMode={setMode} enabled={!detail && !trainingOpen && !settingsOpen} map={<TrailMap onLocate={locate} locating={nearby.pending || busy} position={position} positionStale={stale} focus={position} recenter={recenter} discoveries={items} trips={data.trips} current={metrics?.points} segmentStart={peg?.point} selectedDiscovery={selected} height={350} />} camera={<TrailFinder embedded items={items} trails={EMPTY_AR_TRAILS} trips={data.trips} current={metrics?.points} segmentStart={peg?.point} busy={loadingMap} onRefresh={() => setMapRetry(n => n + 1)} onMap={target => { setSelected(target.item); setMode('map'); }} />} />
        {selected && <Pressable accessibilityRole="button" accessibilityLabel="Fjern kartvalg" onPress={() => setSelected(null)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={s.small}>{selected.name} · Lukk ×</Text></Pressable>}
        {mapError ? <View style={s.notice}><Text style={s.body}>{mapError}</Text><Button secondary title="Hent stier igjen" onPress={() => setMapRetry(n => n + 1)} disabled={loadingMap} /></View> : loadingMap ? <Text style={s.small}>Henter naturstier …</Text> : !items.length ? <Text style={s.body}>Ingen naturstier med tilstrekkelige kartdata i dette området ennå.</Text> : null}
        {data.active && (window?.draft ? <View style={s.card}>
          <Text style={s.subheading}>Lager strekk</Text>
          <Text style={s.small}>{peg?.point ? `● Strekkstart kl. ${new Date(peg.point.timestamp).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })} · markert på kartet` : 'Venter på startpunktet i GPS-sporet'}</Text>
          <Button title="Stopp og lagre strekk" disabled={busy || !peg?.point || !canMarkSegment} onPress={() => void act(() => { const trail = getStore().clipSegment(data.active!.id); Alert.alert('Strekk lagret', `${trail.name}\nNeste gang du går her, måles tiden automatisk i begge retninger.`); })} />
          <Pressable accessibilityRole="button" accessibilityLabel="Avbryt strekket" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => void act(() => getStore().cancelSegmentDraft(data.active!.id))} style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}><Text style={s.small}>Avbryt</Text></Pressable>
        </View> : <View style={{ gap: 6 }}><Button secondary title="Start strekk" disabled={busy || !canMarkSegment} onPress={() => void act(() => getStore().setSegmentStart(data.active!.id))} />{!canMarkSegment && <Text style={s.small}>Venter på fersk GPS for å sette strekkstart.</Text>}</View>)}
        {!!latest.length && <StretchResults results={latest.slice(0, 5)} />}
      </>}
      {tab === 'log' && <>
        <View style={s.card}><Text style={s.heading}>{progressLabel}</Text><Text style={s.small}>{loadingMap || visits.pending ? 'Oppdaterer nærområdet …' : 'Aktivt område · 5 km'}</Text></View>
        {visits.error && <Text style={s.body}>Stihistorikken kunne ikke oppdateres. Prøv igjen når du åpner appen.</Text>}
        {progress.visits.map(row => <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={`Vis ${row.item.name} på kartet`} onPress={() => { setSelected(row.item); setTab('map'); setMode('map'); }} style={s.card}><Text style={s.subheading}>{row.item.name}</Text><Text style={s.small}>{row.complete ? '✓ Gått' : 'Innom'}{Number.isFinite(row.firstVisit) ? ` · ${new Date(row.firstVisit).toLocaleDateString('nb-NO')}` : ''}</Text></Pressable>)}
        {!progress.visits.length && !visits.pending && <Text style={s.body}>Her dukker stiene opp etter hvert som du utforsker området.</Text>}
        {metrics && <View style={s.card}><Text style={s.subheading}>Pågående registrering</Text><View style={s.row}><Metric value={kmLabel(metrics.meters)} label="km registrert" /><Metric value={metrics.speedKmh === null ? '—' : metrics.speedKmh.toLocaleString('nb-NO', { maximumFractionDigits: 1 })} label="km/t nå" /><Metric value={metrics.hasElevation ? String(Math.round(metrics.ascent)) : '—'} label="høydemeter opp" /></View><Text style={s.small}>{durationLabel(moving)} i bevegelse · også adkomst til stiene</Text></View>}
        <Text style={s.subheading}>Tidligere registreringer</Text>
        {timing.pending && <Text style={s.small}>Oppdaterer stitider …</Text>}{timing.error && <Text style={s.body}>Stitider kunne ikke beregnes: {timing.error}</Text>}
        {!!timing.results.length && <StretchResults results={timing.results.slice(0, 20)} />}
        {!timing.results.length && <Text style={s.body}>Tider dukker opp når du går en kartlagt stidel eller et eget strekk fra ende til ende. Retningene måles hver for seg. GPS-hull gir ingen tid.</Text>}
        {data.trips.filter(trip => !trip.automatic || !!trip.workout || !!trip.workoutHistory?.length || tripMetrics(trip).meters >= 10).map(trip => <Pressable key={trip.id} accessibilityRole="button" onPress={() => setDetail(trip)} style={s.card}><Text style={s.subheading}>{trip.automatic ? new Date(trip.startedAt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long' }) : trip.name}</Text><Text style={s.small}>{kmLabel(tripMetrics(trip).meters)} km · {trip.automatic ? 'Automatisk registrering' : 'Tidligere tur'} →</Text></Pressable>)}
      </>}
    </ScrollView>
    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: colors.line }}>{([{ id: 'map', title: 'Utforsk', icon: 'map' }, { id: 'log', title: 'Logg', icon: 'book' }] as const).map(t => <Pressable key={t.id} accessibilityRole="tab" accessibilityState={{ selected: tab === t.id }} onPress={() => { setTab(t.id); if (t.id !== 'map') setMode('map'); }} style={{ flex: 1, alignItems: 'center', gap: 5, paddingVertical: 14, backgroundColor: tab === t.id ? colors.pale : colors.paper }}><Icon name={t.icon} /><Text style={s.chipText}>{t.title}</Text></Pressable>)}</View>
    {settingsOpen && <Modal onRequestClose={() => { setSettingsOpen(false); setAreaOpen(false); }}><SafeAreaView style={s.screen}><Button secondary title="← Tilbake" onPress={() => { setSettingsOpen(false); setAreaOpen(false); }} /><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled"><Text style={s.heading}>Innstillinger</Text>
      <View style={s.card}><Text style={s.subheading}>Aktivt område · 5 km</Text><Text style={s.small}>Festet der du utforsker. På reise spør Tråkk før et nytt område aktiveres.</Text><Button secondary title="Endre område" onPress={() => { setAreaCandidate(center); setAreaOpen(true); }} /></View>
      {areaOpen && <View style={s.card}><Text style={s.subheading}>Fest området</Text><Text style={s.small}>Trykk i kartet for å plassere midtpunktet. Området er 5 km rundt merket.</Text><TrailMap focus={areaCandidate ?? position} position={position} areaMarker={areaCandidate} onChooseArea={p => setAreaCandidate(natureArea(null, p))} height={340} /><Button secondary title="Bruk posisjonen min" onPress={() => { if (position) setAreaCandidate(natureArea(null, position)); }} /><Button title="Utforsk dette området" disabled={!areaCandidate || busy} onPress={() => void act(() => { if (!areaCandidate) return; if (position && needsAreaConsent(areaCandidate, position)) throw new Error('Velg et område nær deg. Når du reiser, foreslår Tråkk området der du kommer.'); getStore().setSetting('activeNatureArea', areaCandidate); getStore().setSetting('pendingNatureArea', null); setCenter(areaCandidate); setSelected(null); setAreaOpen(false); setSettingsOpen(false); setTab('map'); })} />{error && <Text style={s.body}>{error}</Text>}</View>}
      <ProfileSettings />
      <Text style={s.small}>Tråkk pauser automatisk etter 10 minutter med pålitelig GPS uten tydelig bevegelse. Trykk Start når du går videre. Pågående trening unntas.</Text>
      <Button secondary title="Eksporter logg" onPress={() => void act(() => exportLog(data.trips, data.trails, getStore().setting<Discovery[]>('osmDiscoveries', []), getStore().setting('osmAwards', {})))} />
    </ScrollView></SafeAreaView></Modal>}
    {trainingOpen && <Modal onRequestClose={() => setTrainingOpen(false)}><SafeAreaView style={s.screen}><Button secondary title="← Tilbake" onPress={() => setTrainingOpen(false)} /><ScrollView contentContainerStyle={s.content}><Text style={s.heading}>Treningsmodus</Text>
      {data.active?.workout && <WorkoutCard trip={data.active} now={now} onChange={refresh} />}
      {!training && <><Text style={s.small}>Tale og vibrasjon følger tempoendringene. Registreringen fortsetter i fritt tempo når økten er ferdig.</Text>{workoutPlans.map(plan => <View key={plan.kind} style={s.card}><Text style={s.subheading}>{plan.name}</Text><Text style={s.body}>{plan.description}</Text><Button title={`${plan.name} · skru på`} disabled={busy} onPress={() => startTraining(plan.kind)} /></View>)}</>}
      {!!data.active?.workoutHistory?.length && <Text style={s.small}>{data.active.workoutHistory.length} tidligere treningsøkter er lagret i denne registreringen.</Text>}
    </ScrollView></SafeAreaView></Modal>}
    {detail && <Modal onRequestClose={() => setDetail(null)}><SafeAreaView style={s.screen}><Button secondary title="← Logg" onPress={() => setDetail(null)} /><ScrollView contentContainerStyle={s.content}><Text style={s.heading}>{detail.name}</Text><TrailMap current={detail.points} fitRoute height={330} /><Text style={s.body}>{kmLabel(tripMetrics(detail).meters)} km · {durationLabel(movementTime(detail))} i bevegelse</Text>{[...(detail.workoutHistory ?? []), ...(detail.workout ? [detail.workout] : [])].map((w, i) => <Text key={w.id ?? i} style={s.body}>{workoutPlan(w.kind).name} · {durationLabel(workoutStatus(w, detail.endedAt ?? now).elapsed)} · {workoutStatus(w, detail.endedAt ?? now).rounds} av {workoutPlan(w.kind).rounds} drag</Text>)}<Button secondary title="Slett registreringen" onPress={() => Alert.alert('Slette registreringen?', 'Strekk laget fra denne registreringen slettes også.', [{ text: 'Behold', style: 'cancel' }, { text: 'Slett', style: 'destructive', onPress: () => { getStore().deleteTrip(detail.id); setDetail(null); refresh(); } }])} /></ScrollView></SafeAreaView></Modal>}
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
