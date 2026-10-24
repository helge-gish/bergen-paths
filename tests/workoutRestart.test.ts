import { test } from 'node:test';
import assert from 'node:assert/strict';
import { component } from './support/component';
import * as workout from '../src/domain/workout';
test('native coach gets a fresh cue identity for each training session inside one GPS recording', async () => {
  const configs: any[] = [];
  const { syncWorkoutCoach } = component('src/services/workoutCoach.ts', {
    expo: { requireOptionalNativeModule: () => ({ configure: async (json: string | null) => configs.push(json ? JSON.parse(json) : null) }) },
    '../data/native': { getStore: () => ({ setting: () => 'neutral' }) }, '../domain/workout': workout,
  });
  const trip = { id: 'same-recording', endedAt: null, audioEnabled: false, ghostId: null, workout: { ...workout.createWorkout(1000, true), id: 'first' } };
  await syncWorkoutCoach(trip);
  await syncWorkoutCoach({ ...trip, workout: workout.changeWorkout(trip.workout, 'pause', 61000) });
  assert.equal(configs[0].id, configs[1].id); // Pause must not replay old cues.
  await syncWorkoutCoach({ ...trip, workout: { ...workout.createWorkout(3000000, true), id: 'second' } });
  assert.notEqual(configs[0].id, configs[2].id); assert.equal(configs[2].elapsedMs, 0);
  assert.equal(configs[2].vibrate, true); assert.equal(configs[2].totalMs, 2100000);
});
