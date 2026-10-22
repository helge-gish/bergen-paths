import { streetRows, neighborhoodStreets, neighborhoodRouteRows, type NeighborhoodKind } from './src/domain/neighborhood';
import { NeighborhoodCard, NeighborhoodDetails } from './src/ui/Neighborhood';
import { activePeg, pegPlace, pegRelation } from './src/domain/activePeg';
import { fallbackStretchName, stretchName } from './src/domain/stretchNames';
import { syncTripStatus } from './src/services/tripStatus';
import { OptionalName } from './src/ui/OptionalName';
import { WorkoutCard, WorkoutPicker } from './src/ui/Workout';
import { syncWorkoutCoach } from './src/services/workoutCoach';
import { recordMedals, sameCompletedRoute } from './src/domain/records';
import { RecordMedals } from './src/ui/RecordMedals';
import { useNearbyArea } from './src/ui/useNearbyArea';
import { StretchResults } from './src/ui/StretchResults';
import { stretchResults, stretchDelta } from './src/domain/stretchRuns';
import { StartGuide } from './src/ui/StartGuide';
import { completedTripNames } from './src/domain/tripNames';
import { TripNameSuggestions } from './src/ui/TripNameSuggestions';
import { nameDiscovery } from './src/domain/discoveryNames';
import { needsDiscoveryName } from './src/domain/discoveryGroups';
import { isGhostTrip } from './src/domain/types';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Image, Modal, Pressable, ScrollView, Switch, Text, TextInput, Vibration, Linking, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { getStore } from './src/data/native';
import { startTracking, finishTracking, trackingRunning, resumeTracking } from './src/services/tracking';
import { tripMetrics, durationLabel, kmLabel, energyEstimate, shortDistance } from './src/domain/metrics';
import { ghostComparison, gapLabel } from './src/domain/ghost';
import { matchRoute } from './src/domain/routeMatch';
import type { HomeArea } from './src/domain/areas';
import { areaGoals, bergenGoal, type Goal } from './src/domain/goals';
import { syncCollections, pendingSurveys, mergeIntoStore, loadArea } from './src/services/collectionSync';
import { Goals, RadiusPicker } from './src/ui/Goals';
import { Avatar } from './src/ui/Avatar';
import { TripRewards } from './src/ui/TripRewards';
import { cleanPoints } from './src/domain/geo';
import type { Coordinate, Trail, Trip } from './src/domain/types';
import { colors, styles as s } from './src/ui/theme';
import { Button, Empty, ElevationChart, Icon, type IconName, Metric } from './src/ui/components';
import { TrailMap } from './src/ui/TrailMap';
import { trailReference } from './src/domain/trailReference';
import { trailStart, type NearbyTrail } from './src/domain/trailFinder';
import { TrailFinder } from './src/ui/TrailFinder';
import { ExploreSurface, type ExploreMode } from './src/ui/ExploreSurface';
import { Discoveries } from './src/ui/Discoveries';
import { type Discovery, type Progress } from './src/domain/discoveries';
import { useCollectionProgress } from './src/ui/useCollectionProgress';
import { useGoalSearch } from './src/ui/useGoalSearch';
import { fetchDiscoveries, fetchPeaks } from './src/services/osm';
import { exportLog } from './src/services/export';

