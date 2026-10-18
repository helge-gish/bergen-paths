import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AppState, Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { getStore } from './src/data/native';
import { startTracking, finishTracking, trackingRunning, resumeTracking, toFix } from './src/services/tracking';
import { tripMetrics, durationLabel, kmLabel, energyEstimate, shortDistance } from './src/domain/metrics';
import { ghostComparison, gapLabel } from './src/domain/ghost';
import { matchRoute } from './src/domain/routeMatch';
import { PEAKS, visitedPeaks } from './src/domain/collections';
import { cleanPoints } from './src/domain/geo';
import type { Coordinate, Peak, Trail, Trip } from './src/domain/types';
import { colors, styles as s } from './src/ui/theme';
import { Button, Empty, ElevationChart, Icon, type IconName, Metric, Stamp } from './src/ui/components';
import { TrailMap } from './src/ui/TrailMap';
import { trailReference } from './src/domain/trailReference';
import { Compass } from './src/ui/Compass';
import { Discoveries } from './src/ui/Discoveries';
import { collectionProgress, type Discovery } from './src/domain/discoveries';
import { fetchDiscoveries, fetchStreets } from './src/services/osm';
import { exportLog } from './src/services/export';

type Tab = 'explore' | 'passport' | 'history' | 'profile';
const tabs: { id: Tab; title: string; icon: IconName }[] = [{ id: 'explore', title: 'Utforsk', icon: 'map' }, { id: 'passport', title: 'Turpass', icon: 'mountain' }, { id: 'history', title: 'Turlogg', icon: 'book' }, { id: 'profile', title: 'Deg', icon: 'user' }];
const date = (timestamp: number) => new Date(timestamp).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long' });
const decimal = (n: number) => n.toLocaleString('nb-NO', { maximumFractionDigits: 1 });
function snapshot() {
  const store = getStore(), trips = store.trips(), discoveries = store.setting<Discovery[]>('osmDiscoveries', []), awards = store.setting<Record<string, number>>('osmAwards', {});
  const progress = collectionProgress(discoveries, trips);
  let changed = false;
  for (const [id, p] of Object.entries(progress)) if (p.collected && awards[id] === undefined) { awards[id] = p.firstVisit ?? Date.now(); changed = true; }
  for (const item of discoveries) if (item.kind === 'street' && !progress[item.id]?.collected && awards[item.id] !== undefined) { delete awards[item.id]; changed = true; }
  if (changed) store.setSetting('osmAwards', awards);
  return { active: store.active(), trips, trails: store.trails(), discoveries, awards, profile: store.profile(), error: store.setting<string | null>('trackingError', null), audioError: store.setting<string | null>('audioError', null) };
}
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}><SafeAreaView style={s.screen}><View style={[s.between, { padding: 22 }]}><Text style={[s.heading, { flex: 1 }]}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Lukk" onPress={onClose} style={{ padding: 10 }}><Icon name="close" /></Pressable></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>{children}</ScrollView></SafeAreaView></Modal>;
}
function TripDetails({ trip, reference, weight, onClose, onChange, onGhost, onDelete }: { trip: Trip; reference: Trip | null; weight: number | null; onClose: () => void; onChange: () => void; onGhost: () => void; onDelete: () => void }) {
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
    <Text style={s.eyebrow}>{date(trip.startedAt).toUpperCase()} · BYFJELLENE</Text>
    <TextInput accessibilityLabel="Navn på turen" style={[s.input, { fontSize: 23, fontWeight: '700' }]} value={name} maxLength={80} onChangeText={setName} />
    {name !== trip.name && <Button secondary title="Lagre turnavn" onPress={() => { try { getStore().rename(trip.id, name); onChange(); } catch (e) { Alert.alert('Navn mangler', String(e)); } }} />}
    <TrailMap fitRoute current={metrics.points} reference={reference?.points} focus={metrics.points[0]} height={250} />
    <View style={s.row}><Metric value={durationLabel(metrics.elapsed)} label="total tid · med alle pauser" /><Metric value={kmLabel(metrics.meters)} label="kilometer" /></View>
    <View style={s.row}><Metric value={metrics.hasElevation ? `${Math.round(metrics.ascent)}` : '—'} label="høydemeter opp" /><Metric value={metrics.hasElevation ? `${Math.round(metrics.descent)}` : '—'} label="høydemeter ned" /><Metric value={decimal(metrics.averageKmh)} label="km/t · hele turen" /></View>
    <Pressable accessibilityRole="button" accessibilityLabel="Slett tur" onPress={confirmDelete} style={{ paddingVertical: 12 }}><Text style={{ color: colors.coral, fontWeight: '700' }}>Slett tur</Text></Pressable>
    <View style={s.card}><ElevationChart values={metrics.points.filter(p => p.altitudeAccuracy !== null && p.altitudeAccuracy >= 0 && p.altitudeAccuracy <= 15).map(p => p.altitude)} /></View>
    {metrics.gapsMs > 0 && <View style={s.notice}><Text style={s.small}>Sporet har GPS-opphold. Tiden er komplett, men distanse og høydemeter kan være for lave. Oppholdene tegnes ikke som rette stier.</Text></View>}
    <View style={s.card}><Text style={s.subheading}>Litt mer om turen</Text><Text style={s.body}>Tempo: {metrics.paceSeconds === null ? '—' : `${Math.floor(Math.round(metrics.paceSeconds) / 60)}:${String(Math.round(metrics.paceSeconds) % 60).padStart(2, '0')} min/km`}{'\n'}Stigning per time: {metrics.hasElevation && metrics.elapsed > 0 ? `${Math.round(metrics.ascent / (metrics.elapsed / 3_600_000))} hm/t` : '—'}{'\n'}Grov energi: {energy ? `${energy.low}–${energy.high} kcal` : 'ikke nok data'}</Text><Text style={s.small}>Energi er et grovt anslag med hvile inkludert, ikke en måling. Terreng, sekk, kondisjon og individuelle forskjeller gir stor usikkerhet. Oppgi vekt under Deg for å aktivere anslaget.</Text></View>
    {match && <View style={s.card}><Icon name="ghost" /><Text style={s.subheading}>{match.label}</Text>{match.deviated && <Text style={s.body}>Dette var ikke nøyaktig samme tur. Vi kårer ingen tidsrekord mot den gamle ruten.</Text>}{match.newSegments.map((part, i) => <Button key={part.startedAt} secondary title={`Navngi sporparti ${i + 1}`} onPress={() => { setFromMinute(((part.startedAt - trip.startedAt) / 60_000).toFixed(2)); setToMinute(part.endedAt ? ((part.endedAt - trip.startedAt) / 60_000).toFixed(2) : ''); }} />)}</View>}
    <Button icon="ghost" title="Bruk denne turen som skygge" onPress={onGhost} disabled={metrics.points.length < 2} />
    <View style={s.card}><Text style={s.eyebrow}>GI STIEN ET NAVN</Text><Text style={s.subheading}>Et spor som er ditt.</Text><Text style={s.body}>Lagre hele tursporet, eller velg et tidsrom fra turen. Navnet blir synlig i ditt kart og kompass.</Text><TextInput accessibilityLabel="Navn på stien" placeholder="F.eks. Den stille veien til Fløyen" placeholderTextColor={colors.muted} value={trailName} onChangeText={setTrailName} maxLength={80} style={s.input} /><View style={s.row}><View style={{ flex: 1, gap: 5 }}><Text style={s.small}>Fra minutt</Text><TextInput accessibilityLabel="Startminutt for stien" keyboardType="decimal-pad" style={s.input} value={fromMinute} onChangeText={setFromMinute} /></View><View style={{ flex: 1, gap: 5 }}><Text style={s.small}>Til minutt (tomt = slutt)</Text><TextInput accessibilityLabel="Sluttminutt for stien" keyboardType="decimal-pad" style={s.input} value={toMinute} onChangeText={setToMinute} placeholder="Slutten" /></View></View><Button secondary title="Lagre stien min" onPress={saveTrail} /></View>
  </Sheet>;
}

