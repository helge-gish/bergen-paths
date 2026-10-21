import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { component } from './support/component';
import { goalRequest } from '../src/services/goalRequest';
import { fetchDiscoveries } from '../src/services/osm';
import { AbortController as NativeAbortController } from 'abort-controller';

test('whole goal operation times out even if fetch/native work ignores abort', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const controller = new AbortController();
  const pending = goalRequest(controller, () => new Promise(() => {}));
  const rejected = assert.rejects(pending, /tok for lang tid/);
  t.mock.timers.tick(30000);
  await rejected;
  assert.ok(controller.signal.aborted);
});
test('timeout message survives the Android abort-controller polyfill without signal.reason', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const controller = new NativeAbortController() as unknown as AbortController;
  const pending = goalRequest(controller, () => new Promise(() => {}));
  const rejected = assert.rejects(pending, /tok for lang tid/);
  t.mock.timers.tick(30000); await rejected;
  assert.ok(controller.signal.aborted);
});
test('cancel stops a hung request immediately and an already-cancelled request never starts', async () => {
  const controller = new AbortController();
  const pending = goalRequest(controller, () => new Promise(() => {}));
  const rejected = assert.rejects(pending, { name: 'AbortError' });
  controller.abort(); await rejected;
  let called = false;
  await assert.rejects(goalRequest(controller, async () => { called = true; }), { name: 'AbortError' });
  assert.equal(called, false);
});
test('goal cancellation propagates to the real discovery fetch', async t => {
  let requestSignal: AbortSignal | undefined;
  t.mock.method(globalThis, 'fetch', (_url: unknown, init: RequestInit) => {
    requestSignal = init.signal!;
    return new Promise<Response>((_, reject) => requestSignal!.addEventListener('abort', () => reject(new Error('fetch aborted'))));
  });
  const controller = new AbortController();
  const pending = fetchDiscoveries({ latitude: 60, longitude: 5 }, 3000, controller.signal);
  const rejected = assert.rejects(pending, /fetch aborted/);
  controller.abort(); await rejected;
  assert.ok(requestSignal?.aborted);
});
test('cancel and retry release goal loading; a late old response cannot overwrite the new result', async t => {
  const { useGoalSearch } = component('src/ui/useGoalSearch.ts', { '../services/goalRequest': { goalRequest } });
  let search: ReturnType<typeof useGoalSearch>, tree!: ReactTestRenderer;
  function Harness() { search = useGoalSearch(); return null; }
  await act(() => { tree = create(React.createElement(Harness)); });
  t.after(async () => act(() => tree.unmount()));
  let late!: (value: string) => void, pending!: Promise<void>;
  const commits: string[] = [];
  await act(() => { pending = search.run('nearby', () => new Promise(resolve => { late = resolve; }), (value: string) => commits.push(value)); });
  assert.equal(search.loading, 'nearby');
  await act(() => search.cancel()); await pending;
  assert.equal(search.loading, null);
  await act(() => search.run('bergen', async () => 'new', (value: string) => commits.push(value)));
  late('old'); await act(async () => {});
  assert.deepEqual(commits, ['new']); assert.equal(search.loading, null); assert.equal(search.error, null);
});
test('goal screen shows active goal once and does not pretend background work is fetching goals', async t => {
  const { Goals } = component('src/ui/Goals.tsx', {
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable' },
    './useCollectionProgress': { useCollectionProgress: () => ({ progress: {}, pending: true, processed: 0, total: 7 }) },
    './useNearbyArea': { nearbyRadii: [1000, 3000, 5000] }, './components': { Button: 'Button' }, './theme': { colors: {}, styles: {} },
  });
  const goal = { id: 'bergen', title: 'De syv byfjellene i Bergen', targets: [], curated: true, description: 'Syv topper', createdAt: 0 };
  let tree!: ReactTestRenderer;
  await act(() => { tree = create(React.createElement(Goals, { homeArea: null, radius: 3000, goals: [goal], catalog: [goal], trips: [], loading: null, error: null, onCancel() {}, onToggle() {}, onLoad() {}, onBergen() {}, onArea() {} })); });
  t.after(async () => act(() => tree.unmount()));
  const text = JSON.stringify(tree.toJSON());
  assert.equal(text.split('De syv byfjellene i Bergen').length - 1, 1);
  assert.doesNotMatch(text, /Se mål: De syv|Henter mål/);
  assert.equal(tree.root.findByProps({ title: 'Finn mål rundt meg' }).props.disabled, false);
});
