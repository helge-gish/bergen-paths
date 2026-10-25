import {syncTrailActivity} from './trailActivity';
import { idleEvidence, shouldPauseIdle, type IdleEvidence } from '../domain/idleRecording';
import { workoutStatus } from '../domain/workout';
import { currentAreaPosition, stageAreaConsent } from './areaConsent';
import { natureArea } from '../domain/natureArea';
import type { WorkoutKind } from '../domain/workout';
import { AUTOMATIC_LIMIT_MS } from '../domain/automaticRecording';
import { localDialect } from '../domain/dialect';
import { syncTripStatus } from './tripStatus';
import { tripMetrics } from '../domain/metrics';
import { walkingCommentary, celebrateStretch } from '../domain/commentary';
import { syncWorkoutCoach, workoutAvailable } from './workoutCoach';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { PermissionsAndroid, Platform } from 'react-native';
import { speak } from './voice';
import { startGate, startPointGate } from '../domain/startGate';
import { matchRoute } from '../domain/routeMatch';
import { stretchResults, stretchDelta } from '../domain/stretchRuns';
import { getStore } from '../data/native';
import { ghostComparison, voiceCue } from '../domain/ghost';
import type { Coordinate, Fix } from '../domain/types';
import { validFix } from '../domain/geo';
export const LOCATION_TASK = 'trakk-location-v1';
const trackingOptions: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.BestForNavigation,
  timeInterval: 3000,
  distanceInterval: 0,
  deferredUpdatesInterval: 0,
  pausesUpdatesAutomatically: false,
  activityType: Location.ActivityType.Fitness,
  showsBackgroundLocationIndicator: true,
  foregroundService: { notificationTitle: 'Tråkk · tur pågår', notificationBody: 'Turen lagres. Velg Avslutt tur i Tråkk for å stoppe registreringen.', notificationColor: '#183E32', killServiceOnDestroy: false },
};
export function toFix(location: Location.LocationObject): Fix {
  return { timestamp: location.timestamp, latitude: location.coords.latitude, longitude: location.coords.longitude, accuracy: location.coords.accuracy ?? 999, altitude: location.coords.altitude, altitudeAccuracy: location.coords.altitudeAccuracy, speed: location.coords.speed };
}
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
  const store = getStore();
  if (error) { store.setSetting('trackingError', 'GPS-registreringen meldte en feil: ' + error.message); return; }
  if (!data?.locations?.length) return;
  try {
    const active = store.active();
    if (!active) return;
    const latest = data.locations.map(toFix).sort((a, b) => b.timestamp - a.timestamp).find(f => f.accuracy <= 100 && Date.now() - f.timestamp <= 30000);
    if (active.automatic && latest && stageAreaConsent(latest)) { await finishTracking(); return; }
    if (active.automatic && Date.now() - active.startedAt >= AUTOMATIC_LIMIT_MS) {
      store.setSetting('automaticLimitReached', true);
      await finishTracking();
      return;
    }
    void syncWorkoutCoach(active).catch(() => store.setSetting('audioError', 'Taletreneren kunne ikke starte. Åpne appen igjen.'));
    const fixes = data.locations.map(toFix);
    store.append(active.id, fixes);
    if (active.automatic) {
      const saved = store.setting<{ tripId: string; evidence: IdleEvidence | null } | null>('idleRecording', null);
      let evidence = saved?.tripId === active.id ? saved.evidence : null;
      const training = active.workout && active.workout.runningSince !== null && active.workout.endedAt === null && !workoutStatus(active.workout, Date.now()).complete;
      if (training) evidence = null;
      else for (const fix of [...fixes].sort((a, b) => a.timestamp - b.timestamp)) evidence = idleEvidence(evidence, fix, Date.now());
      store.setSetting('idleRecording', { tripId: active.id, evidence });
      if (shouldPauseIdle(evidence)) {
        store.setSetting('automaticPauseReason', 'idle');
        store.setSetting('automaticRecording', 'paused');
        await finishTracking();
        return;
      }
    }
    const last = fixes.filter(validFix).at(-1);
    if (last && Date.now() - last.timestamp <= 30000) store.setSetting('localDialect', localDialect(last));
    store.setSetting('trackingError', null);
    void syncTripStatus(store.getTrip(active.id)).catch(() => {});
    // Keep raw fixes for the recorded history, but poor GPS cannot advance a
    // stretch or ghost. Do not replay those comparisons for unusable batches.
    if (!fixes.some(validFix)) return;
    await syncTrailActivity();
    // Nature and personal-route events share one detector, including reverse passages.
    if (active.automatic) return;
    const current = store.getTrip(active.id)!, ghost = active.ghostId ? store.getReference(active.ghostId) : null;
    const now = Date.now();
    // Deduplicate events durably, including muted events, so reopening never
    // reads out old completions. Segment timing also runs on ordinary walks.
    const results = stretchResults(current, store.trails(), store.trips(), ghost);
    const seen = store.setting<string[]>(`stretchNotified:${current.id}`, []);
    const fresh = results.filter(r => !seen.includes(`${r.trailId}:${Math.round(r.startedAt)}`));
    if (fresh.length) store.setSetting(`stretchNotified:${current.id}`, [...seen, ...fresh.map(r => `${r.trailId}:${Math.round(r.startedAt)}`)]);
    const completed = fresh.filter(r => now - r.endedAt < 45_000).at(-1);
    const route = ghost ? matchRoute(current, ghost, now) : null;
    const routeEvent = route?.newSegments.at(-1);
    const eventKey = routeEvent ? `${routeEvent.startedAt}:${route?.state}` : null;
    let cue: string | null = null;
    if (eventKey && (route?.state === 'off-route' || route?.state === 'rejoined') && store.setting(`routeNotified:${current.id}`, '') !== eventKey) {
      store.setSetting(`routeNotified:${current.id}`, eventKey);
      cue = route.state === 'off-route' ? 'Du har gått av ruten. Eg lagrer turen videre. Se kartet for å finne tilbake, eller fortsett uten skygge.' : 'No e du tilbake på ruten. Eg sammenligner fortsatt strekkene, men ikke totaltiden.';
    }
    if (!cue && completed) cue = `${celebrateStretch(completed.name)} ${completed.ghostSeconds !== null ? stretchDelta(completed.seconds, completed.ghostSeconds) + ' enn skyggen.' : completed.previousSeconds !== null ? stretchDelta(completed.seconds, completed.previousSeconds) + ' enn sist.' : 'Første registrerte tid.'}${completed.bestSeconds !== null && completed.bestSeconds - completed.seconds >= 5 ? ' Ny beste tid!' : ''}`;
    const metrics = tripMetrics(current, now);
    const bucket = Math.floor(metrics.elapsed / 300000);
    const previousBucket = store.setting(`commentaryBucket:${current.id}`, 0);
    if (bucket > previousBucket) {
      store.setSetting(`commentaryBucket:${current.id}`, bucket);
      if (!cue && !ghost && !current.workout && current.audioEnabled) cue = walkingCommentary(current, metrics, now);
    }
    if (cue && current.audioEnabled) {
      store.setSetting(`eventSpoken:${current.id}`, now);
      void speak(cue, current.id);
    } else if (ghost && now - store.setting(`eventSpoken:${current.id}`, 0) >= 15000) {
      const regular = voiceCue(ghostComparison(current, ghost, now, route!), now, current.lastCueAt, current.audioEnabled);
      if (regular && store.claimCue(current.id, now)) void speak(regular, current.id, 'ghost');
    }
  } catch (e) { store.setSetting('trackingError', e instanceof Error ? e.message : 'Kunne ikke lagre GPS-posisjonen.'); }
});
export async function startTracking(ghostId: string | null, audioEnabled: boolean, name?: string, suggestion?: string, training: 'free' | WorkoutKind = 'free', requiredStart?: Coordinate, automatic = false) {
  if (training !== 'free' && !workoutAvailable) throw new Error('Treningsmodus krever Android-appen.');
  if (ghostId && !getStore().getReference(ghostId)) throw new Error('Den valgte skyggen finnes ikke lenger. Velg et annet strekk eller en tur.');
  if (getStore().active()) throw new Error('Du har allerede en tur som pågår.');
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) throw new Error('Tråkk trenger posisjonstillatelse for å registrere turen.');
  if (foreground.android?.accuracy === 'coarse') throw new Error('Velg nøyaktig posisjon i Androids tillatelser for Tråkk. Omtrentlig posisjon er ikke nok til å registrere stier.');
  const background = await Location.requestBackgroundPermissionsAsync();
  if (!background.granted) throw new Error('Velg «Tillat hele tiden» for å registrere turen med låst skjerm. Ingen tur er startet.');
  if (!await Location.hasServicesEnabledAsync()) throw new Error('Slå på posisjon/GPS på telefonen før du starter.');
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    // Android allows the location service without this, but the drawer notification
    // needs a separate permission. Denying notifications must not discard a trip.
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }
  const store = getStore();
  let initial: Fix | null = null;
  if (automatic) {
    const position = await currentAreaPosition();
    if (stageAreaConsent(position)) throw new Error('Du er i et nytt område. Velg Utforsk her for å fortsette.');
    if (!store.setting('activeNatureArea', null)) store.setSetting('activeNatureArea', natureArea(null, position));
    store.setSetting('lastMapPosition', position);
    initial = { ...position, altitude: null, altitudeAccuracy: null, speed: null };
  }
  if (ghostId || requiredStart) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      initial = toFix(await Promise.race([Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('GPS bruker litt tid. Gå under åpen himmel og prøv start igjen.')), 15000); })]));
    } finally { if (timer) clearTimeout(timer); }
    const reference = ghostId ? store.getReference(ghostId) : null;
    if (ghostId && !reference) throw new Error('Skyggen finnes ikke lenger.');
    const gate = reference ? startGate(reference, initial, Date.now()) : startPointGate(requiredStart, initial, Date.now());
    if (!gate.ready) throw new Error(gate.message);
  }
  const trip = store.begin(ghostId, audioEnabled, Date.now(), name, training);
  if (automatic) { store.setSetting(`automatic:${trip.id}`, true); store.setSetting('automaticLimitReached', false); store.setSetting('idleRecording', null); store.setSetting('automaticPauseReason', null); }
  if (initial) store.append(trip.id, [{ ...initial, timestamp: trip.startedAt }]);
  if (suggestion) store.suggestName(trip.id, suggestion);
  store.setSetting('trackingError', null);
  store.setSetting('audioError', null);
  try {
    await Location.startLocationUpdatesAsync(LOCATION_TASK, trackingOptions);
    if (training !== 'free') await Speech.stop();
    await syncTripStatus(store.getTrip(trip.id)).catch(() => {});
    await syncWorkoutCoach(trip).catch(() => store.setSetting('audioError', 'Taletreneren kunne ikke starte. Åpne appen igjen.'));
    return trip;
  } catch (e) {
    // Keep any data already delivered, even when service startup reports a failure.
    if (store.getTrip(trip.id)?.points.length) store.finish(trip.id);
    else store.cancelEmpty(trip.id);
    throw e;
  }
}
export async function finishTracking() {
  const store = getStore(), trip = store.active();
  // Persist the end timestamp first, so late deliveries never extend the recorded trip.
  if (trip) store.finish(trip.id);
  store.setSetting('idleRecording', null);
  await syncTripStatus(null).catch(() => {});
  await syncWorkoutCoach(null).catch(() => store.setSetting('audioError', 'Taletreneren kunne ikke stoppes. Lukk appen for å stoppe lyden.'));
  let stopFailed = false;
  try { if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) await Location.stopLocationUpdatesAsync(LOCATION_TASK); }
  catch { stopFailed = true; store.setSetting('trackingError', 'Målingene er lagret, men GPS kunne ikke stoppes. Stopp Tråkk i Androids appinnstillinger.'); }
  await Speech.stop();
  if (stopFailed) throw new Error('Målingene er lagret, men GPS kunne ikke stoppes. Stopp Tråkk i Androids appinnstillinger.');
  return trip?.id ?? null;
}
export async function trackingRunning() { return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK); }
export async function resumeTracking() {
  if (!getStore().active()) throw new Error('Ingen aktiv tur å fortsette.');
  const permission = await Location.getBackgroundPermissionsAsync();
  if (!permission.granted) throw new Error('Gi Tråkk bakgrunnstilgang til posisjon i innstillingene først.');
  await Location.startLocationUpdatesAsync(LOCATION_TASK, trackingOptions);
  await syncTripStatus(getStore().active()).catch(() => {});
  await syncWorkoutCoach(getStore().active());
  getStore().setSetting('trackingError', null);
}
