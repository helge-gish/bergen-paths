import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { PermissionsAndroid, Platform } from 'react-native';
import { getStore } from '../data/native';
import { ghostComparison, voiceCue } from '../domain/ghost';
import type { Fix } from '../domain/types';
export const LOCATION_TASK = 'trakk-location-v1';
const trackingOptions: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.BestForNavigation,
  timeInterval: 3000,
  distanceInterval: 0,
  deferredUpdatesInterval: 0,
  pausesUpdatesAutomatically: false,
  activityType: Location.ActivityType.Fitness,
  showsBackgroundLocationIndicator: true,
  foregroundService: { notificationTitle: 'Tråkk · turen registreres', notificationBody: 'Tid, pauser og GPS-spor lagres. Åpne Tråkk for å avslutte.', notificationColor: '#183E32', killServiceOnDestroy: false },
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
    store.append(active.id, data.locations.map(toFix));
    store.setSetting('trackingError', null);
    if (!active.ghostId || !active.audioEnabled) return;
    const current = store.getTrip(active.id)!, ghost = store.getReference(active.ghostId);
    if (!ghost) return;
    const now = Date.now();
    if (now - current.lastCueAt < 60_000) return;
    const cue = voiceCue(ghostComparison(current, ghost, now), now, current.lastCueAt, current.audioEnabled);
    if (cue && store.claimCue(current.id, now)) {
      Speech.speak(cue, { language: 'nb-NO', rate: 0.95, onError: () => store.setSetting('audioError', 'Tale kunne ikke spilles av. Kontroller taleinnstillingene på mobilen.') });
    }
  } catch (e) { store.setSetting('trackingError', e instanceof Error ? e.message : 'Kunne ikke lagre GPS-posisjonen.'); }
});
export async function startTracking(ghostId: string | null, audioEnabled: boolean, name?: string, suggestion?: string) {
  if (ghostId && !getStore().getReference(ghostId)) throw new Error('Den valgte skyggen finnes ikke lenger. Velg en annen sti eller tur.');
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
  const store = getStore(), trip = store.begin(ghostId, audioEnabled, Date.now(), name);
  if (suggestion) store.suggestName(trip.id, suggestion);
  store.setSetting('trackingError', null);
  store.setSetting('audioError', null);
  try {
    await Location.startLocationUpdatesAsync(LOCATION_TASK, trackingOptions);
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
  if (!trip) return null;
  // Persist the end timestamp first, so late deliveries never extend the recorded trip.
  store.finish(trip.id);
  try { if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) await Location.stopLocationUpdatesAsync(LOCATION_TASK); }
  catch { store.setSetting('trackingError', 'Turen er lagret, men GPS-tjenesten kunne ikke stoppes. Lukk appen for å stoppe tjenesten.'); }
  await Speech.stop();
  return trip.id;
}
export async function trackingRunning() { return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK); }
export async function resumeTracking() {
  if (!getStore().active()) throw new Error('Ingen aktiv tur å fortsette.');
  const permission = await Location.getBackgroundPermissionsAsync();
  if (!permission.granted) throw new Error('Gi Tråkk bakgrunnstilgang til posisjon i innstillingene først.');
  await Location.startLocationUpdatesAsync(LOCATION_TASK, trackingOptions);
  getStore().setSetting('trackingError', null);
}
