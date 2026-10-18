import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nameDiscovery } from '../src/domain/discoveryNames';
import { needsDiscoveryName } from '../src/domain/discoveryGroups';
import { mergeDiscoveries } from '../src/domain/areas';
import type { Discovery } from '../src/domain/discoveries';
const route: Discovery = { id: 'way/1', kind: 'trail', name: 'Sti uten navn', latitude: 60, longitude: 5, geometry: [], sourceUrl: 'https://www.openstreetmap.org/way/1', fetchedAt: 1 };
test('a local name promotes a route without changing its identity, geometry or OSM source', () => {
  const [named] = nameDiscovery([route], route.id, '  Smauet ved hagen  ');
  assert.equal(named.name, 'Smauet ved hagen');
  assert.equal(named.osmName, route.name);
  assert.equal(named.id, route.id); assert.equal(named.geometry, route.geometry); assert.equal(named.sourceUrl, route.sourceUrl);
  assert.equal(needsDiscoveryName(named), false);
  assert.equal(needsDiscoveryName(nameDiscovery([named], route.id, '')[0]), true);
  assert.equal(route.name, 'Sti uten navn');
});
test('local naming survives unnamed map refresh, but an arriving official name takes over and is locked', () => {
  const named = nameDiscovery([route], route.id, 'Hagestien');
  assert.equal(mergeDiscoveries(named, [{ ...route, fetchedAt: 2 }])[0].name, 'Hagestien');
  const [refreshed] = mergeDiscoveries(named, [{ ...route, name: 'Offisiell sti', unnamed: false, fetchedAt: 2 }]);
  assert.equal(refreshed.name, 'Offisiell sti'); assert.equal(refreshed.localName, undefined);
  assert.equal(needsDiscoveryName(refreshed), false);
  assert.throws(() => nameDiscovery([refreshed], route.id, 'Nytt navn'));
  assert.throws(() => nameDiscovery([refreshed], route.id, ''));
});
test('names cannot alter unrelated targets or inject control characters', () => {
  assert.throws(() => nameDiscovery([route], 'missing', 'Name'));
  assert.throws(() => nameDiscovery([route], route.id, 'a\nb'));
  assert.throws(() => nameDiscovery([{ ...route, name: 'Named trail' }], route.id, 'Replacement'));
});


test('viewpoints can be named locally, retain names on refresh and lock when an official name arrives', () => {
  const viewpoint: Discovery = { ...route, id: 'node/2', kind: 'viewpoint', name: 'Utsiktspunkt', geometry: [] };
  const [named] = nameDiscovery([viewpoint], viewpoint.id, 'Fjordgløtt');
  assert.equal(needsDiscoveryName(named), false);
  assert.equal(mergeDiscoveries([named], [viewpoint])[0].name, 'Fjordgløtt');
  const [official] = mergeDiscoveries([named], [{ ...viewpoint, name: 'Offisiell utsikt', unnamed: false }]);
  assert.equal(official.name, 'Offisiell utsikt');
  assert.throws(() => nameDiscovery([official], official.id, 'Nytt navn'));
  assert.equal(needsDiscoveryName(nameDiscovery([named], named.id, '')[0]), true);
});
