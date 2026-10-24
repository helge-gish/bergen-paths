import { test } from 'node:test';
import assert from 'node:assert/strict';
import { component } from './support/component';
import * as startGate from '../src/domain/startGate';

test('recording rechecks the selected start after permission prompts and cannot begin outside its zone', async () => {
  let lat = 60.001, begins = 0, samples: any[] = [], nextPermission: (() => void) | undefined;
  const trip = { id: 'new', startedAt: Date.now(), points: [] };
  const store = { active: () => null, begin: () => { begins++; return trip; }, append: (_: string, fixes: any[]) => { samples = fixes; }, setSetting() {}, getTrip: () => trip };
  const { startTracking } = component('src/services/tracking.ts', {
    '../domain/idleRecording': {}, '../domain/workout': {}, './areaConsent': { stageAreaConsent: () => false }, '../domain/natureArea': {}, '../domain/automaticRecording': { AUTOMATIC_LIMIT_MS: 28800000 }, '../domain/dialect': {}, './tripStatus': { syncTripStatus: async () => {} }, '../domain/metrics': {}, '../domain/commentary': {},
    './workoutCoach': { workoutAvailable: true, syncWorkoutCoach: async () => {} },
    'expo-task-manager': { defineTask() {} }, 'expo-speech': {}, './voice': {},
    'react-native': { Platform: { OS: 'android', Version: 32 }, PermissionsAndroid: {} },
    '../domain/startGate': startGate, '../domain/routeMatch': {}, '../domain/stretchRuns': {}, '../domain/ghost': {}, '../domain/geo': {},
    '../data/native': { getStore: () => store },
    'expo-location': { Accuracy: { High: 4, BestForNavigation: 6 }, ActivityType: { Fitness: 3 },
      requestForegroundPermissionsAsync: async () => ({ granted: true }),
      requestBackgroundPermissionsAsync: async () => { nextPermission?.(); return { granted: true }; }, hasServicesEnabledAsync: async () => true,
      getCurrentPositionAsync: async () => ({ timestamp: Date.now(), coords: { latitude: lat, longitude: 5, accuracy: 4, altitude: null, altitudeAccuracy: null, speed: null } }),
      startLocationUpdatesAsync: async () => {},
    },
  });
  const start = () => startTracking(null, false, undefined, undefined, 'free', { latitude: 60, longitude: 5 });
  await assert.rejects(start(), /Gå til START/); assert.equal(begins, 0);
  lat = 60; nextPermission = () => { lat = 60.001; };
  await assert.rejects(start(), /Gå til START/); assert.equal(begins, 0);
  nextPermission = undefined; lat = 60;
  await start(); assert.equal(begins, 1); assert.equal(samples.length, 1);
  assert.equal(samples[0].latitude, 60); assert.equal(samples[0].timestamp, trip.startedAt);
});
