import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanceToMapItem, mapFeatures, mapItems, pickedMapTrail } from '../src/domain/mapPresentation';
import type { Discovery } from '../src/domain/discoveries';
import { mapSelection } from '../src/domain/mapSelection';
const trail: Discovery = { id: 'way/1', name: 'Stien', kind: 'trail', osmHighway: 'path', latitude: 60, longitude: 5, geometry: [{ latitude: 60, longitude: 5 }, { latitude: 60.001, longitude: 5 }], fetchedAt: 0, sourceUrl: '' };
test('ordinary roads and duplicate POI markers leave the overlay but selected places remain visible', () => {
  const street: Discovery = { ...trail, id: 'street/a', kind: 'street' };
  const peak: Discovery = { ...trail, id: 'peak/a', kind: 'peak', geometry: [] };
  const original = [trail, street, peak];
  const filtered = mapItems(original);
  assert.deepEqual(filtered, [trail]); assert.equal(original.length, 3);
  const selection = mapSelection(filtered, [4, 59, 6, 61], peak);
  assert.ok(selection.items.includes(peak));
  assert.equal(mapFeatures(selection.items, peak).features[0].geometry.type, 'Point');
});
test('touching parallel trails selects the nearest geometry regardless of native feature order', () => {
  const parallel = { ...trail, id: 'way/2', geometry: trail.geometry.map(p => ({ ...p, longitude: 5.0003 })) };
  const items = [trail, parallel], features = mapFeatures(items).features;
  assert.equal(pickedMapTrail(features, items, { latitude: 60.0005, longitude: 5.00029 })?.id, parallel.id);
  assert.equal(pickedMapTrail([...features].reverse(), items, { latitude: 60.0005, longitude: 5.00001 })?.id, trail.id);
  assert.equal(pickedMapTrail([], items, { latitude: 60, longitude: 5 }), null);
});
test('path, footway and stairs retain distinct styles and disconnected branches are not joined', () => {
  const steps: Discovery = { ...trail, id: 'steps', kind: 'steps', streetPaths: [trail.geometry, trail.geometry.map(p => ({ ...p, longitude: 5.01 }))] };
  const features = mapFeatures([trail, { ...trail, id: 'footway', osmHighway: 'footway' }, steps], steps).features;
  assert.deepEqual(features.map(f => f.properties?.kind), ['path', 'footway', 'steps', 'steps']);
  assert.equal(features.length, 4);
  assert.ok(features.slice(2).every(f => f.properties?.selected && f.properties.targetId === 'steps'));
});

test('distance is to the nearest mapped segment, never the centroid or a bridge across missing geometry', () => {
  const point = { latitude: 60.0005, longitude: 5.0002 };
  const metres = distanceToMapItem(point, { ...trail, latitude: 61 });
  assert.ok(metres !== null && metres > 10 && metres < 12);
  const disconnected = { ...trail, streetPaths: [
    [{ latitude: 60, longitude: 4.99 }, { latitude: 60, longitude: 4.995 }],
    [{ latitude: 60, longitude: 5.005 }, { latitude: 60, longitude: 5.01 }],
  ] };
  assert.ok(distanceToMapItem({ latitude: 60, longitude: 5 }, disconnected)! > 270);
  const invalid = { ...trail, geometry: [disconnected.streetPaths[0][1], { latitude: NaN, longitude: 5 }, disconnected.streetPaths[1][0]] };
  assert.ok(distanceToMapItem({ latitude: 60, longitude: 5 }, invalid)! > 270);
  assert.equal(distanceToMapItem(null, trail), null);
  assert.equal(distanceToMapItem({ latitude: 91, longitude: 5 }, trail), null);
  assert.equal(distanceToMapItem(point, { ...trail, geometry: [] }), null);
  assert.ok(distanceToMapItem(point, { ...trail, kind: 'peak', geometry: [] })! > 50);
});
