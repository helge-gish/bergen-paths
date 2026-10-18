import { isGhostTrip } from './src/domain/types';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Image, Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { getStore } from './src/data/native';
import { startTracking, finishTracking, trackingRunning, resumeTracking, toFix } from './src/services/tracking';
import { tripMetrics, durationLabel, kmLabel, energyEstimate, shortDistance } from './src/domain/metrics';
import { ghostComparison, gapLabel } from './src/domain/ghost';
import { matchRoute } from './src/domain/routeMatch';
import type { HomeArea } from './src/domain/areas';
import { areaGoals, bergenGoal, type Goal } from './src/domain/goals';
import { syncCollections, pendingSurveys, mergeIntoStore, loadArea } from './src/services/collectionSync';
import { AreaPicker, Goals } from './src/ui/Goals';
import { Avatar } from './src/ui/Avatar';
import { cleanPoints } from './src/domain/geo';
import type { Coordinate, Trail, Trip } from './src/domain/types';
import { colors, styles as s } from './src/ui/theme';
import { Button, Empty, ElevationChart, Icon, type IconName, Metric } from './src/ui/components';
import { TrailMap } from './src/ui/TrailMap';
import { trailReference } from './src/domain/trailReference';
import { Compass } from './src/ui/Compass';
import { Discoveries } from './src/ui/Discoveries';
import { type Discovery } from './src/domain/discoveries';
import { useCollectionProgress } from './src/ui/useCollectionProgress';
import { fetchPeaks } from './src/services/osm';
import { exportLog } from './src/services/export';

