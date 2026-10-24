import { test } from 'node:test';
import assert from 'node:assert/strict';
import { component } from './support/component';
import * as area from '../src/domain/natureArea';
import * as positions from '../src/domain/position';

test('background travel stops GPS/coach before adding a distant fix and waits for area approval', async () => {
  let task: any, appended = 0, stopped = 0, coachStopped = 0, active: any = { id: 'trip', startedAt: Date.now() - 1000, automatic: true };
  const original = area.natureArea(null, { latitude: 60.4, longitude: 5.3 });
  const settings: Record<string, any> = { activeNatureArea: original, automaticRecording: 'enabled' };
  const store = { active: () => active, finish: () => { active = null; }, append: () => { appended++; }, setting: (key: string, fallback: unknown) => settings[key] ?? fallback, setSetting: (key: string, value: unknown) => { settings[key] = value; } };
  const consent = component('src/services/areaConsent.ts', { 'expo-location': {}, '../data/native': { getStore: () => store }, '../domain/natureArea': area, '../domain/position': positions });
  component('src/services/tracking.ts', {
    '../domain/idleRecording': {}, '../domain/workout': {}, './areaConsent': consent, '../domain/natureArea': area,
    '../domain/automaticRecording': { AUTOMATIC_LIMIT_MS: 28800000 }, '../domain/dialect': {}, './tripStatus': { syncTripStatus: async () => {} }, '../domain/metrics': {}, '../domain/commentary': {},
    './workoutCoach': { workoutAvailable: true, syncWorkoutCoach: async (trip: unknown) => { if (trip === null) coachStopped++; } },
    'expo-task-manager': { defineTask: (_: string, callback: any) => { task = callback; } }, 'expo-speech': { stop: async () => {} }, './voice': {},
    'react-native': { Platform: { OS: 'android', Version: 32 }, PermissionsAndroid: {} },
    '../domain/startGate': {}, '../domain/routeMatch': {}, '../domain/stretchRuns': {}, '../domain/ghost': {}, '../domain/geo': {}, '../data/native': { getStore: () => store },
    'expo-location': { Accuracy: { High: 4, BestForNavigation: 6 }, ActivityType: { Fitness: 3 }, hasStartedLocationUpdatesAsync: async () => true, stopLocationUpdatesAsync: async () => { stopped++; } },
  });
  await task({ data: { locations: [{ timestamp: Date.now(), coords: { latitude: 4.7, longitude: -74.1, accuracy: 8, altitude: null, altitudeAccuracy: null, speed: 0 } }] } });
  assert.equal(active, null); assert.equal(stopped, 1); assert.equal(coachStopped, 1); assert.equal(appended, 0);
  assert.equal(settings.automaticRecording, 'paused'); assert.equal(settings.activeNatureArea, original);
  assert.equal(settings.pendingNatureArea.latitude, 4.7);
});
