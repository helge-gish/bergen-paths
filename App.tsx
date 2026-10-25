import { approveAreaHere, stageAreaConsent } from './src/services/areaConsent';
import {useTrailActivity} from './src/ui/useTrailActivity';
import {EMPTY_TRAIL_PERSONALIZATION,activityTotals,namedNature,type TrailPersonalization,type TrailActivity} from './src/domain/trailActivity';
import {TrailReview} from './src/ui/TrailReview';
import {trailChoices} from './src/domain/trailFinder';
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
import { areaNatureTrails, natureArea, needsAreaConsent, NATURE_RADIUS } from './src/domain/natureArea';
import type { HomeArea } from './src/domain/areas';
import { walkingMetrics } from './src/domain/natureTiming';
import { tripMetrics, durationLabel, kmLabel } from './src/domain/metrics';
import type { Discovery } from './src/domain/discoveries';
import type { Trip, Trail } from './src/domain/types';
import { activePeg } from './src/domain/activePeg';
import { useNearbyArea } from './src/ui/useNearbyArea';
import { TrailMap } from './src/ui/TrailMap';
import { TrailFinder } from './src/ui/TrailFinder';
import { ExploreSurface, type ExploreMode } from './src/ui/ExploreSurface';
import { WorkoutCard } from './src/ui/Workout';
import { workoutStatus, workoutPlan, workoutPlans, type WorkoutKind } from './src/domain/workout';
import { syncWorkoutCoach, workoutAvailable } from './src/services/workoutCoach';
import { Button, Icon, Metric } from './src/ui/components';
import { exportLog } from './src/services/export';
import { colors, styles as s } from './src/ui/theme';