type Tab = 'explore' | 'passport' | 'history' | 'profile';
const tabs: { id: Tab; title: string; icon: IconName }[] = [{ id: 'explore', title: 'Utforsk', icon: 'map' }, { id: 'passport', title: 'Turpass', icon: 'check' }, { id: 'history', title: 'Turlogg', icon: 'book' }, { id: 'profile', title: 'Deg', icon: 'user' }];
const date = (timestamp: number) => new Date(timestamp).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long' });
const decimal = (n: number) => n.toLocaleString('nb-NO', { maximumFractionDigits: 1 });
function snapshot() {
  const store = getStore(), trips = store.trips(), discoveries = store.setting<Discovery[]>('osmDiscoveries', []), awards = store.setting<Record<string, number>>('osmAwards', {});
  const active = store.active();
  return { active, segmentWindow: active ? store.segmentWindow(active.id) : null, trips, trails: store.trails(), discoveries, awards, homeArea: store.setting<HomeArea | null>('homeArea', null), goals: store.setting<Goal[]>('goals', []), catalog: store.setting<Goal[]>('goalCatalog', []), avatarColor: store.setting('avatarColor', '#E8A164'), syncError: store.setting<string | null>('collectionSyncError', null), profile: store.profile(), error: store.setting<string | null>('trackingError', null), audioError: store.setting<string | null>('audioError', null) };
}
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}><SafeAreaView style={s.screen}><View style={[s.between, { padding: 22 }]}><Text style={[s.heading, { flex: 1 }]}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Lukk" onPress={onClose} style={{ padding: 10 }}><Icon name="close" /></Pressable></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>{children}</ScrollView></SafeAreaView></Modal>;
}
function TripDetails({ trip, reference, weight, onClose, onChange, onGhost, onDelete, allowSegments }: { trip: Trip; reference: Trip | null; weight: number | null; onClose: () => void; onChange: () => void; onGhost: () => void; onDelete: () => void; allowSegments: boolean }) {
  const [name, setName] = useState(trip.name), [trailName, setTrailName] = useState('');
  const [fromMinute, setFromMinute] = useState('0'), [toMinute, setToMinute] = useState('');
  const metrics = useMemo(() => tripMetrics(trip), [trip]);
  const energy = useMemo(() => energyEstimate(trip, weight), [trip, weight]);
  const match = useMemo(() => reference ? matchRoute(trip, reference, trip.endedAt ?? Date.now()) : null, [trip, reference]);
  const saveTrail = () => {
    try {
      const from = Number(fromMinute.replace(',', '.')) * 60_000 + trip.startedAt;
      const to = toMinute.trim() ? Number(toMinute.replace(',', '.')) * 60_000 + trip.startedAt : trip.endedAt!;
      getStore().saveTrail(trip.id, trailName, from, to); onChange(); setTrailName('');
      Alert.alert('Et nytt Tråkk', 'Stien er lagret på kartet og tilgjengelig i kompasset ditt.');
    } catch (e) { Alert.alert('Kunne ikke lagre stien', e instanceof Error ? e.message : String(e)); }
  };
  const confirmDelete = () => Alert.alert('Slette turen?', 'Turen og GPS-sporet slettes permanent, sammen med egne stier lagret fra turen. Samlingen beregnes fra turene som er igjen.', [
    { text: 'Avbryt', style: 'cancel' },
    { text: 'Slett tur', style: 'destructive', onPress: () => {
      try { getStore().deleteTrip(trip.id); onDelete(); }
      catch (e) { Alert.alert('Kunne ikke slette turen', e instanceof Error ? e.message : String(e)); }
    } },
  ]);
  return <Sheet title="Ditt spor" onClose={onClose}>
    <Text style={s.eyebrow}>{date(trip.startedAt).toUpperCase()}</Text>
    <TextInput accessibilityLabel="Navn på turen" style={[s.input, { fontSize: 23, fontWeight: '700' }]} value={name} maxLength={80} onChangeText={setName} />
    {name !== trip.name && <Button secondary title="Lagre turnavn" onPress={() => { try { getStore().rename(trip.id, name); onChange(); } catch (e) { Alert.alert('Navn mangler', String(e)); } }} />}
    <TrailMap fitRoute current={metrics.points} reference={reference?.points} focus={metrics.points[0]} height={250} />
    <View style={s.row}><Metric value={durationLabel(metrics.elapsed)} label="total tid · med alle pauser" /><Metric value={kmLabel(metrics.meters)} label="kilometer" /></View>
    <View style={s.row}><Metric value={metrics.hasElevation ? `${Math.round(metrics.ascent)}` : '—'} label="høydemeter opp" /><Metric value={metrics.hasElevation ? `${Math.round(metrics.descent)}` : '—'} label="høydemeter ned" /><Metric value={decimal(metrics.averageKmh)} label="km/t · hele turen" /></View>
    <Pressable accessibilityRole="button" accessibilityLabel="Slett tur" onPress={confirmDelete} style={{ paddingVertical: 12 }}><Text style={{ color: colors.coral, fontWeight: '700' }}>Slett tur</Text></Pressable>
    <View style={s.card}><ElevationChart values={metrics.points.filter(p => p.altitudeAccuracy !== null && p.altitudeAccuracy >= 0 && p.altitudeAccuracy <= 15).map(p => p.altitude)} /></View>
    {metrics.gapsMs > 0 && <View style={s.notice}><Text style={s.small}>Sporet har GPS-opphold. Tiden er komplett, men distanse og høydemeter kan være for lave. Oppholdene tegnes ikke som rette stier.</Text></View>}
    <View style={s.card}><Text style={s.subheading}>Litt mer om turen</Text><Text style={s.body}>Tempo: {metrics.paceSeconds === null ? '—' : `${Math.floor(Math.round(metrics.paceSeconds) / 60)}:${String(Math.round(metrics.paceSeconds) % 60).padStart(2, '0')} min/km`}{'\n'}Stigning per time: {metrics.hasElevation && metrics.elapsed > 0 ? `${Math.round(metrics.ascent / (metrics.elapsed / 3_600_000))} hm/t` : '—'}{'\n'}Grov energi: {energy ? `${energy.low}–${energy.high} kcal` : 'ikke nok data'}</Text><Text style={s.small}>Energi er et grovt anslag med hvile inkludert, ikke en måling. Terreng, sekk, kondisjon og individuelle forskjeller gir stor usikkerhet. Oppgi vekt under Deg for å aktivere anslaget.</Text></View>
    {match && <View style={s.card}><Icon name="ghost" /><Text style={s.subheading}>{match.label}</Text>{match.deviated && <Text style={s.body}>Dette var ikke nøyaktig samme tur. Vi kårer ingen tidsrekord mot den gamle ruten.</Text>}{allowSegments && !isGhostTrip(trip) && match.newSegments.map((part, i) => <Button key={part.startedAt} secondary title={`Navngi sporparti ${i + 1}`} onPress={() => { setFromMinute(((part.startedAt - trip.startedAt) / 60_000).toFixed(2)); setToMinute(part.endedAt ? ((part.endedAt - trip.startedAt) / 60_000).toFixed(2) : ''); }} />)}</View>}
    <Button icon="ghost" title="Bruk denne turen som skygge" onPress={onGhost} disabled={metrics.points.length < 2} />
    {allowSegments && !isGhostTrip(trip) && <View style={s.card}><Text style={s.eyebrow}>GI STIEN ET NAVN</Text><Text style={s.subheading}>Et spor som er ditt.</Text><Text style={s.body}>Lagre hele tursporet, eller velg et tidsrom fra turen. Navnet blir synlig i ditt kart og kompass.</Text><TextInput accessibilityLabel="Navn på stien" placeholder="F.eks. Stien langs elven" placeholderTextColor={colors.muted} value={trailName} onChangeText={setTrailName} maxLength={80} style={s.input} /><View style={s.row}><View style={{ flex: 1, gap: 5 }}><Text style={s.small}>Fra minutt</Text><TextInput accessibilityLabel="Startminutt for stien" keyboardType="decimal-pad" style={s.input} value={fromMinute} onChangeText={setFromMinute} /></View><View style={{ flex: 1, gap: 5 }}><Text style={s.small}>Til minutt (tomt = slutt)</Text><TextInput accessibilityLabel="Sluttminutt for stien" keyboardType="decimal-pad" style={s.input} value={toMinute} onChangeText={setToMinute} placeholder="Slutten" /></View></View><Button secondary title="Lagre stien min" onPress={saveTrail} /></View>}
  </Sheet>;
}