function SavedTrailDetails({ trail, onClose, onGhost, onTrip }: { trail: Trail; onClose: () => void; onGhost: () => void; onTrip: () => void }) {
  const reference = useMemo(() => trailReference(trail), [trail]);
  const metrics = useMemo(() => tripMetrics(reference), [reference]);
  return <Sheet title="Stien din" onClose={onClose}>
    <Text style={s.title}>{trail.name}</Text>
    <TrailMap fitRoute current={reference.points} height={300} />
    <View style={s.row}><Metric value={kmLabel(metrics.meters)} label="kilometer" /><Metric value={durationLabel(metrics.elapsed)} label="tid med pauser" /></View>
    <Button icon="ghost" title="Gå denne igjen med skygge" onPress={onGhost} disabled={reference.points.length < 2} />
    <Text style={s.body}>Start ved begynnelsen av stien. Skyggen følger tiden og pausene mellom de lagrede GPS-punktene.</Text>
    <Button secondary title="Åpne opprinnelig tur" onPress={onTrip} />
  </Sheet>;
}

function Trakk() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState(snapshot), [tab, setTab] = useState<Tab>('explore');
  const [now, setNow] = useState(Date.now()), [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<'compass' | 'ghost' | 'start' | 'trail' | null>(null), [peak, setPeak] = useState<Peak | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null), [ghostId, setGhostId] = useState<string | null>(null);
  const [selectedTrailId, setSelectedTrailId] = useState<string | null>(null);
  const [selectedDiscovery, setSelectedDiscovery] = useState<Discovery | null>(null);
  const [audio, setAudio] = useState(true), [focus, setFocus] = useState<Coordinate | null>(null), [position, setPosition] = useState<Coordinate | null>(null);
  const [serviceMissing, setServiceMissing] = useState(false), [weightText, setWeightText] = useState(data.profile.weightKg?.toString() ?? '');
  const refresh = useCallback(() => setData(snapshot()), []);
  const active = data.active;
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => { const store = getStore(); setData(prev => ({ ...prev, active: store.active(), error: store.setting<string | null>('trackingError', null), audioError: store.setting<string | null>('audioError', null) })); }, 3000);
    return () => clearInterval(timer);
  }, [active?.id]);
  useEffect(() => {
    const check = () => { refresh(); if (getStore().active()) trackingRunning().then(r => setServiceMissing(!r)).catch(() => setServiceMissing(true)); else setServiceMissing(false); };
    check(); const sub = AppState.addEventListener('change', state => { if (state === 'active') check(); }); return () => sub.remove();
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
  const verifiedPeaks = useMemo(() => PEAKS.flatMap(p => {
    const item = data.discoveries.find(d => d.kind === 'peak' && d.name.toLocaleLowerCase('nb-NO') === p.name.toLocaleLowerCase('nb-NO'));
    return item ? [{ ...p, latitude: item.latitude, longitude: item.longitude }] : [];
  }), [data.discoveries]);
  const visits = useMemo(() => visitedPeaks(data.trips, verifiedPeaks), [data.trips, verifiedPeaks]);
  const totals = useMemo(() => data.trips.reduce((sum, t) => { const m = tripMetrics(t); return { meters: sum.meters + m.meters, ascent: sum.ascent + m.ascent, elapsed: sum.elapsed + m.elapsed }; }, { meters: 0, ascent: 0, elapsed: 0 }), [data.trips]);
  const detail = data.trips.find(t => t.id === selectedTrip);
  const attempt = async (action: () => Promise<void>) => { if (busy) return; setBusy(true); try { await action(); refresh(); } catch (e) { Alert.alert('Det gikk ikke helt', e instanceof Error ? e.message : String(e)); } finally { setBusy(false); } };
  const locate = () => attempt(async () => {
    const permission = await Location.requestForegroundPermissionsAsync(); if (!permission.granted) throw new Error('Tillat posisjon for å finne deg på kartet.');
    const p = toFix(await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })); setPosition(p); setFocus(p);
  });
  const syncStreets = () => attempt(async () => {
    const items = await fetchStreets();
    const others = data.discoveries.filter(item => item.kind !== 'street');
    getStore().setSetting('osmDiscoveries', [...others, ...items]);
    Alert.alert('Gatekartet er klart', `${items.length} navngitte gater i Bergen. Lagrede turer teller også.`);
  });
  const syncDiscoveries = () => attempt(async () => {
    const center = focus ?? position ?? PEAKS.find(p => p.id === 'floyen')!;
    const items = await fetchDiscoveries(center);
    const merged = new Map(data.discoveries.map(item => [item.id, item]));
    for (const item of items) merged.set(item.id, item);
    getStore().setSetting('osmDiscoveries', [...merged.values()]);
    Alert.alert('Mer å oppdage', `${items.length} stier og turmål er hentet. Samlingen er lagret på mobilen.`);
  });
  const finish = () => Alert.alert('Avslutte turen?', 'Hele tiden fra start til slutt blir lagret, inkludert pausene.', [{ text: 'Fortsett turen', style: 'cancel' }, { text: 'Avslutt og lagre', onPress: () => attempt(async () => { const id = await finishTracking(); setGhostId(null); setSelectedTrip(id); setTab('history'); }) }]);

  return <View style={s.screen}><StatusBar style="dark" /><SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
    <View style={[s.between, { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 16 }]}><View style={s.row}><View style={{ width: 38, height: 38, backgroundColor: colors.ink, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}><Icon name="mountain" color={colors.paper} /></View><Text style={{ fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -1.2 }}>tråkk<Text style={{ color: colors.coral }}>.</Text></Text></View><View style={{ alignItems: 'flex-end', gap: 3 }}><Text style={[s.eyebrow, { letterSpacing: 1.2 }]}>BYFJELLENE</Text><Text style={s.small}>Bergen, Norge</Text></View></View>
    {active && tab !== 'explore' && <Pressable accessibilityRole="button" onPress={() => setTab('explore')} style={{ marginHorizontal: 22, padding: 12, borderRadius: 14, backgroundColor: colors.ink }}><Text style={{ color: 'white', fontWeight: '600' }}>● Tur pågår · {durationLabel(now - active.startedAt)} →</Text></Pressable>}
    <ScrollView key={tab} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      {tab === 'explore' && <>
        <View style={s.between}><View><Text style={s.eyebrow}>{active ? 'UTE OG SETTER SPOR' : 'DITT NESTE LILLE EVENTYR'}</Text><Text style={[s.title, { marginTop: 9 }]}>{active ? 'God tur, du.' : 'Bare én sti til.'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Finn stier med kompasset" onPress={() => setModal('compass')} style={{ backgroundColor: colors.pale, padding: 13, borderRadius: 20 }}><Icon name="compass" size={27} /></Pressable></View>
        <View style={{ gap: 9 }}><TrailMap fitReference={!!ghost} selectedDiscovery={selectedDiscovery} trips={data.trips} trails={data.trails} discoveries={data.discoveries} awards={data.awards} peaks={verifiedPeaks} current={metrics?.points} reference={ghost?.points} ghost={comparison?.position} position={metrics?.points.at(-1) ?? position} focus={focus} onPeak={setPeak} height={active ? 280 : 335} />{selectedDiscovery && <Pressable accessibilityRole="button" onPress={() => setSelectedDiscovery(null)}><Text style={s.small}>{selectedDiscovery.name} · markert i korall · Lukk ×</Text></Pressable>}<View style={s.between}><Text style={s.small}>Grønt er sporene dine. Mer å oppdage der ute.</Text><Pressable accessibilityRole="button" accessibilityLabel="Finn min posisjon" onPress={locate} disabled={busy} style={{ padding: 6 }}><Icon name="location" size={20} /></Pressable></View></View>
        {active && metrics ? <>
          <View style={{ backgroundColor: colors.ink, padding: 22, borderRadius: 24, gap: 22 }}><View style={s.between}><Text style={{ fontSize: 10, letterSpacing: 2, color: '#C2D3C3', fontWeight: '700' }}>● TUREN DIN · ALLE PAUSER TELLER</Text><Icon name="clock" color={colors.yellow} size={18} /></View><Text style={{ fontSize: 46, color: colors.paper, fontWeight: '600', letterSpacing: -1, fontVariant: ['tabular-nums'] }}>{durationLabel(metrics.elapsed)}</Text><View style={s.row}><Metric light value={kmLabel(metrics.meters)} label="kilometer" /><Metric light value={metrics.hasElevation ? `${Math.round(metrics.ascent)}` : '—'} label="høydemeter opp" /><Metric light value={metrics.speedKmh === null ? '—' : decimal(metrics.speedKmh)} label="km/t akkurat nå" /></View><View style={{ height: 1, backgroundColor: '#3A594B' }} /><Text style={{ fontSize: 12, color: '#C2D3C3' }}>Snitt {decimal(metrics.averageKmh)} km/t · Ned {metrics.hasElevation ? Math.round(metrics.descent) : '—'} hm</Text></View>
          {(!metrics.points.length || now - metrics.points.at(-1)!.timestamp > 20_000 || serviceMissing || data.error) && <View style={s.notice}><Text style={s.subheading}>{serviceMissing ? 'GPS-tjenesten har stoppet' : 'Sjekk GPS-signalet'}</Text><Text style={s.body}>{data.error ?? (serviceMissing ? 'Tidtakingen fortsetter, men nye GPS-punkter kommer ikke inn. Du kan starte GPS igjen uten å nullstille tiden. Oppholdet i sporet beholdes.' : 'Venter på en fersk, nøyaktig posisjon. Tiden fortsetter. Svakt signal kan gi et ufullstendig spor.')}</Text>{serviceMissing && <Button secondary title="Fortsett GPS-registreringen" disabled={busy} onPress={() => attempt(async () => { await resumeTracking(); setServiceMissing(false); })} />}</View>}
          {ghost && <View style={s.card}><View style={s.row}><View style={{ backgroundColor: '#F5E5DC', padding: 10, borderRadius: 15 }}><Icon name="ghost" color={colors.coral} /></View><View style={{ flex: 1 }}><Text style={s.eyebrow}>DEG MOT DEG</Text><Text style={s.subheading}>{ghost.name}</Text></View></View><Text style={[s.heading, { color: colors.coral }]}>{comparison?.gapSeconds !== null && comparison?.gapSeconds !== undefined ? gapLabel(comparison.gapSeconds) : 'Sammenligner sporet …'}</Text><Text style={s.small}>{comparison?.reason ?? route?.label}</Text><View style={s.between}><View style={s.row}><Icon name="sound" size={19} /><Text style={s.body}>Fortell meg med lyd</Text></View><Switch accessibilityLabel="Lydoppdateringer om skyggen" value={active.audioEnabled} trackColor={{ true: colors.ink }} onValueChange={value => { getStore().setAudio(active.id, value); if (!value) void Speech.stop(); refresh(); }} /></View>{data.audioError && <Text style={s.small}>{data.audioError}</Text>}<Text style={s.small}>Omtrent hvert minutt når rutene kan sammenlignes.</Text></View>}
          <Button title={busy ? 'Lagrer …' : 'Avslutt og lagre tur'} icon="check" onPress={finish} disabled={busy} />
        </> : <>
          <Button title={busy ? 'Et lite øyeblikk …' : 'Start en tur'} icon="arrow" onPress={() => setModal('start')} disabled={busy} />
          <Pressable accessibilityRole="button" onPress={() => setModal('ghost')} style={[s.between, { paddingHorizontal: 4, paddingVertical: 4 }]}><View style={s.row}><Icon name="ghost" color={colors.coral} /><View><Text style={s.subheading}>{ghost ? ghost.name : 'Ta med din egen skygge'}</Text><Text style={s.small}>{ghost ? 'Valgt tidligere tur · trykk for å endre' : 'Gå sammen med en tidligere utgave av deg'}</Text></View></View><Icon name="arrow" size={19} /></Pressable>
          <Pressable accessibilityRole="button" onPress={() => setTab('passport')} style={[s.card, { backgroundColor: colors.pale }]}><View style={s.between}><View style={{ gap: 6 }}><Text style={s.eyebrow}>DITT FØRSTE KAPITTEL</Text><Text style={s.heading}>De syv byfjellene</Text></View><Stamp visited={Object.keys(visits).length === 7} index={0} small /></View><Text style={s.body}>{Object.keys(visits).length} av 7 fjell oppdaget. Ett steg nærmere hele byen.</Text><View style={{ height: 6, backgroundColor: '#D3DECA', borderRadius: 6 }}><View style={{ height: 6, width: `${Object.keys(visits).length / 7 * 100}%`, backgroundColor: colors.ink, borderRadius: 6 }} /></View></Pressable>
        </>}
        {data.trails.length > 0 && <><Text style={s.heading}>Dine Tråkk-stier</Text>{data.trails.map(trail => <Pressable key={trail.id} accessibilityRole="button" accessibilityLabel={`Åpne sti: ${trail.name}`} onPress={() => openTrail(trail)} style={[s.card, s.between]}><View style={{ flex: 1 }}><Text style={s.subheading}>{trail.name}</Text><Text style={s.small}>Ditt navn · lagret {date(trail.createdAt)}</Text></View><Icon name="arrow" /></Pressable>)}</>}
      </>}

      {tab === 'passport' && <>
        <Text style={s.eyebrow}>SMÅ OPPDAGELSER. STORE MINNER.</Text><Text style={s.title}>Turpasset ditt.</Text><Text style={s.body}>Samle steder, ikke hastverk. Stemplene blir her, også når du tar en pause fra fjellet.</Text>
        <Discoveries items={data.discoveries} trips={data.trips} awards={data.awards} busy={busy} onSync={syncDiscoveries} onSyncStreets={syncStreets} onMap={item => { setSelectedDiscovery(item); setFocus(item); setTab('explore'); }} />
        <Text style={s.heading}>De syv byfjellene</Text>
        <View style={[s.card, { backgroundColor: colors.ink, padding: 22 }]}><Text style={{ color: '#C2D3C3', fontSize: 11, letterSpacing: 2 }}>BYFJELLENE · FØRSTE SAMLING</Text><Text style={{ fontSize: 45, color: colors.paper, fontWeight: '700' }}>{Object.keys(visits).length}<Text style={{ fontSize: 24, color: '#B6C8B9' }}> / 7</Text></Text><Text style={{ color: colors.paper, fontSize: 17 }}>Et helt lite fjellrike å oppdage.</Text></View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{PEAKS.map((p, i) => <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`${p.name}, ${visits[p.id] ? 'besøkt' : 'ikke besøkt'}`} onPress={() => setPeak(verifiedPeaks.find(v => v.id === p.id) ?? p)} style={[s.card, { width: '48%', alignItems: 'center', paddingVertical: 22 }]}><Stamp visited={!!visits[p.id]} index={i} /><Text style={s.subheading}>{p.name}</Text><Text style={s.small}>{p.elevation} moh. · {visits[p.id] ? date(visits[p.id].timestamp) : 'Venter på ditt spor'}</Text></Pressable>)}</View>
        <Text style={s.small}>Last ned OSM-kartdata for fjellets område først. Et stempel registreres etter en lagret tur med minst to nøyaktige GPS-punkter over 10 sekunder innen 70 meter fra fjellets OSM-posisjon. Eksisterende turer sjekkes også når nye kartdata hentes.</Text>
      </>}

      {tab === 'history' && <>
        <Text style={s.eyebrow}>ALLE TURENE HAR SIN HISTORIE</Text><Text style={s.title}>Sporene dine.</Text>
        <View style={[s.card, s.row]}><Metric value={`${data.trips.length}`} label="lagrede turer" /><Metric value={kmLabel(totals.meters)} label="kilometer" /><Metric value={`${Math.round(totals.ascent)}`} label="høydemeter opp" /></View>
        {!references.length && <Empty title="Her begynner historien din" icon="book">Når du avslutter din første tur, finner du sporet, tiden og høydemeterne her.</Empty>}
        {data.trips.map(trip => { const m = tripMetrics(trip); return <Pressable key={trip.id} accessibilityRole="button" onPress={() => setSelectedTrip(trip.id)} style={s.card}><View style={s.between}><Text style={s.eyebrow}>{date(trip.startedAt).toUpperCase()}</Text><Icon name="arrow" size={18} /></View><Text style={s.heading}>{trip.name}</Text><View style={s.row}><Metric value={kmLabel(m.meters)} label="km" /><Metric value={durationLabel(m.elapsed)} label="total tid" /><Metric value={m.hasElevation ? `${Math.round(m.ascent)}` : '—'} label="hm opp" /></View></Pressable>; })}
      </>}

      {tab === 'profile' && <>
        <Text style={s.eyebrow}>LITT OM DEG OG TURENE DINE</Text><Text style={s.title}>Ditt eget tempo.</Text>
        <View style={[s.card, s.row]}><Metric value={`${Math.floor(totals.elapsed / 3_600_000)} t`} label="ute på tur" /><Metric value={`${data.trails.length}`} label="navngitte stier" /><Metric value={`${Object.keys(visits).length}`} label="byfjell oppdaget" /></View>
        <View style={s.card}><Text style={s.subheading}>Et grovt energianslag</Text><Text style={s.body}>Vekt kan brukes til et omtrentlig energiintervall etter turen. Det inkluderer pauser. Alder og høyde alene gjør ikke anslaget presist, så vi ber ikke om dem nå.</Text><Text style={s.small}>Vekt i kg · valgfritt, bare lagret på mobilen</Text><TextInput accessibilityLabel="Vekt i kilogram, valgfritt" keyboardType="decimal-pad" style={s.input} value={weightText} onChangeText={setWeightText} placeholder="F.eks. 75" /><Button secondary title="Lagre innstilling" onPress={() => { const n = weightText.trim() ? Number(weightText.replace(',', '.')) : null; if (n !== null && (!Number.isFinite(n) || n < 25 || n > 300)) { Alert.alert('Sjekk vekten', 'Oppgi mellom 25 og 300 kg, eller la feltet være tomt.'); return; } getStore().setSetting('profile', { weightKg: n }); refresh(); Alert.alert('Lagret', n === null ? 'Energianslaget er slått av.' : 'Vekten er lagret lokalt.'); }} /></View>
        <View style={s.card}><Text style={s.subheading}>Hele turen teller.</Text><Text style={s.body}>Ingen autopause. Ingen fratrekk for matpakken. Tiden går fra du starter til du avslutter. Distanse og høyde filtreres for GPS-støy; tiden gjør ikke det.</Text></View>
        <View style={s.card}><Text style={s.subheading}>Dine data, på din mobil</Text><Text style={s.body}>Turer, stinavn og vekt lagres lokalt. Kartleverandøren mottar forespørsler for områdene du ser på. Innlogging, deling og «Sprekt!» kommer senere.</Text><Text style={s.small}>Avinstallering eller sletting av appdata kan fjerne turloggen. Ingen skysikkerhetskopi er satt opp. Du kan eksportere turer og samling som en JSON-fil; vekten følger ikke med.</Text><Button secondary title="Eksporter turloggen som JSON" onPress={() => attempt(async () => { await exportLog(data.trips, data.trails, data.discoveries, data.awards); })} /></View>
        <View style={s.card}><Text style={s.subheading}>Kart og datakilder</Text><Text style={s.body}>Kart: OpenFreeMap · © OpenStreetMap-bidragsytere (ODbL). De syv byfjellene er lagt inn som et foreløpig turmålutvalg. Hytteåpningstider og adgang er ikke kontrollert.</Text><Text style={s.small}>Kartbakgrunnen trenger nett. Aktiv GPS-registrering og lokal lagring kan fungere uten mobildata. Ingen offlinekart er lastet ned.</Text></View>
      </>}
    </ScrollView>
    <View style={{ flexDirection: 'row', paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12), paddingHorizontal: 12, backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.line }}>{tabs.map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: item.id === tab }} onPress={() => setTab(item.id)} style={{ flex: 1, alignItems: 'center', gap: 5, paddingVertical: 6 }}><View style={{ backgroundColor: tab === item.id ? colors.pale : 'transparent', paddingHorizontal: 18, paddingVertical: 5, borderRadius: 20 }}><Icon name={item.icon} color={tab === item.id ? colors.ink : '#8A9386'} size={22} /></View><Text style={{ fontSize: 10, fontWeight: tab === item.id ? '700' : '500', color: tab === item.id ? colors.ink : colors.muted }}>{item.title}</Text></Pressable>)}</View>
  </SafeAreaView>
  {modal === 'compass' && <Sheet title="Hva ligger den veien?" onClose={() => setModal(null)}><Compass trails={data.trails} onOpen={openTrail} /></Sheet>}
  {modal === 'ghost' && <Sheet title="Velg din skygge" onClose={() => setModal(null)}><Text style={s.body}>Velg en lagret sti eller tidligere tur og start nær samme sted. Skyggen følger den gamle tidslinjen, også gjennom pausene.</Text><Button secondary title="Gå uten skygge" onPress={() => { setGhostId(null); setModal(null); }} />{!references.length && <Empty title="Først setter du et spor" icon="ghost">Etter den første turen kan du gå sammen med skyggen din.</Empty>}{references.filter(t => cleanPoints(t.points).length > 1).map(t => <Pressable accessibilityRole="button" key={t.id} style={s.card} onPress={() => repeatWithGhost(t)}><Text style={s.subheading}>{t.name}</Text><Text style={s.small}>{date(t.startedAt)} · {durationLabel((t.endedAt ?? t.startedAt) - t.startedAt)}</Text></Pressable>)}</Sheet>}
  {modal === 'trail' && selectedTrail && <SavedTrailDetails trail={selectedTrail} onClose={() => setModal(null)} onGhost={() => repeatWithGhost(trailReference(selectedTrail))} onTrip={() => { setModal(null); setSelectedTrip(selectedTrail.tripId); }} />}
  {modal === 'start' && <Sheet title="Ut og sett spor." onClose={() => setModal(null)}><Icon name="mountain" size={60} /><Text style={s.title}>Alt er en del av turen.</Text><Text style={s.body}>Klokken går til du avslutter turen. Også når du stopper for utsikten.</Text><View style={s.card}><Text style={s.subheading}>GPS med skjermen låst</Text><Text style={s.body}>Tillat nøyaktig posisjon og «Tillat hele tiden» når Android spør. Tillat også varsler for å se den aktive registreringen i varselfeltet.</Text><Text style={s.small}>Telefonens batterisparing og tvangslukking kan stoppe registreringen. Før lengre turer bør du prøve en kort tur med låst skjerm.</Text></View>{ghost && <View style={s.card}><Text style={s.subheading}>Skygge: {ghost.name}</Text><View style={s.between}><Text style={[s.body, { flex: 1 }]}>Fortell meg hvordan jeg ligger an</Text><Switch accessibilityLabel="Slå på tale for skyggen" value={audio} onValueChange={setAudio} trackColor={{ true: colors.ink }} /></View><Button secondary title="Prøv stemmen" icon="sound" onPress={() => { Speech.speak('God tur! Jeg sier fra hvordan du ligger an mot skyggen din.', { language: 'nb-NO', onError: () => Alert.alert('Tale er ikke tilgjengelig', 'Kontroller at norsk tale er installert i Androids tekst-til-tale-innstillinger.') }); }} /></View>}<Button title={busy ? 'Starter GPS …' : 'Start turen min'} icon="arrow" disabled={busy} onPress={() => attempt(async () => { await startTracking(ghostId, audio); setModal(null); setTab('explore'); setServiceMissing(false); })} /></Sheet>}
  {peak && <Sheet title={peak.name} onClose={() => setPeak(null)}><Stamp visited={!!visits[peak.id]} index={PEAKS.findIndex(p => p.id === peak.id)} /><Text style={s.title}>{peak.elevation} moh.</Text><Text style={s.body}>{peak.description}</Text><Text style={s.small}>{visits[peak.id] ? `Ditt første registrerte besøk: ${date(visits[peak.id].timestamp)}` : 'En ny oppdagelse til turpasset ditt.'}</Text><Button title="Se på kartet" icon="map" onPress={() => { setFocus(peak); setPeak(null); setTab('explore'); }} /></Sheet>}
  {detail && <TripDetails key={detail.id} trip={detail} reference={references.find(t => t.id === detail.ghostId) ?? null} weight={data.profile.weightKg} onDelete={() => { if (ghostId === detail.id) setGhostId(null); setSelectedTrip(null); refresh(); }} onClose={() => setSelectedTrip(null)} onChange={refresh} onGhost={() => repeatWithGhost(detail)} />}
  </View>;
}
class Boundary extends React.Component<{ children: React.ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() { return this.state.error ? <SafeAreaView style={[s.screen, { padding: 24, justifyContent: 'center', gap: 20 }]}><Text style={s.title}>Vi snublet litt.</Text><Text style={s.body}>Tråkk kunne ikke åpne skjermen. Lukk og åpne appen igjen. Ikke slett appdata – turloggen kan fortsatt være lagret.</Text></SafeAreaView> : this.props.children; }
}
export default function App() { return <SafeAreaProvider><Boundary><Trakk /></Boundary></SafeAreaProvider>; }