type Tab = 'explore' | 'history' | 'profile';
const tabs: { id: Tab; title: string; icon: IconName }[] = [{ id: 'explore', title: 'Utforsk', icon: 'map' }, { id: 'history', title: 'Turlogg', icon: 'book' }, { id: 'profile', title: 'Deg', icon: 'user' }];
const date = (timestamp: number) => new Date(timestamp).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long' });
const decimal = (n: number) => n.toLocaleString('nb-NO', { maximumFractionDigits: 1 });
function snapshot() {
  const store = getStore(), trips = store.trips(), discoveries = store.setting<Discovery[]>('osmDiscoveries', []), awards = store.setting<Record<string, number>>('osmAwards', {});
  const active = store.active();
  return { active, segmentUndo: active ? store.segmentUndo(active.id) : null, segmentWindow: active ? store.segmentWindow(active.id) : null, trips, trails: store.trails(), discoveries, awards, goals: store.setting<Goal[]>('goals', []), catalog: store.setting<Goal[]>('goalCatalog', []), avatarColor: store.setting('avatarColor', '#E8A164'), syncError: store.setting<string | null>('collectionSyncError', null), profile: store.profile(), error: store.setting<string | null>('trackingError', null), audioError: store.setting<string | null>('audioError', null) };
}
function Sheet({ title, onClose, children, camera = false }: { title: string; onClose: () => void; children: React.ReactNode; camera?: boolean }) {
  return <Modal hardwareAccelerated animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}><SafeAreaView style={s.screen}><View style={[s.between, { padding: 22 }]}><Text style={[s.heading, { flex: 1 }]}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Lukk" onPress={onClose} style={{ padding: 10 }}><Icon name="close" /></Pressable></View><ScrollView removeClippedSubviews={!camera} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>{children}</ScrollView></SafeAreaView></Modal>;
}
function TripDetails({ medals, stretches, trip, reference, weight, onClose, onChange, onGhost, onDelete, allowSegments, rewards, items, homeArea, justFinished }: { medals: ReturnType<typeof recordMedals>; stretches: ReturnType<typeof stretchResults>; items: Discovery[]; homeArea: HomeArea | null; justFinished: boolean; rewards: (visited: ReturnType<typeof useCollectionProgress>) => React.ReactNode; trip: Trip; reference: Trip | null; weight: number | null; onClose: () => void; onChange: () => void; onGhost: () => void; onDelete: () => void; allowSegments: boolean }) {
  const [name, setName] = useState(trip.name), [trailName, setTrailName] = useState('');
  const [createTrail, setCreateTrail] = useState(false), [moreMetrics, setMoreMetrics] = useState(false);
  const ownTrip = useMemo(() => [trip], [trip]);
  const visited = useCollectionProgress(items, ownTrip);
  const names = useMemo(() => completedTripNames(trip, items, visited.progress, homeArea), [trip, items, visited.progress, homeArea]);
  const namedAtFinish = useRef(false);
  useEffect(() => {
    if (!justFinished || namedAtFinish.current || visited.pending || visited.error) return;
    namedAtFinish.current = true;
    const store = getStore();
    if (store.setting(`automaticName:${trip.id}`, false)) {
      store.suggestName(trip.id, names[0]); setName(store.getTrip(trip.id)!.name); onChange();
    }
  }, [justFinished, visited.pending, visited.error, trip.id, names, onChange]);
  const saveName = (value: string) => {
    try { namedAtFinish.current = true; getStore().rename(trip.id, value); setName(value.trim()); onChange(); }
    catch (e) { Alert.alert('Navn mangler', String(e)); return false; }
  };
  const [fromMinute, setFromMinute] = useState('0'), [toMinute, setToMinute] = useState('');
  const suggestedTrailName = useMemo(() => {
    if (!createTrail) return '';
    const from = Number(fromMinute.replace(',', '.')) * 60000 + trip.startedAt;
    const to = toMinute.trim() ? Number(toMinute.replace(',', '.')) * 60000 + trip.startedAt : trip.endedAt!;
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || from < trip.startedAt || to > trip.endedAt!) return '';
    return stretchName(trip.points.filter(p => p.timestamp >= from && p.timestamp <= to), items) ?? fallbackStretchName(from);
  }, [createTrail, trip, items, fromMinute, toMinute]);
  const metrics = useMemo(() => tripMetrics(trip), [trip]);
  const energy = useMemo(() => energyEstimate(trip, weight), [trip, weight]);
  const match = useMemo(() => reference ? matchRoute(trip, reference, trip.endedAt ?? Date.now()) : null, [trip, reference]);
  const saveTrail = () => {
    try {
      const from = Number(fromMinute.replace(',', '.')) * 60_000 + trip.startedAt;
      const to = toMinute.trim() ? Number(toMinute.replace(',', '.')) * 60_000 + trip.startedAt : trip.endedAt!;
      const saved = getStore().saveTrail(trip.id, trailName, from, to); onChange(); setTrailName(''); setCreateTrail(false);
      Alert.alert('Strekk lagret ✓', `${saved.name}\nStrekket er tilgjengelig i kartet og kompasset ditt.`);
    } catch (e) { Alert.alert('Kunne ikke lagre strekket', e instanceof Error ? e.message : String(e)); }
  };
  const confirmDelete = () => Alert.alert('Slette turen?', 'Turen og GPS-sporet slettes permanent, sammen med egne strekk lagret fra turen. Samlingen beregnes fra turene som er igjen.', [
    { text: 'Avbryt', style: 'cancel' },
    { text: 'Slett tur', style: 'destructive', onPress: () => {
      try { getStore().deleteTrip(trip.id); onDelete(); }
      catch (e) { Alert.alert('Kunne ikke slette turen', e instanceof Error ? e.message : String(e)); }
    } },
  ]);
  return <Sheet title="Ditt spor" onClose={onClose}>
    <Text style={s.eyebrow}>{date(trip.startedAt).toUpperCase()}</Text>
    <OptionalName value={trip.name} label="Endre turnavn" onSave={saveName} />
    {justFinished && <TripNameSuggestions names={names} selected={name} pending={visited.pending} onChoose={saveName} />}
    <TrailMap fitRoute current={metrics.points} reference={reference?.points} focus={metrics.points[0]} height={250} />
    <View style={s.row}><Metric value={durationLabel(metrics.elapsed)} label="total tid · med alle pauser" /><Metric value={kmLabel(metrics.meters)} label="kilometer" /></View>
    <View style={s.row}><Metric value={metrics.hasElevation ? `${Math.round(metrics.ascent)}` : '—'} label="høydemeter opp" /><Metric value={metrics.hasElevation ? `${Math.round(metrics.descent)}` : '—'} label="høydemeter ned" /><Metric value={decimal(metrics.averageKmh)} label="km/t · hele turen" /></View>
    <WorkoutCard trip={trip} now={trip.endedAt ?? Date.now()} />
    <RecordMedals medals={medals} />
    <StretchResults results={stretches} />
    {rewards(visited)}
    <Pressable accessibilityRole="button" accessibilityLabel="Slett tur" onPress={confirmDelete} style={{ paddingVertical: 12 }}><Text style={{ color: colors.coral, fontWeight: '700' }}>Slett tur</Text></Pressable>
    <View style={s.card}><ElevationChart values={metrics.points.filter(p => p.altitudeAccuracy !== null && p.altitudeAccuracy >= 0 && p.altitudeAccuracy <= 15).map(p => p.altitude)} /></View>
    {metrics.gapsMs > 0 && <View style={s.notice}><Text style={s.small}>Sporet har GPS-opphold. Tiden er komplett, men distanse og høydemeter kan være for lave. Oppholdene tegnes ikke som rette stier.</Text></View>}
    <Button secondary title={moreMetrics ? 'Skjul ekstra målinger' : 'Vis flere målinger'} onPress={() => setMoreMetrics(v => !v)} />
    {moreMetrics && <View style={s.card}><Text style={s.subheading}>Litt mer om turen</Text><Text style={s.body}>Tempo: {metrics.paceSeconds === null ? '—' : `${Math.floor(Math.round(metrics.paceSeconds) / 60)}:${String(Math.round(metrics.paceSeconds) % 60).padStart(2, '0')} min/km`}{'\n'}Stigning per time: {metrics.hasElevation && metrics.elapsed > 0 ? `${Math.round(metrics.ascent / (metrics.elapsed / 3_600_000))} hm/t` : '—'}{'\n'}Grov energi: {energy ? `${energy.low}–${energy.high} kcal` : 'ikke nok data'}</Text><Text style={s.small}>Energi er et grovt anslag med hvile inkludert, ikke en måling. Terreng, sekk, kondisjon og individuelle forskjeller gir stor usikkerhet. Oppgi vekt under Deg for å aktivere anslaget.</Text></View>}
    {match && <View style={s.card}><Icon name="ghost" /><Text style={s.subheading}>Sammenlignet med skyggen</Text><Text style={s.body}>{reference!.name}</Text><Text style={s.small}>{sameCompletedRoute(trip, reference!) ? `Du fullførte samme rute. Total tid med pauser: ${stretchDelta(metrics.elapsed / 1000, (reference!.endedAt! - reference!.startedAt) / 1000)} enn skyggen. En personlig rekord må også slå din tidligere beste tid på ruten.` : 'Hele ruten kunne ikke bekreftes lik fra start til slutt. Avvik, ulikt start-/sluttpunkt eller GPS-opphold kan være årsaken. Derfor sammenlignes ikke totaltiden; fullførte strekk vurderes hver for seg.'}</Text>{allowSegments && !isGhostTrip(trip) && match.newSegments.map((part, i) => <Button key={part.startedAt} secondary title={`Navngi sporparti ${i + 1}`} onPress={() => { setCreateTrail(true); setFromMinute(((part.startedAt - trip.startedAt) / 60_000).toFixed(2)); setToMinute(part.endedAt ? ((part.endedAt - trip.startedAt) / 60_000).toFixed(2) : ''); }} />)}</View>}
    <Button icon="ghost" title="Bruk denne turen som skygge" onPress={onGhost} disabled={metrics.points.length < 2} />
    {allowSegments && !isGhostTrip(trip) && !createTrail && <Button secondary title="Lagre et strekk fra turen" onPress={() => setCreateTrail(true)} />}
    {allowSegments && !isGhostTrip(trip) && createTrail && <View style={s.card}><Button secondary title="Avbryt nytt strekk" onPress={() => setCreateTrail(false)} /><Text style={s.eyebrow}>LAGRE ET STREKK</Text><Text style={s.body}>Lagre hele tursporet, eller velg et tidsrom.</Text><OptionalName value={trailName || suggestedTrailName} emptyLabel="Velg et gyldig tidsrom" label="Endre navn på nytt strekk" onSave={value => setTrailName(value)} /><View style={s.row}><View style={{ flex: 1, gap: 5 }}><Text style={s.small}>Fra minutt</Text><TextInput accessibilityLabel="Startminutt for strekket" keyboardType="decimal-pad" style={s.input} value={fromMinute} onChangeText={setFromMinute} /></View><View style={{ flex: 1, gap: 5 }}><Text style={s.small}>Til minutt (tomt = slutt)</Text><TextInput accessibilityLabel="Sluttminutt for strekket" keyboardType="decimal-pad" style={s.input} value={toMinute} onChangeText={setToMinute} placeholder="Slutten" /></View></View><Button secondary title="Lagre strekket mitt" onPress={saveTrail} /></View>}
  </Sheet>;
}

