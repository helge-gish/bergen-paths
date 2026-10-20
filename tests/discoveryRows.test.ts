import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Discovery, Progress } from '../src/domain/discoveries';
import { discoveryRows, rowKinds, rowProgress, rowProgressLabel, tripDiscoveryRows } from '../src/domain/discoveryRows';
import { mapSelection } from '../src/domain/mapSelection';

const point = (n: number) => ({ latitude: 60.4 + n * .0001, longitude: 5.34 });
const part = (id: string, from: number, to: number, kind: Discovery['kind'] = 'trail'): Discovery => ({
  id, name: 'Skredderdalen', kind, ...point(from), geometry: [point(from), point(to)],
  sourceUrl: `https://www.openstreetmap.org/${id}`, fetchedAt: 1,
});
const done = (trip: string): Progress => ({ fraction: 1, collected: true, firstVisit: 100, earnedTripId: trip });

test('five connected trail fragments and stairs show as one Skredderdalen row, preserving every map path', () => {
  const items = Array.from({ length: 6 }, (_, i) => part(`way/${i}`, i, i + 1, i === 5 ? 'steps' : 'trail'));
  const original = JSON.stringify(items);
  const rows = discoveryRows(items);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].members.length, 6);
  assert.equal(rowKinds(rows[0]), 'Stier og Trapper');
  assert.deepEqual(rows[0].item.streetPaths, items.map(item => item.geometry));
  assert.deepEqual(rows[0].item.streetEnds, []);
  assert.equal(JSON.stringify(items), original);
  const map = mapSelection(items, [0, 0, 1, 1], rows[0].item);
  assert.equal(map.items[0], rows[0].item);
  assert.equal(map.items[0].streetPaths?.length, 6);
});

test('same name at distant places, a nearby unconnected route and a viewpoint remain separate', () => {
  const a = part('way/a', 0, 1);
  const b = part('way/b', 10000, 10001);
  const c = { ...a, id: 'way/c', geometry: a.geometry.map(p => ({ ...p, longitude: p.longitude + .00002 })) };
  const d = { ...a, id: 'node/d', kind: 'viewpoint' as const };
  assert.equal(discoveryRows([a, b, c, d]).length, 4);
});

test('normalizes names, includes all stair branches and joins transitively regardless of input order', () => {
  const a = part('way/a', 0, 1);
  const b = { ...part('way/b', 1, 2, 'steps'), name: '  SKREDDERDALEN  ', streetPaths: [[point(1), point(2)], [point(2), point(3)]] };
  const c = part('way/c', 3, 4);
  const rows = discoveryRows([c, a, b]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].item.streetPaths?.length, 4);
  assert.equal(rows[0].id, discoveryRows([a, b, c])[0].id);
});

test('unnamed and individually named personal routes retain their identity and rename actions', () => {
  const a = { ...part('way/a', 0, 1), name: 'Sti uten navn', unnamed: true };
  const b = { ...part('way/b', 1, 2), name: 'Sti uten navn', unnamed: true };
  assert.equal(discoveryRows([a, b]).length, 2);
  assert.equal(discoveryRows([{ ...a, name: 'Min sti', localName: 'Min sti' }, { ...b, name: 'Min sti', localName: 'Min sti' }]).length, 2);
  assert.equal(discoveryRows([a, a]).length, 1);
});

test('a route with completed and unwalked parts is not labelled fully collected', () => {
  const rows = discoveryRows([part('a', 0, 1), part('b', 1, 2)]);
  const progress = { a: done('today'), b: { fraction: .2, collected: false, firstVisit: 200 } };
  assert.deepEqual(rowProgress(rows[0], progress), { complete: false, collected: true, visited: true, firstVisit: 200 });
  assert.equal(rowProgressLabel(rows[0], progress), '1 av 2 deler gått');
  assert.equal(rowProgressLabel(rows[0], { a: done('today'), b: done('today') }), 'Alle kartlagte deler gått');
  assert.equal(rowProgress(rows[0], { a: done('today') }).complete, false);
});

test('a previous/partial connecting part does not split the route or duplicate it in both trip sections', () => {
  const rows = discoveryRows([part('a', 0, 1), part('b', 1, 2, 'steps'), part('c', 2, 3)]);
  const progress = { a: done('today'), b: done('yesterday'), c: done('today') };
  const visited = { a: done('today'), b: { fraction: .5, collected: false, firstVisit: 10 }, c: done('today') };
  const { fresh, other } = tripDiscoveryRows(rows, 'today', progress, visited);
  assert.equal(fresh.length, 1);
  assert.equal(other.length, 0);
  const repeated = tripDiscoveryRows(rows, 'tomorrow', progress, visited);
  assert.equal(repeated.fresh.length, 0);
  assert.equal(repeated.other.length, 1);
});