function snapshot() {
  const store = getStore();
  return { active: store.active(), trips: store.trips(), trails: store.trails(), items: store.setting<Discovery[]>('natureDiscoveries', []), personal: store.setting<TrailPersonalization>('trailPersonalization', EMPTY_TRAIL_PERSONALIZATION), preference: store.setting<RecordingPreference>('automaticRecording', 'unconfigured'), error: store.setting<string | null>('trackingError', null), limited: store.setting('automaticLimitReached', false), pendingArea: store.setting<HomeArea | null>('pendingNatureArea', null), pauseReason: store.setting<string | null>('automaticPauseReason', null) };
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

  return <ActiveTrakk data={data} now={now} error={error} busy={busy} act={act} refresh={refresh} pause={pause} start={()=>void act(()=>automaticRecorder.enable())} />;
}
type ActiveProps = { data: Data; now: number; error: string | null; busy: boolean; act: (fn: () => unknown | Promise<unknown>) => Promise<void>; refresh: () => void; pause: () => void; start: () => void };
function ActiveTrakk({ data, now, error, busy, act, refresh, pause, start }: ActiveProps) {
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
    if (!data.pendingArea && nearby.live && nearby.area && center && needsAreaConsent(center, nearby.area)) {
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
  const named = useMemo(() => namedNature(data.items, data.personal ?? {}), [data.items, data.personal]);
  const items = useMemo(() => areaNatureTrails(named, center), [named, center]);
  const activity = useTrailActivity(named, data.trails, data.trips, data.active);
  const totals = useMemo(() => activityTotals(activity.report), [activity.report]);
  const savedChoices = useMemo(() => trailChoices([],data.trails),[data.trails]);
  const mapItems = useMemo(() => [...items,...savedChoices.map(t=>t.item)],[items,savedChoices]);
  const [review,setReview] = useState<Discovery|null>(null),[logLimit,setLogLimit]=useState(40),[findTarget,setFindTarget]=useState<string|null>(null);
  const allTracks = useMemo(() => data.active ? [...data.trips.filter(t=>t.id!==data.active!.id),data.active] : data.trips,[data.trips,data.active]);
  const lifetime = useMemo(() => allTracks.reduce((sum,t)=>{const m=walkingMetrics(t);return {meters:sum.meters+m.meters,ascent:sum.ascent+m.ascent,moving:sum.moving+m.moving};},{meters:0,ascent:0,moving:0}),[allTracks]);
  const showItem = (event:TrailActivity) => { const item=event.source==='nature'?named.find(i=>i.id===event.itemId):savedChoices.find(t=>t.saved?.id===event.itemId)?.item;if(item){setSelected(item);setTab('map');setMode('map');} };
  const findStart = (item:Discovery) => {setFindTarget(item.id);setSelected(item);setMode('camera');};
  const metrics = useMemo(() => data.active ? tripMetrics(data.active, now) : null, [data.active, now]);
  const walking = useMemo(() => data.active ? walkingMetrics(data.active) : null, [data.active]);
  const moving = walking?.moving ?? 0;
  const trackPosition = metrics?.points.at(-1);
  const useTrack = !!trackPosition && trackPosition.timestamp >= (nearby.lastSeen ?? 0);
  const position = useTrack ? trackPosition : nearby.area ?? trackPosition;
  const stale = useTrack ? now - trackPosition!.timestamp > 30000 : !nearby.live;
  const window = data.active ? getStore().segmentWindow(data.active.id) : null;
  const peg = useMemo(() => data.active && window?.draft ? activePeg(data.active.startedAt, window?.from, metrics?.points ?? []) : null, [data.active?.id, window?.from, window?.draft, metrics?.points]);
  const canMarkSegment = !!trackPosition && now - trackPosition.timestamp <= 20000 && !stale;
  const latest = activity.report.log.filter(e=>e.status==='completed'&&e.tripId===data.active?.id).slice(0,3);
  const onTrail = activity.report.active.filter(e=>e.tripId===data.active?.id&&now-e.timestamp<=20000);
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
  const walkedHere = new Set(activity.report.log.filter(e=>e.source==='nature'&&e.status==='completed'&&items.some(i=>i.id===e.itemId)).map(e=>e.itemId)).size;
  const areaLoaded = !!getStore().setting<Record<string, number>>('natureMapFetched', {})[cell];
  const progressLabel = center && (areaLoaded || items.length) ? `${walkedHere} av ${items.length} stier gått` : '— av — stier gått';
  return <SafeAreaView style={s.screen}><StatusBar style="dark" />
    <View style={[s.between, { paddingRight: 20 }]}><Brand /><View style={s.row}><Pressable accessibilityRole="button" accessibilityLabel="Innstillinger" onPress={() => setSettingsOpen(true)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name="settings" /></Pressable></View></View>
    <View style={{paddingHorizontal:22,paddingBottom:12,gap:8}}>
      {data.active?<View style={s.between}><View><Text accessibilityLiveRegion="polite" style={s.subheading}>● På tur</Text><Text style={s.small}>{durationLabel(now-data.active.startedAt)}</Text></View><Button secondary title="Avslutt tur" disabled={busy} onPress={pause} /></View>:<><Button title="Start tur" disabled={busy||!!data.pendingArea} onPress={start} /><Text style={s.small}>{data.pauseReason==='idle'?'Turen ble avsluttet etter 10 minutter i ro.':data.preference==='paused'?'Turen er lagret.':'Kart og AR uten registrering.'}</Text></>}
      {!data.active&&data.preference==='unconfigured'&&<Text style={s.small}>Start tur lagrer sporet på mobilen, også med låst skjerm. Avslutt tur stopper registreringen.</Text>}
    </View>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" removeClippedSubviews={false}>
      {data.pendingArea&&<View style={s.notice}><Text style={s.subheading}>Utforsk et nytt område?</Text><Text style={s.body}>Bytt til området rundt deg før neste tur.</Text><Button title="Utforsk her" disabled={busy} onPress={()=>void act(async()=>{const point=await approveAreaHere();setCenter(natureArea(null,point));setSelected(null);})} /></View>}
      {!position&&<Button secondary title="Finn posisjonen min" disabled={busy||nearby.pending} onPress={locate} />}
      {(error || data.error) && <View style={s.notice}><Text style={s.body}>{error ?? data.error}</Text>{data.active&&<Button secondary title="Prøv GPS igjen" disabled={busy} onPress={() => void act(() => automaticRecorder.ensure())} />}<Button secondary title="Åpne tillatelser" onPress={() => void Linking.openSettings()} /></View>}
      {tab === 'map' && <>
        {data.active && (window?.draft ? <View style={s.card}>
          <Text style={s.subheading}>Strekk pågår</Text>
          <Text style={s.small}>{peg?.point ? `Start kl. ${new Date(peg.point.timestamp).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}` : 'Venter på GPS'}</Text>
          <Button title="Stopp strekk" disabled={busy || !peg?.point || !canMarkSegment} onPress={() => void act(() => { const trail = getStore().clipSegment(data.active!.id); Alert.alert('Strekk lagret', `${trail.name}\nMåles automatisk på senere turer.`); })} />
          <Pressable accessibilityRole="button" accessibilityLabel="Avbryt strekket" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => void act(() => getStore().cancelSegmentDraft(data.active!.id))} style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}><Text style={s.small}>Avbryt</Text></Pressable>
        </View> : <View style={{ gap: 6 }}><Button title="Start strekk" disabled={busy || !canMarkSegment} onPress={() => void act(() => getStore().setSegmentStart(data.active!.id))} />{!canMarkSegment && <Text style={s.small}>Venter på GPS …</Text>}</View>)}
        {onTrail.map(event=><View key={event.id} style={s.notice}><Text accessibilityLiveRegion="polite" style={s.subheading}>● {event.name}</Text><Text style={s.body}>{event.source==='nature'?'På stien':'På strekket'} · {Math.round((event.fraction??0)*100)} % · {durationLabel(now-event.startedAt)}</Text></View>)}
        <ExploreSurface trailing={!!data.active && workoutAvailable && <Pressable accessibilityRole="button" accessibilityLabel={training ? `Trening: ${workoutPlan(workout!.kind).name}` : 'Velg treningsmodus'} onPress={() => setTrainingOpen(true)} style={{ alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}><Text style={s.chipText}>{training ? '● Trening' : 'Trening'}</Text></Pressable>} mode={mode} onMode={setMode} enabled={!detail && !trainingOpen && !settingsOpen && !review} map={<TrailMap onLocate={locate} locating={nearby.pending || busy} position={position} positionStale={stale} focus={position} recenter={recenter} discoveries={mapItems} onStartTrail={findStart} showHeading={mode === 'map'&&!detail&&!trainingOpen&&!settingsOpen&&!review} trips={data.trips} current={metrics?.points} segmentStart={peg?.point} selectedDiscovery={selected} height={350} />} camera={<TrailFinder embedded recording={!!data.active} items={items} trails={data.trails} initialTargetId={findTarget} trips={data.trips} current={metrics?.points} segmentStart={peg?.point} busy={loadingMap} onRefresh={() => setMapRetry(n => n + 1)} onMap={target => { setSelected(target.item); setMode('map'); }} />} />
        {selected && <Pressable accessibilityRole="button" accessibilityLabel="Fjern kartvalg" onPress={() => setSelected(null)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={s.small}>{selected.name} · Lukk ×</Text></Pressable>}
        {mapError ? <View style={s.notice}><Text style={s.body}>{mapError}</Text><Button secondary title="Hent stier igjen" onPress={() => setMapRetry(n => n + 1)} disabled={loadingMap} /></View> : loadingMap ? <Text style={s.small}>Henter naturstier …</Text> : !items.length ? <Text style={s.body}>Ingen naturstier med tilstrekkelige kartdata i dette området ennå.</Text> : null}

        {latest.map(event=><View key={event.id} style={s.card}><Text style={s.subheading}>✓ {event.name}</Text><Text style={s.small}>Ende til ende · {durationLabel((event.seconds??0)*1000)}</Text>{event.source==='nature'&&<Button secondary title="Vurder stien" onPress={()=>setReview(data.items.find(i=>i.id===event.itemId)??null)} />}</View>)}
      </>}
      {tab === 'log' && <>
        <View style={s.card}><Text style={s.heading}>{progressLabel}</Text><Text style={s.small}>Aktivt område · 5 km{activity.pending?' · oppdaterer …':''}</Text></View>
        <View style={s.card}><Text style={s.subheading}>Totalt</Text><Text style={s.body}>{totals.trails} stier · {totals.stretches} strekk gått</Text><Text style={s.small}>{totals.passes} fullføringer · {kmLabel(lifetime.meters)} km · {Math.round(lifetime.ascent)} høydemeter opp</Text><Text style={s.small}>{durationLabel(lifetime.moving)} i bevegelse</Text></View>
        {activity.error&&<Text style={s.body}>Kunne ikke oppdatere stihistorikken. Åpne Logg igjen for å prøve på nytt.</Text>}
        <Text style={s.subheading}>Historikk</Text>
        {!activity.report.log.length&&!activity.pending&&<Text style={s.body}>Ingen stier eller strekk registrert ennå.</Text>}
        {activity.report.log.slice(0,logLimit).map(event=><View key={event.id} style={s.card}><Pressable accessibilityRole="button" onPress={()=>showItem(event)}><Text style={s.subheading}>{event.status==='completed'?'✓ ':''}{event.name}</Text><Text style={s.small}>{event.source==='nature'?'Sti':'Eget strekk'} · {event.status==='completed'?'Ende til ende':'Vært innom'} · {new Date(event.timestamp).toLocaleString('nb-NO')}{event.seconds!==undefined?` · ${durationLabel(event.seconds*1000)}`:''}</Text></Pressable>{event.status==='completed'&&event.source==='nature'&&<Button secondary title={(data.personal?.[event.itemId]?.stars?'★'.repeat(data.personal[event.itemId].stars!)+' · ':'')+'Vurder stien'} onPress={()=>setReview(data.items.find(i=>i.id===event.itemId)??null)} />}</View>)}
        {activity.report.log.length>logLimit&&<Button secondary title="Vis eldre hendelser" onPress={()=>setLogLimit(n=>n+40)} />}
        {metrics && <View style={s.card}><Text style={s.subheading}>Denne turen</Text><View style={s.row}><Metric value={kmLabel(walking?.meters??0)} label="km registrert" /><Metric value={(metrics.speedKmh === null || metrics.speedKmh > 21.6) ? '—' : metrics.speedKmh.toLocaleString('nb-NO', { maximumFractionDigits: 1 })} label="km/t nå" /><Metric value={walking?.hasElevation ? String(Math.round(walking.ascent)) : '—'} label="høydemeter opp" /></View><Text style={s.small}>{durationLabel(moving)} i bevegelse</Text></View>}
        <Text style={s.subheading}>Turer</Text>
        {data.trips.filter(trip => !trip.automatic || !!trip.workout || !!trip.workoutHistory?.length || walkingMetrics(trip).meters >= 10).map(trip => <Pressable key={trip.id} accessibilityRole="button" onPress={() => setDetail(trip)} style={s.card}><Text style={s.subheading}>{trip.automatic ? new Date(trip.startedAt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long' }) : trip.name}</Text><Text style={s.small}>{kmLabel(walkingMetrics(trip).meters)} km →</Text></Pressable>)}
      </>}
    </ScrollView>
    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: colors.line }}>{([{ id: 'map', title: 'Utforsk', icon: 'map' }, { id: 'log', title: 'Logg', icon: 'book' }] as const).map(t => <Pressable key={t.id} accessibilityRole="tab" accessibilityState={{ selected: tab === t.id }} onPress={() => { setTab(t.id); if (t.id !== 'map') setMode('map'); }} style={{ flex: 1, alignItems: 'center', gap: 5, paddingVertical: 14, backgroundColor: tab === t.id ? colors.pale : colors.paper }}><Icon name={t.icon} /><Text style={s.chipText}>{t.title}</Text></Pressable>)}</View>
    {settingsOpen && <Modal onRequestClose={() => { setSettingsOpen(false); setAreaOpen(false); }}><SafeAreaView style={s.screen}><Button secondary title="← Tilbake" onPress={() => { setSettingsOpen(false); setAreaOpen(false); }} /><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled"><Text style={s.heading}>Innstillinger</Text>
      <View style={s.card}><Text style={s.subheading}>Aktivt område · 5 km</Text><Text style={s.small}>Festet der du utforsker. På reise spør Tråkk før et nytt område aktiveres.</Text><Button secondary title="Endre område" onPress={() => { setAreaCandidate(center); setAreaOpen(true); }} /></View>
      {areaOpen && <View style={s.card}><Text style={s.subheading}>Fest området</Text><Text style={s.small}>Trykk i kartet for å plassere midtpunktet. Området er 5 km rundt merket.</Text><TrailMap focus={areaCandidate ?? position} position={position} areaMarker={areaCandidate} onChooseArea={p => setAreaCandidate(natureArea(null, p))} height={340} /><Button secondary title="Bruk posisjonen min" onPress={() => { if (position) setAreaCandidate(natureArea(null, position)); }} /><Button title="Utforsk dette området" disabled={!areaCandidate || busy} onPress={() => void act(() => { if (!areaCandidate) return; if (position && needsAreaConsent(areaCandidate, position)) throw new Error('Velg et område nær deg. Når du reiser, foreslår Tråkk området der du kommer.'); getStore().setSetting('activeNatureArea', areaCandidate); getStore().setSetting('pendingNatureArea', null); setCenter(areaCandidate); setSelected(null); setAreaOpen(false); setSettingsOpen(false); setTab('map'); })} />{error && <Text style={s.body}>{error}</Text>}</View>}
      <Button secondary title={getStore().setting('trailVoice',true)?'Talevarsler: på':'Talevarsler: av'} onPress={()=>void act(()=>{const enabled=!getStore().setting('trailVoice',true);getStore().setSetting('trailVoice',enabled);if(data.active)getStore().setAudio(data.active.id,enabled);})} />
      <ProfileSettings />
      <Text style={s.small}>Tråkk lagrer og avslutter turen etter 10 minutter i ro med pålitelig GPS. Trykk Start tur når du går videre. Pågående trening unntas.</Text>
      <Button secondary title="Eksporter logg" onPress={() => void act(() => exportLog(data.trips, data.trails, getStore().setting<Discovery[]>('osmDiscoveries', []), getStore().setting('osmAwards', {})))} />
    </ScrollView></SafeAreaView></Modal>}
    {trainingOpen && <Modal onRequestClose={() => setTrainingOpen(false)}><SafeAreaView style={s.screen}><Button secondary title="← Tilbake" onPress={() => setTrainingOpen(false)} /><ScrollView contentContainerStyle={s.content}><Text style={s.heading}>Treningsmodus</Text>
      {data.active?.workout && <WorkoutCard trip={data.active} now={now} onChange={refresh} />}
      {!training && <><Text style={s.small}>Velg økt. Tale og vibrasjon guider tempoet.</Text>{workoutPlans.map(plan => <View key={plan.kind} style={{gap:6}}><Button title={`${plan.name} · ${plan.totalMs/60000} min`} disabled={busy} onPress={() => startTraining(plan.kind)} /><Text style={s.small}>{plan.kind==='4x4'?'4 min raskt / 3 min rolig · 4 drag':plan.kind==='interval-walk'?'3 min rolig / 3 min raskt · 5 runder':'Veksle mellom gange og lett jogg'}</Text></View>)}</>}
      {!!data.active?.workoutHistory?.length && <Text style={s.small}>{data.active.workoutHistory.length} tidligere treningsøkter er lagret i denne registreringen.</Text>}
    </ScrollView></SafeAreaView></Modal>}
    {review&&<TrailReview item={review} value={data.personal?.[review.id]} onClose={()=>setReview(null)} onSave={value=>{getStore().setSetting('trailPersonalization',{...data.personal,[review.id]:value});setReview(null);refresh();}} />}
    {detail && <Modal onRequestClose={() => setDetail(null)}><SafeAreaView style={s.screen}><Button secondary title="← Logg" onPress={() => setDetail(null)} /><ScrollView contentContainerStyle={s.content}><Text style={s.heading}>{detail.name}</Text><TrailMap current={detail.points} fitRoute height={330} /><Text style={s.body}>{kmLabel(walkingMetrics(detail).meters)} km · {durationLabel(walkingMetrics(detail).moving)} i bevegelse</Text>{[...(detail.workoutHistory ?? []), ...(detail.workout ? [detail.workout] : [])].map((w, i) => <Text key={w.id ?? i} style={s.body}>{workoutPlan(w.kind).name} · {durationLabel(workoutStatus(w, detail.endedAt ?? now).elapsed)} · {workoutStatus(w, detail.endedAt ?? now).rounds} av {workoutPlan(w.kind).rounds} drag</Text>)}<Button secondary title="Slett registreringen" onPress={() => Alert.alert('Slette registreringen?', 'Strekk laget fra denne registreringen slettes også.', [{ text: 'Behold', style: 'cancel' }, { text: 'Slett', style: 'destructive', onPress: () => { getStore().deleteTrip(detail.id); setDetail(null); refresh(); } }])} /></ScrollView></SafeAreaView></Modal>}
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
