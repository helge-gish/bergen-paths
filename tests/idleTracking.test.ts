import { test } from 'node:test';
import assert from 'node:assert/strict';
import { component } from './support/component';
import * as idle from '../src/domain/idleRecording';
import * as workout from '../src/domain/workout';

for (const mode of ['free', 'paused', 'running'] as const) test(`rest pause stops GPS/coach for ${mode}; running training is exempt`, async () => {
  const now = Date.now(), fix = { latitude: 60.4, longitude: 5.3, timestamp: now, accuracy: 5, speed: 0, altitude: null, altitudeAccuracy: null };
  let task: any, stopped = 0, voiceStopped = 0, appended = 0, active: any = { id: 'trip', startedAt: now - 600000, automatic: true, ...(mode === 'free' ? {} : { workout: mode === 'paused' ? workout.changeWorkout(workout.createWorkout(now - 1000, true), 'pause', now) : workout.createWorkout(now - 1000, true) }) };
  const settings: Record<string, any> = { automaticRecording: 'enabled', idleRecording: { tripId: 'trip', evidence: { anchor: { ...fix, timestamp: now - 600000 }, since: now - 600000, lastSeen: now - 10000, samples: 60 } } };
  const store = { getTrip: () => active, active: () => active, finish: () => { active = null; }, append: () => { appended++; }, setting: (key: string, fallback: unknown) => settings[key] ?? fallback, setSetting: (key: string, value: unknown) => { settings[key] = value; } };
  component('src/services/tracking.ts', {
    './trailActivity': {syncTrailActivity:async()=>{}},
    '../domain/idleRecording': idle, '../domain/workout': workout, './areaConsent': { stageAreaConsent: () => false }, '../domain/natureArea': {},
    '../domain/automaticRecording': { AUTOMATIC_LIMIT_MS: 28800000 }, '../domain/dialect': {}, './tripStatus': { syncTripStatus: async () => {} }, '../domain/metrics': {}, '../domain/commentary': {},
    './workoutCoach': { workoutAvailable: true, syncWorkoutCoach: async (trip: unknown) => { if (!trip) voiceStopped++; } },
    'expo-task-manager': { defineTask: (_: string, cb: any) => { task = cb; } }, 'expo-speech': { stop: async () => {} }, './voice': {}, 'react-native': { Platform: { OS: 'android', Version: 32 }, PermissionsAndroid: {} },
    '../domain/startGate': {}, '../domain/routeMatch': {}, '../domain/stretchRuns': {}, '../domain/ghost': {}, '../domain/geo': { validFix: () => false }, '../data/native': { getStore: () => store },
    'expo-location': { Accuracy: { BestForNavigation: 6 }, ActivityType: { Fitness: 3 }, hasStartedLocationUpdatesAsync: async () => true, stopLocationUpdatesAsync: async () => { stopped++; } },
  });
  await task({ data: { locations: [{ timestamp: now, coords: fix }] } });
  assert.equal(appended, 1);
  if (mode === 'running') { assert.ok(active); assert.equal(stopped, 0); assert.equal(voiceStopped, 0); assert.equal(settings.automaticRecording, 'enabled'); assert.equal(settings.idleRecording.evidence, null); return; }
  assert.equal(active, null); assert.equal(stopped, 1); assert.equal(voiceStopped, 1);
  assert.equal(settings.automaticRecording, 'paused'); assert.equal(settings.automaticPauseReason, 'idle'); assert.equal(settings.idleRecording, null);
});