function SavedTrailDetails({ trail, onClose, onGhost, onTrip, onChange, canRename }: { trail: Trail; onClose: () => void; onGhost: () => void; onTrip: () => void; onChange: () => void; canRename: boolean }) {
  const reference = useMemo(() => trailReference(trail), [trail]);
  const metrics = useMemo(() => tripMetrics(reference), [reference]);
  return <Sheet title="Strekket ditt" onClose={onClose}>
    {canRename ? <OptionalName value={trail.name} label="Endre strekknavn" onSave={value => { try { getStore().renameTrail(trail.id, value); onChange(); } catch (e) { Alert.alert('Kunne ikke endre navn', String(e)); return false; } }} /> : <Text style={s.title}>{trail.name}</Text>}
    <TrailMap fitRoute current={reference.points} height={300} />
    <View style={s.row}><Metric value={kmLabel(metrics.meters)} label="kilometer" /><Metric value={durationLabel(metrics.elapsed)} label="tid med pauser" /></View>
    <Button icon="ghost" title="Gå denne igjen med skygge" onPress={onGhost} disabled={reference.points.length < 2} />
    <Text style={s.body}>Start ved begynnelsen av strekket. Skyggen følger tiden og pausene mellom de lagrede GPS-punktene.</Text>

    <Button secondary title="Åpne opprinnelig tur" onPress={onTrip} />
  </Sheet>;
}

