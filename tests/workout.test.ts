import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changeWorkout, createWorkout, WORKOUT_MS, workoutCues, workoutElapsed, workoutPhases, workoutStatus, workoutPlan } from '../src/domain/workout';
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

for (const [kind, minutes, rounds] of [['interval-walk', 30, 5], ['walk-jog', 25, 6], ['minute-intervals', 30, 10], ['pyramid', 23, 5]] as const) {
  test(`${kind}: exact phase boundaries, completion, pause/restart and native transition cues`, () => {
    const plan = workoutPlan(kind), w = createWorkout(1000, false, kind);
    assert.equal(plan.totalMs, minutes * 60000);
    assert.equal(plan.rounds, rounds);
    for (let i = 0; i < plan.phases.length; i++) {
      const p = plan.phases[i];
      assert.equal(workoutStatus(w, 1000 + p.start * 1000).current, p);
      assert.equal(workoutStatus(w, 1000 + (p.start + p.seconds) * 1000 - 1).remaining, 1);
      assert.equal(workoutStatus(w, 1000 + (p.start + p.seconds) * 1000).current, plan.phases[i + 1] ?? null);
      assert.ok(plan.cues.some(c => c.at === p.start * 1000 && c.transition));
    }
    const paused = changeWorkout(w, 'pause', 100000), resumed = changeWorkout(paused, 'resume', 999000);
    assert.equal(workoutElapsed(paused, 999000), 99000);
    assert.equal(workoutElapsed(resumed, 1000000), 100000);
    const done = workoutStatus(w, 1000 + plan.totalMs);
    assert.equal(done.complete, true); assert.equal(done.rounds, rounds); assert.equal(done.next, null);
    assert.equal(workoutElapsed(w, 1e10), plan.totalMs);
    assert.equal(changeWorkout(w, 'resume', 1e10).runningSince, null);
    assert.equal(workoutElapsed(changeWorkout(resumed, 'stop', 1000000), 1e10), 100000);
    assert.equal(new Set(plan.cues.map(c => c.at)).size, plan.cues.length);
    assert.deepEqual(plan.cues.map(c => c.at), plan.cues.map(c => c.at).sort((a, b) => a - b));
    assert.equal(plan.cues.at(-1)?.at, plan.totalMs); assert.equal(plan.cues.at(-1)?.transition, true);
    assert.ok(plan.cues.every(c => !/fire ganger fire|4×4/.test(c.text)));
  });
}
test('Japanese walking is five slow/fast 3-minute pairs; walk/jog includes six short jogs with recovery', () => {
  const walk = workoutPlan('interval-walk').phases;
  assert.equal(walk.length, 10); assert.ok(walk.every(p => p.seconds === 180));
  assert.deepEqual(walk.map(p => p.kind), Array.from({ length: 5 }, () => ['easy', 'fast']).flat());
  const jog = workoutPlan('walk-jog').phases;
  assert.equal(jog[0].kind, 'warmup'); assert.equal(jog.at(-1)?.kind, 'cooldown');
  assert.equal(jog.filter(p => p.kind === 'fast' && p.seconds === 60).length, 6);
  assert.equal(jog.filter(p => p.kind === 'easy' && p.seconds === 120).length, 6);
});

test('short intervals and pyramid have their advertised pattern and warmup/cooldown',()=>{
 const minute=workoutPlan('minute-intervals'),pyramid=workoutPlan('pyramid');
 assert.deepEqual(minute.phases.slice(1,-1).map(p=>[p.kind,p.seconds]),Array.from({length:10},()=>[['fast',60],['easy',60]]).flat());
 assert.deepEqual(pyramid.phases.filter(p=>p.kind==='fast').map(p=>p.seconds),[60,120,180,120,60]);
 assert.equal(pyramid.phases.filter(p=>p.kind==='easy'&&p.seconds===60).length,4);
 for(const p of [minute,pyramid]){assert.equal(p.phases[0].seconds,300);assert.equal(p.phases[0].kind,'warmup');assert.equal(p.phases.at(-1)?.seconds,300);assert.equal(p.phases.at(-1)?.kind,'cooldown');}
});