function SavedTrailDetails({ trail, onClose, onGhost, onTrip, onChange, canRename }: { trail: Trail; onClose: () => void; onGhost: () => void; onTrip: () => void; onChange: () => void; canRename: boolean }) {
  const [name, setName] = useState(trail.name);
  const reference = useMemo(() => trailReference(trail), [trail]);
  const metrics = useMemo(() => tripMetrics(reference), [reference]);
  return <Sheet title="Stien din" onClose={onClose}>
    <Text style={s.title}>{trail.name}</Text>
    <TrailMap fitRoute current={reference.points} height={300} />
    <View style={s.row}><Metric value={kmLabel(metrics.meters)} label="kilometer" /><Metric value={durationLabel(metrics.elapsed)} label="tid med pauser" /></View>
    <Button icon="ghost" title="Gå denne igjen med skygge" onPress={onGhost} disabled={reference.points.length < 2} />
    <Text style={s.body}>Start ved begynnelsen av stien. Skyggen følger tiden og pausene mellom de lagrede GPS-punktene.</Text>
    {canRename && <><TextInput accessibilityLabel="Navn på lagret sti" value={name} onChangeText={setName} maxLength={80} style={s.input} />{name.trim() && name !== trail.name && <Button secondary title="Lagre stinavn" onPress={() => { try { getStore().renameTrail(trail.id, name); onChange(); } catch (e) { Alert.alert('Kunne ikke endre navn', String(e)); } }} />}</>}
    <Button secondary title="Åpne opprinnelig tur" onPress={onTrip} />
  </Sheet>;
}

