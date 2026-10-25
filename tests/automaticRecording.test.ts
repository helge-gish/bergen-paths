import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAutomaticRecorder, type RecordingPreference } from '../src/domain/automaticRecording';
function harness(preference: RecordingPreference = 'enabled') {
  let active = false, service = false, starts = 0, finishes = 0, resumes = 0;
  let blocker: Promise<unknown> = Promise.resolve();
  const recorder = createAutomaticRecorder({ preference: () => preference, setPreference: value => { preference = value; }, active: () => active, running: async () => service,
    start: async () => { starts++; await blocker; active = true; service = true; },
    resume: async () => { resumes++; service = true; }, finish: async () => { finishes++; active = false; service = false; },
  });
  return { recorder, block(p: Promise<unknown>) { blocker = p; }, stopService() { service = false; }, state: () => ({ active, service, starts, finishes, resumes, preference }) };
}
test('opening never starts a trip; explicit start and recovery create exactly one recording', async () => {
  const legacy=harness('enabled');await legacy.recorder.ensure();assert.equal(legacy.state().starts,0);
  const h = harness('unconfigured'); await h.recorder.ensure(); assert.equal(h.state().starts, 0);
  await Promise.all([h.recorder.enable(), h.recorder.ensure(), h.recorder.ensure()]);
  assert.equal(h.state().starts, 1); assert.equal(h.state().active, true);
  h.stopService(); await h.recorder.ensure(); assert.equal(h.state().resumes, 1); assert.equal(h.state().starts, 1);
});
test('pause wins over in-flight permissions and remains paused on reopening', async () => {
  const h = harness(); let release!: () => void;
  h.block(new Promise<void>(resolve => { release = resolve; }));
  const starting = h.recorder.enable(); await Promise.resolve(); await Promise.resolve();
  assert.equal(h.state().starts, 1);
  const paused = h.recorder.pause(); release(); await Promise.all([starting, paused]);
  assert.equal(h.state().active, false); assert.equal(h.state().service, false);
  await h.recorder.ensure(); assert.equal(h.state().starts, 1); assert.equal(h.state().preference, 'paused');
  await h.recorder.enable(); assert.equal(h.state().starts, 2); assert.equal(h.state().active, true);
});
test('a denied startup does not poison later explicit retry or pause', async () => {
  const h = harness(); h.block(Promise.reject(new Error('Permission denied')));
  await assert.rejects(h.recorder.enable(), /Permission denied/);
  h.block(Promise.resolve()); await h.recorder.pause(); await h.recorder.ensure();
  assert.equal(h.state().active, false);
  await h.recorder.enable(); assert.equal(h.state().active, true);
});

test('declining first-start permissions restores the consent gate and never retries on foreground', async () => {
  const h = harness('unconfigured'); h.block(Promise.reject(new Error('Permission denied')));
  await assert.rejects(h.recorder.enable(), /Permission denied/);
  assert.equal(h.state().preference, 'unconfigured');
  const starts = h.state().starts;
  await h.recorder.ensure(); assert.equal(h.state().starts, starts);
  h.block(Promise.resolve()); await h.recorder.enable(); assert.equal(h.state().active, true);
});
