import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapSelection } from '../src/domain/mapSelection';
import type { Discovery } from '../src/domain/discoveries';
const point: Discovery = { id: 'p', name: 'P', kind: 'peak', latitude: 60, longitude: 5, geometry: [], sourceUrl: '', fetchedAt: 0 };
test('map overlay is bounded without dropping collected data or the selected route', () => {
  const items = Array.from({ length: 12500 }, (_, i) => ({ ...point, id: String(i) }));
  const selected = { ...point, id: 'route', kind: 'trail' as const, latitude: 61, geometry: [{ latitude: 61, longitude: 5 }, { latitude: 61.1, longitude: 5 }] };
  const view = mapSelection(items, [4.9,59.9,5.1,60.1], selected);
  assert.equal(view.items.length, 500); assert.equal(view.limited, true);
  assert.equal(view.items[0], selected); assert.equal(items.length, 12500);
});
test('panning selects the new area and includes a route crossing the viewport', () => {
  const other = { ...point, id: 'other', longitude: 6 };
  const crossing = { ...point, id: 'cross', kind: 'trail' as const, longitude: 4, geometry: [{ latitude: 60, longitude: 4 }, { latitude: 60, longitude: 7 }] };
  assert.deepEqual(mapSelection([point,other,crossing], [5.9,59.9,6.1,60.1]).items.map(i => i.id), ['other','cross']);
});
