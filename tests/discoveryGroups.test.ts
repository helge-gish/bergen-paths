import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupDiscoveries, isUnnamedRoute, routeProgressLabel } from '../src/domain/discoveryGroups';
import { areaGoals } from '../src/domain/goals';
import { parseOsm, type Discovery } from '../src/domain/discoveries';
const base: Discovery = { id: 'way/1', name: 'Sti uten navn', kind: 'trail', latitude: 60, longitude: 5, geometry: [], sourceUrl: '', fetchedAt: 1 };
test('unnamed paths and stairs share one display group without losing individual IDs or named targets', () => {
  const items: Discovery[] = [base, { ...base, id: 'way/2', kind: 'steps', name: 'Trapp' }, { ...base, id: 'way/3', name: 'Skogsstien' }, { ...base, id: 'node/4', kind: 'viewpoint', name: 'Utsiktspunkt', unnamed: true }];
  const result = groupDiscoveries(items);
  assert.deepEqual(result.unnamed.map(i => i.id), ['way/1', 'way/2']);
  assert.deepEqual(result.named.map(i => i.id), ['way/3', 'node/4']);
  assert.equal(isUnnamedRoute({ ...base, unnamed: false }), false);
});
test('OSM names are trimmed and name presence survives storage, including legacy fallback-looking names', () => {
  const geometry = [{ lat: 60, lon: 5 }, { lat: 60.001, lon: 5 }];
  const items = parseOsm({ elements: [
    { type: 'way', id: 1, geometry, tags: { highway: 'path', name: '  ' } },
    { type: 'way', id: 2, geometry, tags: { highway: 'path', name: 'Sti uten navn' } },
    { type: 'way', id: 3, geometry, tags: { highway: 'steps' } },
  ] }, 1);
  const saved = JSON.parse(JSON.stringify(items)) as Discovery[];
  assert.deepEqual(groupDiscoveries(saved).unnamed.map(i => i.id), ['way/1', 'way/3']);
});
test('partial streets explain missing endpoints separately from coverage', () => {
  assert.equal(routeProgressLabel({ fraction: 1, collected: false, firstVisit: null, streetCheck: { coveredMeters: 100, totalMeters: 100, endsVisited: 1, endsTotal: 2 } }), '100 % gått · 1 av 2 gateender bekreftet');
});


test('generated goals use named routes while retaining meaningful unnamed point destinations', () => {
  const area = { name: 'Testområde', latitude: 60, longitude: 5, radius: 3000 };
  const items: Discovery[] = [base, { ...base, id: 'way/2', kind: 'steps', name: 'Trapp' }, { ...base, id: 'way/3', name: 'Skogsstien' }, { ...base, id: 'node/4', kind: 'viewpoint', name: 'Utsiktspunkt', unnamed: true }];
  const targets = areaGoals(area, items).flatMap(g => g.targets);
  assert.deepEqual(targets.map(i => i.id).sort(), ['node/4', 'way/3']);
});
