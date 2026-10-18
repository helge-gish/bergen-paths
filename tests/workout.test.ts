import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changeWorkout, createWorkout, WORKOUT_MS, workoutCues, workoutElapsed, workoutPhases, workoutStatus } from '../src/domain/workout';
test('35 minute trainer has four complete brisk efforts, three recoveries and no extra recovery before cooldown', () => {
  const w = createWorkout(1000, true);
  assert.equal(workoutStatus(w, 1000).current?.kind, 'warmup');
  assert.equal(workoutStatus(w, 300999).remaining, 1);
  assert.equal(workoutStatus(w, 301000).current?.round, 1);
  assert.equal(workoutStatus(w, 541000).current?.kind, 'easy');
  assert.equal(workoutStatus(w, 541000).rounds, 1);
  assert.equal(workoutStatus(w, 1801000).current?.kind, 'cooldown');
  assert.equal(workoutStatus(w, 1801000).rounds, 4);
  assert.equal(workoutStatus(w, 2101000).complete, true);
  assert.equal(workoutElapsed(w, 9e9), WORKOUT_MS);
  assert.equal(workoutPhases.filter(p => p.kind === 'easy').length, 3);
});
test('pause and resume preserve exact progress, repeated pause does not add elapsed time, early stop freezes summary', () => {
  let w = createWorkout(1000, true);
  w = changeWorkout(w, 'pause', 360000);
  assert.equal(workoutElapsed(w, 999999), 359000);
  assert.equal(workoutStatus(w, 999999).paused, true);
  w = changeWorkout(w, 'pause', 500000);
  w = changeWorkout(w, 'resume', 700000);
  assert.equal(workoutElapsed(w, 701000), 360000);
  w = changeWorkout(w, 'stop', 720000);
  assert.equal(workoutElapsed(w, 1e9), 379000);
  assert.equal(changeWorkout(w, 'resume', 800000), w);
  assert.equal(workoutStatus(w, 1e9).complete, false);
});
test('coaching plan has ordered unique deadlines, every transition and reminders during every brisk effort', () => {
  assert.equal(new Set(workoutCues.map(c => c.at)).size, workoutCues.length);
  assert.deepEqual(workoutCues.map(c => c.at), workoutCues.map(c => c.at).sort((a,b) => a-b));
  for (const p of workoutPhases) {
    assert.ok(workoutCues.some(c => c.at === p.start * 1000));
    if (p.kind === 'fast') for (const offset of [60,120,180,230]) assert.ok(workoutCues.some(c => c.at === (p.start + offset) * 1000));
  }
  assert.equal(workoutCues.at(-1)?.at, WORKOUT_MS);
});
test('clock before start cannot create negative countdowns; completion survives stop', () => {
  const w = createWorkout(1000, false);
  assert.equal(workoutElapsed(w, 0), 0);
  assert.equal(workoutStatus(changeWorkout(w, 'stop', 1e9), 1e9).complete, true);
});

test('native final-APK fixture uses the production coaching plan without accelerated intervals', async () => {
  const { readFileSync } = await import('node:fs');
  const plan = JSON.parse(readFileSync(new URL('../scripts/android-coach-test/plan.json', import.meta.url), 'utf8'));
  assert.deepEqual(plan, { cues: workoutCues, phases: workoutPhases, totalMs: WORKOUT_MS });
});