function Trakk({ initialData }: { initialData: ReturnType<typeof snapshot> }) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState(initialData), [tab, setTab] = useState<Tab>('explore');
  const [exploreMode, setExploreMode] = useState<ExploreMode>('map');
  const exploreScroll = useRef<ScrollView>(null);
  const goalSearch = useGoalSearch();
  const [busyMessage, setBusyMessage] = useState('Arbeider …');
  const [now, setNow] = useState(Date.now()), [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<'neighborhood' | 'peg' | 'ghost' | 'start' | 'trail' | 'collection' | 'goals' | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null), [ghostId, setGhostId] = useState<string | null>(null);
  const [selectedTrailId, setSelectedTrailId] = useState<string | null>(null);
  const [neighborhoodKind, setNeighborhoodKind] = useState<NeighborhoodKind>('street');
  const [selectedDiscovery, setSelectedDiscovery] = useState<Discovery | null>(null);
  const [finishedTripId, setFinishedTripId] = useState<string | null>(null);
  const [training, setTraining] = useState<'free' | '4x4'>('free');
  const [finderStart, setFinderStart] = useState<{ id: string; point: Coordinate; saved: boolean } | null>(null);
  const [startReady, setStartReady] = useState(false);
  const [recenter, setRecenter] = useState(0);
  const [editingSegment, setEditingSegment] = useState(false);
  const [segmentName, setSegmentName] = useState(''), [segmentNotice, setSegmentNoticeRaw] = useState<string | null>(null);
  const [segmentNoticeUntil, setSegmentNoticeUntil] = useState(0);
  const setSegmentNotice = useCallback((value: string | null) => { setSegmentNoticeRaw(value); setSegmentNoticeUntil(Date.now() + 60000); }, []);
  const nearby = useNearbyArea();
  const position = nearby.area;
  const locatedLive = useRef(false);
  const [audio, setAudio] = useState(true), [focus, setFocus] = useState<Coordinate | null>(null);
  // Follow GPS for nearby data without snapping a freely panned map back every fix.
  useEffect(() => { if (!position) return; if (nearby.live && !locatedLive.current) { locatedLive.current = true; setFocus(position); } else setFocus(previous => previous ?? position); }, [position, nearby.live]);
  const [editWeight, setEditWeight] = useState(false), [showInfo, setShowInfo] = useState(false);
  const [serviceMissing, setServiceMissing] = useState(false), [weightText, setWeightText] = useState(data.profile.weightKg?.toString() ?? '');
  const refresh = useCallback(() => setData(snapshot()), []);
  const active = data.active;
  useEffect(() => { void syncTripStatus(active).catch(() => {}); }, [active]);
  useEffect(() => { void syncWorkoutCoach(active).catch(() => getStore().setSetting('audioError', 'Taletreneren kunne ikke starte. Åpne appen igjen.')); }, [active]);
  const findCount = useMemo(() => data.discoveries.filter(i => !needsDiscoveryName(i) && data.awards[i.id] !== undefined).length, [data.discoveries, data.awards]);
  const renameDiscovery = (item: Discovery, name: string) => {
    try { const store = getStore(); store.setSetting('osmDiscoveries', nameDiscovery(store.setting<Discovery[]>('osmDiscoveries', []), item.id, name)); refresh(); }
    catch (e) { Alert.alert('Kunne ikke lagre navnet', e instanceof Error ? e.message : String(e)); }
  };
  const savedProgress = useMemo(() => Object.fromEntries(Object.entries(data.awards).map(([id, time]) => [id, { fraction: 1, collected: true, firstVisit: time } satisfies Progress])), [data.awards]);
  const collection = useCollectionProgress(data.discoveries, data.trips, savedProgress);
  const progress = collection.progress;
  const streets = useMemo(() => streetRows(data.discoveries), [data.discoveries]);
  const pathRows = useMemo(() => ({ steps: neighborhoodRouteRows(data.discoveries, 'steps'), trail: neighborhoodRouteRows(data.discoveries, 'trail') }), [data.discoveries]);
  const neighborhood = useMemo(() => ({ street: neighborhoodStreets(streets, nearby.area, progress), steps: neighborhoodStreets(pathRows.steps, nearby.area, progress), trail: neighborhoodStreets(pathRows.trail, nearby.area, progress) }), [streets, pathRows, nearby.area, progress]);
  useEffect(() => {
    if (collection.pending || collection.error) return;
    const awards = Object.fromEntries(Object.entries(progress).filter(([, p]) => p.collected).map(([id, p]) => [id, p.firstVisit ?? Date.now()]));
    getStore().setSetting('osmAwards', awards);
    setData(previous => ({ ...previous, awards }));
  }, [progress, collection.pending, collection.error]);
  useEffect(() => { setSegmentNotice(null); }, [active?.id]);
  const latestSegment = data.trails.find(t => t.id === data.segmentWindow?.lastTrailId);
  useEffect(() => { setSegmentName(latestSegment?.name ?? ''); }, [latestSegment?.id, latestSegment?.name]);
  useEffect(() => { if (!active) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [active?.id]);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => { const store = getStore(); setData(prev => ({ ...prev, active: store.active(), error: store.setting<string | null>('trackingError', null), audioError: store.setting<string | null>('audioError', null) })); }, 3000);
    return () => clearInterval(timer);
  }, [active?.id]);
  useEffect(() => {
    const check = () => { refresh(); if (getStore().active()) trackingRunning().then(r => setServiceMissing(!r)).catch(() => setServiceMissing(true)); else setServiceMissing(false); };
    if (getStore().active()) trackingRunning().then(r => setServiceMissing(!r)).catch(() => setServiceMissing(true));
    const sub = AppState.addEventListener('change', state => { if (state === 'active') check(); }); return () => sub.remove();
  }, [active?.id, refresh]);
  const metrics = useMemo(() => active ? tripMetrics(active, now) : null, [active, now]);
  const trackPosition = metrics?.points.at(-1);
  const useTrackPosition = !!trackPosition && trackPosition.timestamp >= (nearby.lastSeen ?? 0);
  const mapPosition = useTrackPosition ? trackPosition : position ?? trackPosition;
  const mapPositionStale = useTrackPosition ? now - trackPosition!.timestamp > 30000 : !nearby.live;
  const peg = useMemo(() => active ? activePeg(active.startedAt, data.segmentWindow?.from, metrics?.points ?? []) : null, [active?.id, active?.startedAt, data.segmentWindow?.from, metrics?.points]);
  const pegName = useMemo(() => pegPlace(peg?.point ?? null, data.discoveries), [peg?.point?.latitude, peg?.point?.longitude, data.discoveries]);
  const pegWhere = pegName ?? pegRelation(peg?.point ?? null, metrics?.points.at(-1) ?? null, now) ?? (peg?.point ? 'Vis startmerket i kartet' : 'Venter på første GPS-punkt');
  const pegClock = peg ? new Date(peg.from).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }) : '';
  const references = useMemo(() => [...data.trips, ...data.trails.map(trailReference)], [data.trips, data.trails]);
  const ghost = references.find(t => t.id === (active ? active.ghostId : ghostId)) ?? null;
  useEffect(() => { if (ghostId && !references.some(t => t.id === ghostId)) setGhostId(null); }, [references, ghostId]);
  const selectedTrail = data.trails.find(t => t.id === selectedTrailId);
  const openTrail = (trail: Trail) => { setSelectedTrailId(trail.id); setModal('trail'); };
  const repeatWithGhost = (reference: Trip) => {
    if (active) { Alert.alert('En tur pågår', 'Avslutt turen før du velger en ny skygge.'); return; }
    setFinderStart(null); setStartReady(false); setGhostId(reference.id); setFinishedTripId(null); setSelectedTrip(null); setSelectedDiscovery(null); setFocus(reference.points[0] ?? null); setTab('explore'); setModal('start');
  };
  const route = useMemo(() => active && ghost ? matchRoute(active, ghost, Date.now()) : null, [active, ghost]);
  const activeStretches = useMemo(() => active ? stretchResults(active, data.trails, data.trips, ghost) : [], [active, data.trails, data.trips, ghost]);
  const comparison = useMemo(() => active && ghost ? ghostComparison(active, ghost, now, route ?? undefined) : null, [active, ghost, now, route]);
  const [syncing, setSyncing] = useState(false);
  useEffect(() => {
    setSyncing(false);
    if (active) return;
    let cancelled = false, timer: ReturnType<typeof setTimeout>;
    const run = async () => {
      if (cancelled) return;
      if (AppState.currentState !== 'active') { timer = setTimeout(run, 30000); return; }
      if (!pendingSurveys(getStore()).length) return;
      setSyncing(true);
      try { await syncCollections(getStore()); }
      finally {
        if (!cancelled) { setSyncing(false); refresh(); timer = setTimeout(run, getStore().setting('collectionSyncError', null) ? 300000 : 5000); }
      }
    };
    timer = setTimeout(run, 1500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [active?.id, data.trips.length, refresh]);
  const totals = useMemo(() => data.trips.reduce((sum, t) => { const m = tripMetrics(t); return { meters: sum.meters + m.meters, ascent: sum.ascent + m.ascent, elapsed: sum.elapsed + m.elapsed }; }, { meters: 0, ascent: 0, elapsed: 0 }), [data.trips]);
  const detail = data.trips.find(t => t.id === selectedTrip);
  const detailStretches = useMemo(() => detail ? stretchResults(detail, data.trails, data.trips, references.find(t => t.id === detail.ghostId) ?? null) : [], [detail, data.trails, data.trips, references]);
  const detailMedals = useMemo(() => detail ? recordMedals(detail, detailStretches, data.trips) : [], [detail, detailStretches, data.trips]);
  const attempt = async (action: () => Promise<void>, message = 'Lagrer endringer …') => { if (busy) return; setBusyMessage(message); setBusy(true); try { await action(); } catch (e) { Alert.alert('Det gikk ikke helt', e instanceof Error ? e.message : String(e)); } finally { refresh(); setBusy(false); } };
  const movePeg = () => {
    if (!active || isGhostTrip(active)) return;
    Alert.alert('Flytte startmerket hit?', 'Det nåværende startmerket erstattes med siste ferske GPS-punkt. Hele tursporet beholdes.', [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Sett startmerke her', onPress: () => void attempt(async () => {
        getStore().setSegmentStart(active.id); setEditingSegment(false); setNow(Date.now()); Vibration.vibrate(80);
        setSegmentNotice('✓ Startmerket er flyttet hit. Neste strekk lagres fra dette punktet.');
        setModal('peg');
      }) },
    ]);
  };
  const here = nearby.locate;
  const locate = () => { if (mapPosition && !mapPositionStale) { setRecenter(n => n + 1); return; } void attempt(async () => { setFocus(await here()); setRecenter(n => n + 1); }, 'Finner posisjonen din …'); };
  const syncDiscoveries = () => attempt(async () => {
    const center = nearby.area ?? await here();
    const streetError = await loadArea(getStore(), center, center.radius);
    await syncCollections(getStore());
    Alert.alert('Samlingen er oppdatert', streetError ? `Stier og steder er hentet. Gatekartet venter: ${streetError}` : 'Alle lagrede turer sjekkes mot kartdataene. Du trenger ikke velge kategori før turen.');
  }, 'Henter kartdata for området …');
  const loadGoals = () => goalSearch.run('nearby', async signal => {
    const area = nearby.area ? { ...nearby.area } : await here();
    if (signal.aborted) throw signal.reason;
    // Freeze the goal's place label; "where you are now" would become wrong
    // after travelling. Native geocoding must not hold the search open.
    let timer: ReturnType<typeof setTimeout> | undefined;
    area.name = `område valgt ${date(Date.now())}`;
    try {
      const places = await Promise.race([Location.reverseGeocodeAsync(area), new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 3000); })]);
      const place = places?.[0];
      area.name = place?.district || place?.city || place?.subregion || area.name;
    } catch { /* The fixed date/coordinates identify the area without geocoding. */ }
    finally { clearTimeout(timer); }
    if (signal.aborted) throw signal.reason;
    const cached = getStore().setting<Discovery[]>('osmDiscoveries', []);
    // Suggestions are local first. Do not wait for a full municipal street
    // download or unrelated background collection sync to finish.
    let suggestions = areaGoals(area, cached);
    if (suggestions.length) return { suggestions, items: [] as Discovery[] };
    const items = await fetchDiscoveries(area, area.radius, signal);
    suggestions = areaGoals(area, items);
    if (!suggestions.length) throw new Error('Ingen mål funnet i området. Prøv en større radius.');
    return { suggestions, items };
  }, ({ suggestions, items }) => {
    const store = getStore();
    if (items.length) mergeIntoStore(store, items);
    store.setSetting('goalCatalog', [...store.setting<Goal[]>('goalCatalog', []).filter(g => g.curated), ...suggestions]);
    refresh();
  });
  const loadBergenGoal = () => goalSearch.run('bergen', async signal => {
    const items = await fetchPeaks({ latitude: 60.383, longitude: 5.32 }, 6500, signal);
    const goal = bergenGoal(items);
    if (!goal) throw new Error('Kartkilden fant ikke alle syv topper. Prøv igjen senere; et ufullstendig mål blir ikke aktivert.');
    return { goal, items };
  }, ({ goal, items }) => {
    const store = getStore(); mergeIntoStore(store, items);
    store.setSetting('goalCatalog', [...store.setting<Goal[]>('goalCatalog', []).filter(g => !g.curated), goal]);
    refresh();
  });
  const toggleGoal = (goal: Goal) => {
    const goals = data.goals.some(g => g.id === goal.id) ? data.goals.filter(g => g.id !== goal.id) : [...data.goals, goal];
    getStore().setSetting('goals', goals); setData(previous => ({ ...previous, goals }));
  };
  const chooseTrail = (target: Pick<NearbyTrail, 'id' | 'name' | 'item' | 'coordinate' | 'saved'>) => {
    if (active) return;
    const point = trailStart(target);
    if (!point) { Alert.alert('Mangler startpunkt', 'Kartdataene har ikke et startpunkt for dette stedet. Velg en annen sti.'); return; }
    setFinderStart({ id: target.id, point, saved: !!target.saved });
    setStartReady(false); setGhostId(null);
    setSelectedDiscovery({ ...target.item, name: target.name }); setFocus(target.coordinate);
    setExploreMode('map'); setTab('explore'); setModal('start');
  };
  const finish = () => Alert.alert('Avslutte turen?', 'Hele tiden fra start til slutt blir lagret, inkludert pausene.', [{ text: 'Fortsett turen', style: 'cancel' }, { text: 'Avslutt og lagre', onPress: () => attempt(async () => { const id = await finishTracking(); setGhostId(null); setFinishedTripId(id); setSelectedTrip(id); setTab('history'); }) }]);

  return <View style={s.screen}><StatusBar style="dark" /><SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
    <View style={[s.between, { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 16 }]}><View style={s.row}><View style={{ width: 38, height: 38, backgroundColor: colors.ink, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}><Image source={require('./assets/trakk-icon.png')} style={{ width: 38, height: 38, borderRadius: 12 }} /></View><Text style={{ fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -1.2 }}>tråkk<Text style={{ color: colors.coral }}>.</Text></Text></View></View>
    {busy && <View accessibilityLiveRegion="polite" style={{ marginHorizontal: 22, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}><ActivityIndicator size="small" color={colors.ink} /><Text style={[s.small, { flex: 1 }]}>{busyMessage}</Text></View>}
    {active && tab !== 'explore' && <Pressable accessibilityRole="button" onPress={() => setTab('explore')} style={{ marginHorizontal: 22, padding: 12, borderRadius: 14, backgroundColor: colors.ink }}><Text style={{ color: 'white', fontWeight: '600' }}>● Tur pågår · {durationLabel(now - active.startedAt)} →</Text></Pressable>}
    <ScrollView ref={exploreScroll} key={tab} removeClippedSubviews={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      {tab === 'explore' && <>
        {active?.workout && <WorkoutCard trip={active} now={now} onChange={refresh} />}
        {!nearby.live && !(metrics?.points.length && now - metrics.points.at(-1)!.timestamp <= 30000) && <View accessibilityLiveRegion="polite" style={s.notice}>
          <Text style={s.subheading}>{nearby.area ? 'Sist kjente posisjon' : 'Slå på GPS for å finne deg'}</Text>
          <Text style={s.small}>{nearby.area && nearby.lastSeen ? `Fra ${new Date(nearby.lastSeen).toLocaleString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}. Venter på fersk GPS.` : nearby.status}</Text>
          <Button secondary title={nearby.needsSettings ? 'Åpne posisjonstillatelser' : nearby.pending ? 'Finner GPS …' : 'Finn posisjonen min'} disabled={!nearby.needsSettings && (nearby.pending || busy)} onPress={() => nearby.needsSettings ? void Linking.openSettings() : void attempt(async () => { setFocus(await here()); setRecenter(n => n + 1); }, 'Finner GPS …')} />
        </View>}
        <View style={[s.between, { flexWrap: 'wrap' }]}><RadiusPicker radius={nearby.radius} onRadius={nearby.setRadius} /><Pressable accessibilityRole="button" accessibilityLabel="Finn min posisjon" onPress={locate} disabled={busy} style={{ padding: 12 }}><Icon name="location" size={22} /></Pressable></View>
        <ExploreSurface mode={exploreMode} onMode={setExploreMode} enabled={!modal && !detail}
          map={<View style={{ gap: 9 }}><TrailMap onLocate={locate} locating={nearby.pending || busy} onStartTrail={active ? undefined : item => chooseTrail({ id: item.id, name: item.name, item, coordinate: metrics?.points.at(-1) ?? position ?? item })} segmentStart={peg?.point} positionStale={mapPositionStale} recenter={recenter} fitReference={!!ghost} selectedDiscovery={selectedDiscovery} trips={data.trips} trails={data.trails} discoveries={data.discoveries} awards={data.awards} current={metrics?.points} reference={ghost?.points} ghost={comparison?.position} position={mapPosition} focus={useTrackPosition ? trackPosition : focus ?? mapPosition} height={active ? 280 : 335} />{selectedDiscovery && <Pressable accessibilityRole="button" onPress={() => setSelectedDiscovery(null)}><Text style={s.small}>{selectedDiscovery.name} · markert i korall · Lukk ×</Text></Pressable>}</View>}
          camera={<TrailFinder embedded items={data.discoveries} trails={data.trails} trips={data.trips} current={metrics?.points} segmentStart={peg?.point} busy={busy || syncing} onRefresh={syncDiscoveries} onMap={target => { setSelectedDiscovery({ ...target.item, name: target.name }); setFocus(target.coordinate); setExploreMode('map'); }} onStart={active ? undefined : chooseTrail} onGhost={active ? undefined : trail => repeatWithGhost(trailReference(trail))} />}
        />
        {active && activeStretches.at(-1) && now - activeStretches.at(-1)!.endedAt < 30000 && <View accessibilityLiveRegion="polite" style={s.notice}><Text style={s.subheading}>✓ Strekk fullført: {activeStretches.at(-1)!.name}</Text><Text style={s.body}>{activeStretches.at(-1)!.ghostSeconds !== null ? `${stretchDelta(activeStretches.at(-1)!.seconds, activeStretches.at(-1)!.ghostSeconds!)} enn skyggen` : activeStretches.at(-1)!.previousSeconds !== null ? `${stretchDelta(activeStretches.at(-1)!.seconds, activeStretches.at(-1)!.previousSeconds!)} enn sist` : 'Første registrerte tid'}</Text></View>}
          {ghost && route?.deviated && <View style={s.notice}><Text style={s.subheading}>{route.state === 'off-route' ? 'Du har gått av ruten' : route.label}</Text><Text style={s.body}>Turen lagres fortsatt. Følg den korallfargede ruten tilbake, eller fortsett fritt. Totaltiden sammenlignes ikke etter et avvik; fullførte strekk teller fortsatt.</Text></View>}
        {active && metrics ? <>
          <View style={{ backgroundColor: colors.ink, padding: 22, borderRadius: 24, gap: 22 }}><View style={s.between}><Text style={{ fontSize: 10, letterSpacing: 2, color: '#C2D3C3', fontWeight: '700' }}>{isGhostTrip(active) ? '● SKYGGETUR' : '● VANLIG TUR'}</Text><Icon name="clock" color={colors.yellow} size={18} /></View><Text style={{ fontSize: 46, color: colors.paper, fontWeight: '600', letterSpacing: -1, fontVariant: ['tabular-nums'] }}>{durationLabel(metrics.elapsed)}</Text><View style={s.row}><Metric light value={kmLabel(metrics.meters)} label="kilometer" /><Metric light value={metrics.hasElevation ? `${Math.round(metrics.ascent)}` : '—'} label="høydemeter opp" /><Metric light value={metrics.speedKmh === null ? '—' : decimal(metrics.speedKmh)} label="km/t akkurat nå" /></View><View style={{ height: 1, backgroundColor: '#3A594B' }} /><Text style={{ fontSize: 12, color: '#C2D3C3' }}>Snitt {decimal(metrics.averageKmh)} km/t · Ned {metrics.hasElevation ? Math.round(metrics.descent) : '—'} hm</Text></View>
          {(!metrics.points.length || now - metrics.points.at(-1)!.timestamp > 20_000 || serviceMissing || data.error) && <View style={s.notice}><Text style={s.subheading}>{serviceMissing ? 'GPS-tjenesten har stoppet' : 'Sjekk GPS-signalet'}</Text><Text style={s.body}>{data.error ?? (serviceMissing ? 'Tidtakingen fortsetter, men nye GPS-punkter kommer ikke inn. Du kan starte GPS igjen uten å nullstille tiden. Oppholdet i sporet beholdes.' : 'Venter på en fersk, nøyaktig posisjon. Tiden fortsetter. Svakt signal kan gi et ufullstendig spor.')}</Text>{serviceMissing && <Button secondary title="Fortsett GPS-registreringen" disabled={busy} onPress={() => attempt(async () => { await resumeTracking(); setServiceMissing(false); })} />}</View>}
          {ghost && <View style={s.card}><View style={s.row}><View style={{ backgroundColor: '#F5E5DC', padding: 10, borderRadius: 15 }}><Icon name="ghost" color={colors.coral} /></View><View style={{ flex: 1 }}><Text style={s.eyebrow}>MED SKYGGE</Text><Text style={s.subheading}>{ghost.name}</Text></View></View><Text style={[s.heading, { color: colors.coral }]}>{comparison?.gapSeconds !== null && comparison?.gapSeconds !== undefined ? gapLabel(comparison.gapSeconds) : 'Sammenligner sporet …'}</Text><Text style={s.small}>{comparison?.reason ?? route?.label}</Text><View style={s.between}><View style={s.row}><Icon name="sound" size={19} /><Text style={s.body}>Fortell meg med lyd</Text></View><Switch accessibilityLabel="Lydoppdateringer om skyggen" value={active.audioEnabled} trackColor={{ true: colors.ink }} onValueChange={value => { getStore().setAudio(active.id, value); if (!value) void Speech.stop(); refresh(); }} /></View>{data.audioError && <Text style={s.small}>{data.audioError}</Text>}<Text style={s.small}>{active.workout && active.workout.endedAt === null ? 'Skyggebeskjeder samordnes med 4×4-treneren, så stemmene ikke snakker over hverandre.' : 'Omtrent hvert minutt når rutene kan sammenlignes.'}</Text></View>}

          {ghost && <Button secondary title="Fortsett uten skygge" onPress={() => Alert.alert('Fjerne skyggen?', 'Tid og GPS-spor beholdes. Skyggen fjernes, og du kan lagre egne strekk.', [{ text: 'Behold skyggen', style: 'cancel' }, { text: 'Fortsett uten skygge', onPress: () => { getStore().leaveGhost(active.id); void Speech.stop(); setGhostId(null); refresh(); } }])} />}
          {!isGhostTrip(active) && <View style={s.card}>
            <Text style={s.eyebrow}>MARKER ET STREKK</Text><View style={s.between}><Text style={[s.body, { flex: 1 }]}>Varsle om fullførte strekk med lyd</Text><Switch accessibilityLabel="Lyd for fullførte strekk" value={active.audioEnabled} onValueChange={value => { getStore().setAudio(active.id, value); if (!value) void Speech.stop(); refresh(); }} /></View>
            <Text style={s.body}>Lagre fra startmerket til her. Neste strekk starter her.</Text>
            <Text style={s.subheading}>Start: {new Date(data.segmentWindow?.from ?? active.startedAt).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}{data.segmentWindow?.from === active.startedAt ? ' · turstart' : ''}</Text>
            <Button title="Lagre strekk hit" icon="check" disabled={busy} onPress={() => attempt(async () => {
              const saved = getStore().clipSegment(active.id); const m = tripMetrics(trailReference(saved));
              setEditingSegment(false); setNow(Date.now()); Vibration.vibrate(100); setSegmentNotice(`✓ ${saved.name} lagret · ${shortDistance(m.meters)} · ${durationLabel(m.elapsed)}. Neste strekk starter her.`);
              Alert.alert('Strekk lagret ✓', `${saved.name}\n${shortDistance(m.meters)} · ${durationLabel(m.elapsed)}\nStart og slutt er lagret. Neste strekk begynner her. Hele turen fortsetter.`, [{ text: 'Ferdig' }, { text: 'Angre lagringen', onPress: () => void attempt(async () => { getStore().undoSegment(active.id); setSegmentNotice('Lagringen er angret. Hele GPS-sporet er beholdt.'); }) }]);
            })} />
            <Button secondary title="Sett nytt startmerke her" disabled={busy} onPress={movePeg} />


            {latestSegment && <><Text style={s.subheading}>Sist lagret: {latestSegment.name}</Text>{!editingSegment ? <Button secondary title="Endre navn" onPress={() => setEditingSegment(true)} /> : <><TextInput accessibilityLabel="Navn på strekket" placeholder="Navn på strekket" style={s.input} value={segmentName} onChangeText={setSegmentName} maxLength={80} /><Button secondary title="Lagre navn" disabled={busy || !segmentName.trim()} onPress={() => attempt(async () => { getStore().renameTrail(latestSegment.id, segmentName); setEditingSegment(false); setSegmentNotice('✓ Navnet er lagret.'); })} /><Button secondary title="Avbryt navneendring" onPress={() => { setSegmentName(latestSegment.name); setEditingSegment(false); }} /></>}</>}

          </View>}
          {isGhostTrip(active) && !ghost && <Text style={s.body}>Den valgte skyggen er ikke tilgjengelig. Turen registreres fortsatt som en skyggetur.</Text>}
          <StretchResults results={activeStretches} live />
          <Button title={busy ? 'Lagrer …' : 'Avslutt og lagre tur'} icon="check" onPress={finish} disabled={busy} />
        </> : <>
          <Button title={busy ? 'Et lite øyeblikk …' : 'Start en tur'} icon="arrow" onPress={() => { setFinderStart(null); setSelectedDiscovery(null); setGhostId(null); setStartReady(false); setModal('start'); }} disabled={busy} />
        </>}
        {data.trails.length > 0 && <><Text style={s.heading}>Lagrede strekk</Text>{data.trails.map(trail => <Pressable key={trail.id} accessibilityRole="button" accessibilityLabel={`Åpne strekk: ${trail.name}`} onPress={() => openTrail(trail)} style={[s.card, s.between]}><View style={{ flex: 1 }}><Text style={s.subheading}>{trail.name}</Text><Text style={s.small}>{date(trail.createdAt)}</Text></View><Icon name="arrow" /></Pressable>)}</>}
      </>}

      {tab === 'history' && <>
        <View style={[s.card, s.row]}><Metric value={`${data.trips.length}`} label="lagrede turer" /><Metric value={kmLabel(totals.meters)} label="kilometer" /><Metric value={`${Math.round(totals.ascent)}`} label="høydemeter opp" /></View>
        {!references.length && <Empty title="Ingen turer ennå" icon="book">Turene dine vises her når de er lagret.</Empty>}
        {data.trips.map(trip => { const m = tripMetrics(trip); return <Pressable key={trip.id} accessibilityRole="button" onPress={() => { setFinishedTripId(null); setSelectedTrip(trip.id); }} style={s.card}><View style={s.between}><Text style={s.eyebrow}>{date(trip.startedAt).toUpperCase()}</Text><Icon name="arrow" size={18} /></View><Text style={s.heading}>{trip.name}</Text><View style={s.row}><Metric value={kmLabel(m.meters)} label="km" /><Metric value={durationLabel(m.elapsed)} label="total tid" /><Metric value={m.hasElevation ? `${Math.round(m.ascent)}` : '—'} label="hm opp" /></View></Pressable>; })}
      </>}

      {tab === 'profile' && <>
        <NeighborhoodCard results={neighborhood} area={nearby.area} pending={collection.pending} error={collection.error} live={nearby.live} onPress={kind => { setNeighborhoodKind(kind); setModal('neighborhood'); }} />
        <View style={[s.card, s.row]}><Metric value={`${Math.floor(totals.elapsed / 3_600_000)} t`} label="ute på tur" /><Metric value={`${data.trails.length}`} label="lagrede strekk" /><Metric value={`${findCount}`} label="funn" /></View>
        <Button accessibilityLabel="Åpne samlingen min" secondary title={`Samlingen min · ${findCount} funn`} icon="check" onPress={() => setModal('collection')} />
        <Button accessibilityLabel="Åpne mine mål" secondary title={`Mine mål · ${data.goals.length} aktive`} icon="mountain" onPress={() => setModal('goals')} />
        <Avatar trips={data.trips} collected={findCount} />
        <Button secondary title={editWeight ? 'Skjul energiinnstilling' : 'Vekt for energianslag · valgfritt'} onPress={() => setEditWeight(v => !v)} />
        {editWeight && <View style={s.card}><Text style={s.subheading}>Et grovt energianslag</Text><Text style={s.body}>Vekten brukes til et grovt energianslag etter turen.</Text><Text style={s.small}>Vekt i kg · valgfritt, bare lagret på mobilen</Text><TextInput accessibilityLabel="Vekt i kilogram, valgfritt" keyboardType="decimal-pad" style={s.input} value={weightText} onChangeText={setWeightText} placeholder="F.eks. 75" /><Button secondary title="Lagre innstilling" onPress={() => { const n = weightText.trim() ? Number(weightText.replace(',', '.')) : null; if (n !== null && (!Number.isFinite(n) || n < 25 || n > 300)) { Alert.alert('Sjekk vekten', 'Oppgi mellom 25 og 300 kg, eller la feltet være tomt.'); return; } getStore().setSetting('profile', { weightKg: n }); refresh(); Alert.alert('Lagret', n === null ? 'Energianslaget er slått av.' : 'Vekten er lagret lokalt.'); setEditWeight(false); }} /></View>}
        <Button secondary title="Eksporter turloggen" onPress={() => attempt(async () => { await exportLog(data.trips, data.trails, data.discoveries, data.awards); })} />
        <Button secondary title={showInfo ? 'Skjul appinformasjon' : 'Om tidtaking, lagring og kart'} onPress={() => setShowInfo(v => !v)} />
        {showInfo && <View style={s.card}><Text style={s.subheading}>Hele turen teller</Text><Text style={s.body}>Tiden går fra start til slutt, inkludert pauser. GPS-støy filtreres fra distanse og høyde.</Text><Text style={s.subheading}>Lagret på mobilen</Text><Text style={s.body}>Turer, strekk og valgfri vekt lagres lokalt. Eksporter turene for å ta en kopi; vekten følger ikke med. Avinstallering eller sletting av appdata kan fjerne turloggen.</Text><Text style={s.subheading}>Tråkkvennen</Text><Text style={s.body}>XP og utstyr følger turene og funnene dine. Hver milepæl teller én gang. Slettes en tur, beregnes fremgangen på nytt.</Text><Text style={s.subheading}>Kart og nett</Text><Text style={s.small}>Kartverket · OpenFreeMap · © OpenStreetMap-bidragsytere (ODbL). Satellittbilder fra MapTiler når aktivert. Kartforespørsler deler visningsområdet med leverandøren. Kartbakgrunnen trenger nett; registrering og lagring kan fungere uten mobildata. Åpningstider og adgang er ikke kontrollert.</Text></View>}

      </>}
    </ScrollView>
    {active && peg && <Pressable accessibilityRole="button" accessibilityLabel={`Aktivt startmerke, ${peg.atTripStart ? 'turstart' : 'satt'} klokken ${pegClock}. ${pegWhere}. Vis i kartet.`} onPress={() => setModal('peg')} style={{ marginHorizontal: 12, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.pale, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Icon name="location" size={22} /><View style={{ flex: 1, gap: 3 }}><Text style={s.chipText}>Aktivt startmerke · {peg.atTripStart ? 'turstart' : pegClock}</Text><Text numberOfLines={2} style={s.small}>{pegWhere} · {Math.max(0, Math.floor((now - peg.from) / 60000))} min siden</Text></View><Icon name="arrow" size={18} />
    </Pressable>}
    {active && segmentNotice && now < segmentNoticeUntil && <View accessibilityLiveRegion="polite" style={[s.notice, { marginHorizontal: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }]}><Text style={[s.small, { flex: 1, color: colors.ink }]}>{segmentNotice}</Text>{data.segmentUndo && now <= data.segmentUndo.expiresAt && <Pressable accessibilityRole="button" accessibilityLabel={`Angre · ${Math.max(1, Math.ceil((data.segmentUndo.expiresAt - now) / 1000))} sek`} onPress={() => attempt(async () => { getStore().undoSegment(active.id); setEditingSegment(false); setNow(Date.now()); setSegmentNotice('Angret. GPS-sporet er beholdt.'); })} style={{ padding: 12, backgroundColor: colors.ink, borderRadius: 12 }}><Text style={{ color: colors.paper, fontWeight: '700' }}>Angre · {Math.max(1, Math.ceil((data.segmentUndo.expiresAt - now) / 1000))} s</Text></Pressable>}</View>}
    <View style={{ flexDirection: 'row', paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12), paddingHorizontal: 12, backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.line }}>{tabs.map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: item.id === tab }} onPress={() => setTab(item.id)} style={{ flex: 1, alignItems: 'center', gap: 5, paddingVertical: 6 }}><View style={{ backgroundColor: tab === item.id ? colors.pale : 'transparent', paddingHorizontal: 18, paddingVertical: 5, borderRadius: 20 }}><Icon name={item.icon} color={tab === item.id ? colors.ink : '#8A9386'} size={22} /></View><Text style={{ fontSize: 10, fontWeight: tab === item.id ? '700' : '500', color: tab === item.id ? colors.ink : colors.muted }}>{item.title}</Text></Pressable>)}</View>
  </SafeAreaView>
  {modal === 'peg' && active && peg && <Sheet title="Aktivt startmerke" onClose={() => setModal(null)}>
    <Text style={s.subheading}>{peg.atTripStart ? 'Turstart' : 'Startmerke satt'} · kl. {pegClock}</Text>
    <Text style={s.body}>{pegWhere}</Text>
    {peg.point ? <TrailMap segmentStart={peg.point} focus={peg.point} current={metrics?.points} position={metrics?.points.at(-1)} positionStale={!metrics?.points.length || now - metrics.points.at(-1)!.timestamp > 30000} height={280} /> : <Text style={s.body}>Startmerket er aktivt fra turstart. Plasseringen vises når første brukbare GPS-punkt er registrert.</Text>}
    <Text style={s.body}>Dette er turens eneste aktive startmerke.{!isGhostTrip(active) ? ' «Lagre strekk hit» lagrer fra merket til der du er, og flytter merket videre til sluttpunktet.' : ' Turstart beholdes som merke mens du følger skyggen.'}</Text>
    {!isGhostTrip(active) && <Button secondary title="Sett nytt startmerke her" disabled={busy} onPress={movePeg} />}
    <Button title="Tilbake til turen" onPress={() => { setModal(null); setTab('explore'); }} />
  </Sheet>}
  {modal === 'collection' && <Sheet title="Samlingen min" onClose={() => setModal(null)}>
    <Discoveries onRename={renameDiscovery} items={data.discoveries} progress={progress} checking={collection.pending} checked={collection.processed} error={collection.error} onRetry={collection.retry} syncError={data.syncError} busy={busy || syncing} onSync={syncDiscoveries} onMap={item => { setModal(null); setSelectedDiscovery(item); setFocus(item); setExploreMode('map'); setTab('explore'); }} />
  </Sheet>}
  {modal === 'neighborhood' && <Sheet title="Nærområdet ditt" onClose={() => setModal(null)}><NeighborhoodDetails results={neighborhood} initialKind={neighborhoodKind} area={nearby.area} pending={collection.pending} error={collection.error} live={nearby.live} progress={progress} syncError={data.syncError} busy={busy || syncing} onSync={syncDiscoveries} onRetry={collection.retry} onMap={item => { setModal(null); setSelectedDiscovery(item); setFocus(item); setExploreMode('map'); setTab('explore'); }} /></Sheet>}
  {modal === 'goals' && <Sheet title="Mine mål" onClose={() => { goalSearch.cancel(); setModal(null); }}><Goals homeArea={nearby.area} radius={nearby.radius} goals={data.goals} catalog={data.catalog} trips={data.trips} loading={goalSearch.loading} error={goalSearch.error} onCancel={goalSearch.cancel} onToggle={toggleGoal} onLoad={loadGoals} onBergen={loadBergenGoal} onArea={() => { goalSearch.cancel(); setModal(null); setTab('explore'); }} /></Sheet>}
  {modal === 'ghost' && <Sheet title="Velg din skygge" onClose={() => setModal('start')}><Text style={s.body}>Velg et lagret strekk eller en tidligere tur og start nær samme sted. Skyggen følger den gamle tidslinjen, også gjennom pausene.</Text><Button secondary title="Gå uten skygge" onPress={() => { setGhostId(null); setModal('start'); }} />{!references.length && <Empty title="Først setter du et spor" icon="ghost">Etter den første turen kan du gå sammen med skyggen din.</Empty>}{references.filter(t => cleanPoints(t.points).length > 1).map(t => <Pressable accessibilityRole="button" key={t.id} style={s.card} onPress={() => repeatWithGhost(t)}><Text style={s.subheading}>{t.name}</Text><Text style={s.small}>{date(t.startedAt)} · {durationLabel((t.endedAt ?? t.startedAt) - t.startedAt)}</Text></Pressable>)}</Sheet>}
  {modal === 'trail' && selectedTrail && <SavedTrailDetails canRename={!active || !isGhostTrip(active)} onChange={refresh} trail={selectedTrail} onClose={() => setModal(null)} onGhost={() => repeatWithGhost(trailReference(selectedTrail))} onTrip={() => { setModal(null); setFinishedTripId(null); setSelectedTrip(selectedTrail.tripId); }} />}
  {modal === 'start' && <Sheet title="Start tur" onClose={() => { setFinderStart(null); setModal(null); }}>{selectedDiscovery && !ghost && <Text style={s.subheading}>Valgt {selectedDiscovery.kind === 'street' ? 'gate' : 'sti'}: {selectedDiscovery.name}</Text>}<Button secondary icon="compass" title={selectedDiscovery ? 'Velg en annen sti' : 'Velg sti på kartet'} onPress={() => { setModal(null); setFinderStart(null); setExploreMode('map'); setTab('explore'); exploreScroll.current?.scrollTo({ y: 0, animated: true }); }} /><WorkoutPicker value={training} onChange={setTraining} /><Button secondary icon="ghost" title={ghost ? `Endre skygge: ${ghost.name}` : "Ta med en skygge (valgfritt)"} onPress={() => setModal('ghost')} />{ghost && <><StartGuide key={ghost.id} reference={ghost} onReady={setStartReady} /><Button secondary title="Gå uten skygge" onPress={() => setGhostId(null)} /></>}{!ghost && finderStart && <StartGuide key={finderStart.id} destination={finderStart} onReady={setStartReady} />}{!data.trips.length && <Text style={s.small}>Tid og GPS registreres også med låst skjerm. Tillat nøyaktig posisjon, bakgrunnsposisjon og varsler når Android spør.</Text>}<View style={s.card}><Text style={s.subheading}>{'Kommentarer underveis'}</Text><View style={s.between}><Text style={[s.body, { flex: 1 }]}>{training === '4x4' ? 'Taletrener med lyd' : 'Kommentarer med lyd'}</Text><Switch accessibilityLabel="Tale underveis" value={audio} onValueChange={setAudio} trackColor={{ true: colors.ink }} /></View></View><Button title={busy ? 'Starter GPS …' : (ghost || finderStart) && !startReady ? 'Gå til startpunktet først' : 'Start turen min'} icon="arrow" disabled={busy || (!!(ghost || finderStart) && !startReady)} onPress={() => attempt(async () => { await startTracking(ghostId, audio, undefined, undefined, training, ghost ? undefined : finderStart?.point); setFinderStart(null); setModal(null); setTab('explore'); setServiceMissing(false); })} /></Sheet>}
  {detail && <TripDetails medals={detailMedals} stretches={detailStretches} items={data.discoveries} homeArea={null} justFinished={detail.id === finishedTripId} rewards={visited => <TripRewards visited={visited} onRename={renameDiscovery} trip={detail} trips={data.trips} items={data.discoveries} progress={progress} pending={collection.pending} syncPending={syncing || !!data.syncError} error={collection.error} goals={data.goals} onMap={item => { setSelectedTrip(null); setFinishedTripId(null); setSelectedDiscovery(item); setFocus(item); setExploreMode('map'); setTab('explore'); }} />} allowSegments={!active || !isGhostTrip(active)} key={detail.id} trip={detail} reference={references.find(t => t.id === detail.ghostId) ?? null} weight={data.profile.weightKg} onDelete={() => { if (ghostId === detail.id) setGhostId(null); setSelectedTrip(null); refresh(); }} onClose={() => { setSelectedTrip(null); setFinishedTripId(null); }} onChange={refresh} onGhost={() => repeatWithGhost(detail)} />}
  </View>;
}
class Boundary extends React.Component<{ children: React.ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() { return this.state.error ? <SafeAreaView style={[s.screen, { padding: 24, justifyContent: 'center', gap: 20 }]}><Text style={s.title}>Vi snublet litt.</Text><Text style={s.body}>Tråkk kunne ikke åpne skjermen. Lukk og åpne appen igjen. Ikke slett appdata – turloggen kan fortsatt være lagret.</Text></SafeAreaView> : this.props.children; }
}
function Startup() {
  const [data, setData] = useState<ReturnType<typeof snapshot> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    // Paint the native spinner and explanation before opening/reading SQLite.
    const timer = setTimeout(() => {
      try { setData(snapshot()); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    }, 80);
    return () => clearTimeout(timer);
  }, [retry]);
  if (data) return <Trakk initialData={data} />;
  return <SafeAreaView style={[s.screen, { padding: 30, alignItems: 'center', justifyContent: 'center', gap: 20 }]}>
    <StatusBar style="dark" />
    <Image source={require('./assets/trakk-icon.png')} style={{ width: 80, height: 80, borderRadius: 22 }} />
    <Text style={s.heading}>{error ? 'Kunne ikke åpne turloggen' : 'Åpner Tråkk …'}</Text>
    {error ? <><Text style={s.body}>{error}</Text><Button title="Prøv igjen" onPress={() => { setError(null); setRetry(n => n + 1); }} /></> : <><ActivityIndicator size="large" color={colors.ink} /><Text style={[s.body, { textAlign: 'center' }]}>Laster turene og kartområdet ditt. Store samlinger kan ta litt tid.</Text></>}
  </SafeAreaView>;
}
export default function App() { return <SafeAreaProvider><Boundary><Startup /></Boundary></SafeAreaProvider>; }
