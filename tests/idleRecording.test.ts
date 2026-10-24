import { test } from 'node:test';
import assert from 'node:assert/strict';
import { idleEvidence, shouldPauseIdle, type IdleEvidence } from '../src/domain/idleRecording';
import type { Fix } from '../src/domain/types';
const first: Fix = { latitude: 60.4, longitude: 5.3, timestamp: 100000, accuracy: 5, altitude: null, altitudeAccuracy: null, speed: 0 };
function observe(make: (i: number) => Partial<Fix> = () => ({})) {
  let evidence: IdleEvidence | null = null;
  for (let i = 0; i <= 60; i++) { const p = { ...first, timestamp: first.timestamp + i * 10000, ...make(i) }; evidence = idleEvidence(evidence, p, p.timestamp); if (i < 60) assert.equal(shouldPauseIdle(evidence), false); }
  return evidence;
}
test('ten minutes of stationary accurate GPS pauses; jitter is tolerated and state is serializable', () => {
  const evidence = observe(i => ({ latitude: first.latitude + (i % 3) * .00001 }));
  assert.equal(shouldPauseIdle(evidence), true);
  assert.equal(shouldPauseIdle(JSON.parse(JSON.stringify(evidence))), true);
});
test('walking, poor GPS, gaps and replayed samples cannot establish ten minutes of rest', () => {
  assert.equal(shouldPauseIdle(observe(i => ({ latitude: first.latitude + i * .0001, speed: 1.1 }))), false);
  assert.equal(shouldPauseIdle(observe(() => ({ accuracy: 100 }))), false);
  const evidence = idleEvidence(null, first, first.timestamp)!;
  assert.equal(idleEvidence(evidence, first, first.timestamp), evidence);
  assert.equal(idleEvidence(evidence, first, first.timestamp + 120000), null);
  const afterGap = idleEvidence(evidence, { ...first, timestamp: first.timestamp + 700000 }, first.timestamp + 700000);
  assert.equal(shouldPauseIdle(afterGap), false);
});
