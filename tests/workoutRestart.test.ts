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

test('coach and lock-screen bridge receive matching program duration, phases and name for every mode', async () => {
  const configs: any[] = [], statuses: any[] = [];
  const { syncWorkoutCoach } = component('src/services/workoutCoach.ts', {
    expo: { requireOptionalNativeModule: () => ({ configure: async (json: string) => configs.push(JSON.parse(json)) }) },
    '../data/native': { getStore: () => ({ setting: () => 'neutral' }) }, '../domain/workout': workout,
  });
  const { syncTripStatus } = component('src/services/tripStatus.ts', {
    '../domain/natureTiming': {walkingMetrics:()=>({meters:50,ascent:5,hasElevation:true,moving:30000})},
    expo: { requireOptionalNativeModule: () => ({ updateTripStatus: async (json: string) => statuses.push(JSON.parse(json)) }) },
    '../domain/workout': workout, '../domain/metrics': { tripMetrics: () => ({ meters: 100, ascent: 10, hasElevation: true, points: [] }) },
    '../domain/commentary': { journeyContext: () => '' },
  });
  for (const plan of workout.workoutPlans) {
    const trip = { id: 'gps', startedAt: 500, endedAt: null, audioEnabled: false, ghostId: null, workout: { ...workout.createWorkout(1000, false, plan.kind), id: plan.kind } };
    await syncWorkoutCoach(trip); await syncTripStatus(trip);
    const coach = configs.at(-1), status = statuses.at(-1);
    assert.equal(coach.totalMs, plan.totalMs); assert.equal(status.workoutTotalMs, plan.totalMs);
    assert.equal(status.workoutName, plan.name);
    assert.deepEqual(coach.phases, plan.phases); assert.deepEqual(status.phases, plan.phases);
    assert.deepEqual(coach.cues, plan.cues); assert.equal(coach.audio, false); assert.equal(coach.vibrate, true);
  }
});