function Trakk({ initialData }: { initialData: ReturnType<typeof snapshot> }) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState(initialData), [tab, setTab] = useState<Tab>('explore');
  const [busyMessage, setBusyMessage] = useState('Arbeider …');
  const [now, setNow] = useState(Date.now()), [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<'compass' | 'ghost' | 'start' | 'trail' | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null), [ghostId, setGhostId] = useState<string | null>(null);
  const [selectedTrailId, setSelectedTrailId] = useState<string | null>(null);
  const [selectedDiscovery, setSelectedDiscovery] = useState<Discovery | null>(null);
  const [segmentName, setSegmentName] = useState(''), [segmentNotice, setSegmentNotice] = useState<string | null>(null);
  const [audio, setAudio] = useState(true), [focus, setFocus] = useState<Coordinate | null>(data.homeArea ?? data.trips[0]?.points[0] ?? null), [position, setPosition] = useState<Coordinate | null>(null);
  const [serviceMissing, setServiceMissing] = useState(false), [weightText, setWeightText] = useState(data.profile.weightKg?.toString() ?? '');
  const refresh = useCallback(() => setData(snapshot()), []);
  const active = data.active;
  const progress = useCollectionProgress(data.discoveries, data.trips);
  useEffect(() => {
    if (!progress) return;
    const awards = Object.fromEntries(Object.entries(progress).filter(([, p]) => p.collected).map(([id, p]) => [id, p.firstVisit ?? Date.now()]));
    getStore().setSetting('osmAwards', awards);
    setData(previous => ({ ...previous, awards }));
  }, [progress]);
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
  const references = useMemo(() => [...data.trips, ...data.trails.map(trailReference)], [data.trips, data.trails]);
  const ghost = references.find(t => t.id === (active ? active.ghostId : ghostId)) ?? null;
  useEffect(() => { if (ghostId && !references.some(t => t.id === ghostId)) setGhostId(null); }, [references, ghostId]);
  const selectedTrail = data.trails.find(t => t.id === selectedTrailId);
  const openTrail = (trail: Trail) => { setSelectedTrailId(trail.id); setModal('trail'); };
  const repeatWithGhost = (reference: Trip) => {
    if (active) { Alert.alert('En tur pågår', 'Avslutt turen før du velger en ny skygge.'); return; }
    setGhostId(reference.id); setSelectedTrip(null); setSelectedDiscovery(null); setFocus(reference.points[0] ?? null); setTab('explore'); setModal('start');
  };
  const route = useMemo(() => active && ghost ? matchRoute(active, ghost, Date.now()) : null, [active, ghost]);
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
  const attempt = async (action: () => Promise<void>, message = 'Lagrer endringer …') => { if (busy) return; setBusyMessage(message); setBusy(true); try { await action(); } catch (e) { Alert.alert('Det gikk ikke helt', e instanceof Error ? e.message : String(e)); } finally { refresh(); setBusy(false); } };
  const locate = () => attempt(async () => {
    const permission = await Location.requestForegroundPermissionsAsync(); if (!permission.granted) throw new Error('Tillat posisjon for å finne deg på kartet.');
    const p = toFix(await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })); setPosition(p); setFocus(p);
  }, 'Finner posisjonen din …');
  const here = async (): Promise<HomeArea> => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) throw new Error('Tillat posisjon, eller søk etter et sted.');
    const p = toFix(await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }));
    setPosition(p); setFocus(p); return { latitude: p.latitude, longitude: p.longitude, name: 'Mitt område', radius: 3000 };
  };
  const syncDiscoveries = () => attempt(async () => {
    const center = focus ?? position ?? data.homeArea ?? await here();
    const streetError = await loadArea(getStore(), center, 3000);
    await syncCollections(getStore());
    Alert.alert('Samlingen er oppdatert', streetError ? `Stier og steder er hentet. Gatekartet venter: ${streetError}` : 'Alle lagrede turer sjekkes mot kartdataene. Du trenger ikke velge kategori før turen.');
  }, 'Henter kartdata for området …');
  const loadGoals = () => attempt(async () => {
    if (!data.homeArea) { setTab('profile'); Alert.alert('Velg et hjemmeområde', 'Søk etter et sted eller bruk din posisjon under Deg.'); return; }
    const streetError = await loadArea(getStore(), data.homeArea, data.homeArea.radius);
    const suggestions = areaGoals(data.homeArea, getStore().setting<Discovery[]>('osmDiscoveries', []));
    getStore().setSetting('goalCatalog', [...data.catalog.filter(g => g.curated), ...suggestions]);
    if (streetError) Alert.alert('Steder hentet, gatekart venter', streetError);
    else if (!suggestions.length) Alert.alert('Ingen mål funnet', 'Dette området mangler kartlagte turmål. Prøv et annet område.');
  }, 'Henter kartdata og lager målforslag …');
  const loadBergenGoal = () => attempt(async () => {
    // Query only the seven peaks, near their documented locations; no global name matching.
    const items = await fetchPeaks({ latitude: 60.383, longitude: 5.32 }, 6500);
    mergeIntoStore(getStore(), items);
    const goal = bergenGoal(items);
    if (!goal) throw new Error('Kartkilden fant ikke alle syv topper. Prøv igjen senere; et ufullstendig mål blir ikke aktivert.');
    getStore().setSetting('goalCatalog', [...data.catalog.filter(g => !g.curated), goal]);
  }, 'Henter de syv fjelltoppene …');
  const toggleGoal = (goal: Goal) => {
    const goals = data.goals.some(g => g.id === goal.id) ? data.goals.filter(g => g.id !== goal.id) : [...data.goals, goal];
    getStore().setSetting('goals', goals); setData(previous => ({ ...previous, goals }));
  };
  const finish = () => Alert.alert('Avslutte turen?', 'Hele tiden fra start til slutt blir lagret, inkludert pausene.', [{ text: 'Fortsett turen', style: 'cancel' }, { text: 'Avslutt og lagre', onPress: () => attempt(async () => { const id = await finishTracking(); setGhostId(null); setSelectedTrip(id); setTab('history'); }) }]);

  return <View style={s.screen}><StatusBar style="dark" /><SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
    <View style={[s.between, { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 16 }]}><View style={s.row}><View style={{ width: 38, height: 38, backgroundColor: colors.ink, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}><Image source={require('./assets/trakk-icon.png')} style={{ width: 38, height: 38, borderRadius: 12 }} /></View><Text style={{ fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -1.2 }}>tråkk<Text style={{ color: colors.coral }}>.</Text></Text></View></View>
    {(busy || syncing || !progress) && <View accessibilityLiveRegion="polite" style={{ marginHorizontal: 22, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}><ActivityIndicator size="small" color={colors.ink} /><Text style={[s.small, { flex: 1 }]}>{busy ? busyMessage : syncing ? 'Henter kartdata … Du kan bruke appen imens.' : 'Sjekker turene mot kartdata … Du kan bruke appen imens.'}</Text></View>}
    {active && tab !== 'explore' && <Pressable accessibilityRole="button" onPress={() => setTab('explore')} style={{ marginHorizontal: 22, padding: 12, borderRadius: 14, backgroundColor: colors.ink }}><Text style={{ color: 'white', fontWeight: '600' }}>● Tur pågår · {durationLabel(now - active.startedAt)} →</Text></Pressable>}
    <ScrollView key={tab} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      {tab === 'explore' && <>
        <View style={s.between}><View><Text style={s.eyebrow}>{active ? 'UTE OG SETTER SPOR' : 'UTFORSK'}</Text><Text style={[s.title, { marginTop: 9 }]}>{active ? 'God tur, du.' : 'Hvor går turen?'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Finn stier med kompasset" onPress={() => setModal('compass')} style={{ backgroundColor: colors.pale, padding: 13, borderRadius: 20 }}><Icon name="compass" size={27} /></Pressable></View>
        <View style={{ gap: 9 }}><TrailMap fitReference={!!ghost} selectedDiscovery={selectedDiscovery} trips={data.trips} trails={data.trails} discoveries={data.discoveries} awards={data.awards} current={metrics?.points} reference={ghost?.points} ghost={comparison?.position} position={metrics?.points.at(-1) ?? position} focus={metrics?.points.at(-1) ?? focus ?? position} height={active ? 280 : 335} />{selectedDiscovery && <Pressable accessibilityRole="button" onPress={() => setSelectedDiscovery(null)}><Text style={s.small}>{selectedDiscovery.name} · markert i korall · Lukk ×</Text></Pressable>}<View style={s.between}><Text style={s.small}>Grønt er sporene dine. Mer å oppdage der ute.</Text><Pressable accessibilityRole="button" accessibilityLabel="Finn min posisjon" onPress={locate} disabled={busy} style={{ padding: 6 }}><Icon name="location" size={20} /></Pressable></View></View>
        {active && metrics ? <>
          <View style={{ backgroundColor: colors.ink, padding: 22, borderRadius: 24, gap: 22 }}><View style={s.between}><Text style={{ fontSize: 10, letterSpacing: 2, color: '#C2D3C3', fontWeight: '700' }}>{isGhostTrip(active) ? '● SKYGGETUR' : '● VANLIG TUR'}</Text><Icon name="clock" color={colors.yellow} size={18} /></View><Text style={{ fontSize: 46, color: colors.paper, fontWeight: '600', letterSpacing: -1, fontVariant: ['tabular-nums'] }}>{durationLabel(metrics.elapsed)}</Text><View style={s.row}><Metric light value={kmLabel(metrics.meters)} label="kilometer" /><Metric light value={metrics.hasElevation ? `${Math.round(metrics.ascent)}` : '—'} label="høydemeter opp" /><Metric light value={metrics.speedKmh === null ? '—' : decimal(metrics.speedKmh)} label="km/t akkurat nå" /></View><View style={{ height: 1, backgroundColor: '#3A594B' }} /><Text style={{ fontSize: 12, color: '#C2D3C3' }}>Snitt {decimal(metrics.averageKmh)} km/t · Ned {metrics.hasElevation ? Math.round(metrics.descent) : '—'} hm</Text></View>
          {(!metrics.points.length || now - metrics.points.at(-1)!.timestamp > 20_000 || serviceMissing || data.error) && <View style={s.notice}><Text style={s.subheading}>{serviceMissing ? 'GPS-tjenesten har stoppet' : 'Sjekk GPS-signalet'}</Text><Text style={s.body}>{data.error ?? (serviceMissing ? 'Tidtakingen fortsetter, men nye GPS-punkter kommer ikke inn. Du kan starte GPS igjen uten å nullstille tiden. Oppholdet i sporet beholdes.' : 'Venter på en fersk, nøyaktig posisjon. Tiden fortsetter. Svakt signal kan gi et ufullstendig spor.')}</Text>{serviceMissing && <Button secondary title="Fortsett GPS-registreringen" disabled={busy} onPress={() => attempt(async () => { await resumeTracking(); setServiceMissing(false); })} />}</View>}
          {ghost && <View style={s.card}><View style={s.row}><View style={{ backgroundColor: '#F5E5DC', padding: 10, borderRadius: 15 }}><Icon name="ghost" color={colors.coral} /></View><View style={{ flex: 1 }}><Text style={s.eyebrow}>MED SKYGGE</Text><Text style={s.subheading}>{ghost.name}</Text></View></View><Text style={[s.heading, { color: colors.coral }]}>{comparison?.gapSeconds !== null && comparison?.gapSeconds !== undefined ? gapLabel(comparison.gapSeconds) : 'Sammenligner sporet …'}</Text><Text style={s.small}>{comparison?.reason ?? route?.label}</Text><View style={s.between}><View style={s.row}><Icon name="sound" size={19} /><Text style={s.body}>Fortell meg med lyd</Text></View><Switch accessibilityLabel="Lydoppdateringer om skyggen" value={active.audioEnabled} trackColor={{ true: colors.ink }} onValueChange={value => { getStore().setAudio(active.id, value); if (!value) void Speech.stop(); refresh(); }} /></View>{data.audioError && <Text style={s.small}>{data.audioError}</Text>}<Text style={s.small}>Omtrent hvert minutt når rutene kan sammenlignes.</Text></View>}
          {!isGhostTrip(active) && <View style={s.card}>
            <Text style={s.eyebrow}>SAMLE STISEGMENTER</Text>
            <Text style={s.body}>Lagre det du har gått siden forrige klipp. Første segment begynner ved turstart. Turen fortsetter uavbrutt.</Text>
            <Button title="Lagre sti hit" icon="map" disabled={busy} onPress={() => attempt(async () => { getStore().clipSegment(active.id); setSegmentNotice('Stien er lagret. Neste segment starter her.'); })} />
            <Button secondary title="Sett start her" disabled={busy} onPress={() => attempt(async () => { getStore().setSegmentStart(active.id); setSegmentNotice('Neste stisegment starter her. Hele turen lagres fortsatt.'); })} />
            {segmentNotice && <Text style={s.small}>{segmentNotice}</Text>}
            {latestSegment && <><Text style={s.subheading}>Sist lagret: {latestSegment.name}</Text><TextInput accessibilityLabel="Navn på stisegmentet" placeholder="Gi stien et navn (valgfritt)" style={s.input} value={segmentName} onChangeText={setSegmentName} maxLength={80} />{segmentName.trim() && segmentName !== latestSegment.name && <Button secondary title="Lagre stinavn" disabled={busy} onPress={() => attempt(async () => { getStore().renameTrail(latestSegment.id, segmentName); setSegmentNotice('Stinavnet er lagret.'); })} />}</>}
          </View>}
          {isGhostTrip(active) && !ghost && <Text style={s.body}>Den valgte skyggen er ikke tilgjengelig. Turen registreres fortsatt som en skyggetur.</Text>}
          <Button title={busy ? 'Lagrer …' : 'Avslutt og lagre tur'} icon="check" onPress={finish} disabled={busy} />
        </> : <>
          <Button title={busy ? 'Et lite øyeblikk …' : 'Start en tur'} icon="arrow" onPress={() => setModal('start')} disabled={busy} />
          <Pressable accessibilityRole="button" onPress={() => setTab('passport')} style={s.card}><Text style={s.subheading}>Turpass og personlige mål →</Text><Text style={s.body}>Alle turer teller · {data.goals.length} aktive mål · {Object.keys(data.awards).length} stempler</Text></Pressable>
        </>}
        {data.trails.length > 0 && <><Text style={s.heading}>Dine Tråkk-stier</Text>{data.trails.map(trail => <Pressable key={trail.id} accessibilityRole="button" accessibilityLabel={`Åpne sti: ${trail.name}`} onPress={() => openTrail(trail)} style={[s.card, s.between]}><View style={{ flex: 1 }}><Text style={s.subheading}>{trail.name}</Text><Text style={s.small}>Ditt navn · lagret {date(trail.createdAt)}</Text></View><Icon name="arrow" /></Pressable>)}</>}
      </>}

      {tab === 'passport' && <>
        <Text style={s.title}>Turpasset ditt.</Text>
        <Text style={s.body}>Bare start og gå. Stier, topper, hytter, gater og andre steder samles automatisk etter lagring, også på skyggeturer. Kategoriene under filtrerer bare visningen.</Text>
        <Text style={s.small}>{syncing ? 'Henter kartdata langs lagrede turer …' : data.syncError ? `Noen kartdata venter: ${data.syncError} Turene er lagret og sjekkes igjen når appen har nett.` : 'Kartdata langs turene hentes mens appen er åpen. Manglende data prøves igjen senere.'}</Text>
        <Goals homeArea={data.homeArea} goals={data.goals} catalog={data.catalog} trips={data.trips} busy={busy || syncing} onToggle={toggleGoal} onLoad={loadGoals} onBergen={loadBergenGoal} onArea={() => setTab('profile')} />
        <Discoveries items={data.discoveries} progress={progress} busy={busy || syncing} onSync={syncDiscoveries} onMap={item => { setSelectedDiscovery(item); setFocus(item); setTab('explore'); }} />
      </>}

      {tab === 'history' && <>
        <Text style={s.eyebrow}>ALLE TURENE HAR SIN HISTORIE</Text><Text style={s.title}>Sporene dine.</Text>
        <View style={[s.card, s.row]}><Metric value={`${data.trips.length}`} label="lagrede turer" /><Metric value={kmLabel(totals.meters)} label="kilometer" /><Metric value={`${Math.round(totals.ascent)}`} label="høydemeter opp" /></View>
        {!references.length && <Empty title="Her begynner historien din" icon="book">Når du avslutter din første tur, finner du sporet, tiden og høydemeterne her.</Empty>}
        {data.trips.map(trip => { const m = tripMetrics(trip); return <Pressable key={trip.id} accessibilityRole="button" onPress={() => setSelectedTrip(trip.id)} style={s.card}><View style={s.between}><Text style={s.eyebrow}>{date(trip.startedAt).toUpperCase()}</Text><Icon name="arrow" size={18} /></View><Text style={s.heading}>{trip.name}</Text><View style={s.row}><Metric value={kmLabel(m.meters)} label="km" /><Metric value={durationLabel(m.elapsed)} label="total tid" /><Metric value={m.hasElevation ? `${Math.round(m.ascent)}` : '—'} label="hm opp" /></View></Pressable>; })}
      </>}

      {tab === 'profile' && <>
        <Text style={s.eyebrow}>LITT OM DEG OG TURENE DINE</Text><Text style={s.title}>Ditt eget tempo.</Text>
        <View style={[s.card, s.row]}><Metric value={`${Math.floor(totals.elapsed / 3_600_000)} t`} label="ute på tur" /><Metric value={`${data.trails.length}`} label="navngitte stier" /><Metric value={`${Object.keys(data.awards).length}`} label="stempler" /></View>
        <Avatar trips={data.trips} collected={Object.keys(data.awards).length} color={data.avatarColor} onColor={color => { getStore().setSetting('avatarColor', color); setData(previous => ({ ...previous, avatarColor: color })); }} />
        <AreaPicker area={data.homeArea} onHere={here} onSave={area => { getStore().setSetting('homeArea', area); setFocus(area); setData(previous => ({ ...previous, homeArea: area })); }} />
        <View style={s.card}><Text style={s.subheading}>Et grovt energianslag</Text><Text style={s.body}>Vekt kan brukes til et omtrentlig energiintervall etter turen. Det inkluderer pauser. Alder og høyde alene gjør ikke anslaget presist, så vi ber ikke om dem nå.</Text><Text style={s.small}>Vekt i kg · valgfritt, bare lagret på mobilen</Text><TextInput accessibilityLabel="Vekt i kilogram, valgfritt" keyboardType="decimal-pad" style={s.input} value={weightText} onChangeText={setWeightText} placeholder="F.eks. 75" /><Button secondary title="Lagre innstilling" onPress={() => { const n = weightText.trim() ? Number(weightText.replace(',', '.')) : null; if (n !== null && (!Number.isFinite(n) || n < 25 || n > 300)) { Alert.alert('Sjekk vekten', 'Oppgi mellom 25 og 300 kg, eller la feltet være tomt.'); return; } getStore().setSetting('profile', { weightKg: n }); refresh(); Alert.alert('Lagret', n === null ? 'Energianslaget er slått av.' : 'Vekten er lagret lokalt.'); }} /></View>
        <View style={s.card}><Text style={s.subheading}>Hele turen teller.</Text><Text style={s.body}>Ingen autopause. Ingen fratrekk for matpakken. Tiden går fra du starter til du avslutter. Distanse og høyde filtreres for GPS-støy; tiden gjør ikke det.</Text></View>
        <View style={s.card}><Text style={s.subheading}>Dine data, på din mobil</Text><Text style={s.body}>Turer, stinavn og vekt lagres lokalt. Kartleverandøren mottar forespørsler for områdene du ser på. Venner, delte skygger og frivillig liveposisjon er planlagt. Denne versjonen har ikke kontoer eller nettbasert deling.</Text><Text style={s.small}>Avinstallering eller sletting av appdata kan fjerne turloggen. Ingen skysikkerhetskopi er satt opp. Du kan eksportere turer og samling som en JSON-fil; vekten følger ikke med.</Text><Button secondary title="Eksporter turloggen som JSON" onPress={() => attempt(async () => { await exportLog(data.trips, data.trails, data.discoveries, data.awards); })} /></View>
        <View style={s.card}><Text style={s.subheading}>Kart og datakilder</Text><Text style={s.body}>Kart: OpenFreeMap · © OpenStreetMap-bidragsytere (ODbL). Målforslag bygges fra kartdata i området du velger. De syv byfjellene i Bergen er ett valgfritt mål. Hytteåpningstider og adgang er ikke kontrollert.</Text><Text style={s.small}>Kartbakgrunnen trenger nett. Aktiv GPS-registrering og lokal lagring kan fungere uten mobildata. Ingen offlinekart er lastet ned.</Text></View>
      </>}
    </ScrollView>
    <View style={{ flexDirection: 'row', paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12), paddingHorizontal: 12, backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.line }}>{tabs.map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: item.id === tab }} onPress={() => setTab(item.id)} style={{ flex: 1, alignItems: 'center', gap: 5, paddingVertical: 6 }}><View style={{ backgroundColor: tab === item.id ? colors.pale : 'transparent', paddingHorizontal: 18, paddingVertical: 5, borderRadius: 20 }}><Icon name={item.icon} color={tab === item.id ? colors.ink : '#8A9386'} size={22} /></View><Text style={{ fontSize: 10, fontWeight: tab === item.id ? '700' : '500', color: tab === item.id ? colors.ink : colors.muted }}>{item.title}</Text></Pressable>)}</View>
  </SafeAreaView>
  {modal === 'compass' && <Sheet title="Hva ligger den veien?" onClose={() => setModal(null)}><Compass trails={data.trails} onOpen={openTrail} /></Sheet>}
  {modal === 'ghost' && <Sheet title="Velg din skygge" onClose={() => setModal('start')}><Text style={s.body}>Velg en lagret sti eller tidligere tur og start nær samme sted. Skyggen følger den gamle tidslinjen, også gjennom pausene.</Text><Button secondary title="Gå uten skygge" onPress={() => { setGhostId(null); setModal('start'); }} />{!references.length && <Empty title="Først setter du et spor" icon="ghost">Etter den første turen kan du gå sammen med skyggen din.</Empty>}{references.filter(t => cleanPoints(t.points).length > 1).map(t => <Pressable accessibilityRole="button" key={t.id} style={s.card} onPress={() => repeatWithGhost(t)}><Text style={s.subheading}>{t.name}</Text><Text style={s.small}>{date(t.startedAt)} · {durationLabel((t.endedAt ?? t.startedAt) - t.startedAt)}</Text></Pressable>)}</Sheet>}
  {modal === 'trail' && selectedTrail && <SavedTrailDetails canRename={!active || !isGhostTrip(active)} onChange={refresh} trail={selectedTrail} onClose={() => setModal(null)} onGhost={() => repeatWithGhost(trailReference(selectedTrail))} onTrip={() => { setModal(null); setSelectedTrip(selectedTrail.tripId); }} />}
  {modal === 'start' && <Sheet title="Ut og sett spor." onClose={() => setModal(null)}><Image source={require('./assets/trakk-icon.png')} style={{ width: 64, height: 64, borderRadius: 18 }} /><Text style={s.title}>Alt er en del av turen.</Text><Text style={s.body}>Klokken går til du avslutter turen. Alle kategorier og personlige mål teller automatisk.</Text><Button secondary icon="ghost" title={ghost ? `Endre skygge: ${ghost.name}` : "Ta med en skygge (valgfritt)"} onPress={() => setModal('ghost')} />{ghost && <Button secondary title="Gå uten skygge" onPress={() => setGhostId(null)} />}<View style={s.card}><Text style={s.subheading}>GPS med skjermen låst</Text><Text style={s.body}>Tillat nøyaktig posisjon og «Tillat hele tiden» når Android spør. Tillat også varsler for å se den aktive registreringen i varselfeltet.</Text><Text style={s.small}>Telefonens batterisparing og tvangslukking kan stoppe registreringen. Før lengre turer bør du prøve en kort tur med låst skjerm.</Text></View>{ghost && <View style={s.card}><Text style={s.subheading}>Skygge: {ghost.name}</Text><View style={s.between}><Text style={[s.body, { flex: 1 }]}>Fortell meg hvordan jeg ligger an</Text><Switch accessibilityLabel="Slå på tale for skyggen" value={audio} onValueChange={setAudio} trackColor={{ true: colors.ink }} /></View><Button secondary title="Prøv stemmen" icon="sound" onPress={() => { Speech.speak('God tur! Jeg sier fra hvordan du ligger an mot skyggen din.', { language: 'nb-NO', onError: () => Alert.alert('Tale er ikke tilgjengelig', 'Kontroller at norsk tale er installert i Androids tekst-til-tale-innstillinger.') }); }} /></View>}<Button title={busy ? 'Starter GPS …' : 'Start turen min'} icon="arrow" disabled={busy} onPress={() => attempt(async () => { await startTracking(ghostId, audio); setModal(null); setTab('explore'); setServiceMissing(false); })} /></Sheet>}
  {detail && <TripDetails allowSegments={!active || !isGhostTrip(active)} key={detail.id} trip={detail} reference={references.find(t => t.id === detail.ghostId) ?? null} weight={data.profile.weightKg} onDelete={() => { if (ghostId === detail.id) setGhostId(null); setSelectedTrip(null); refresh(); }} onClose={() => setSelectedTrip(null)} onChange={refresh} onGhost={() => repeatWithGhost(detail)} />}
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
