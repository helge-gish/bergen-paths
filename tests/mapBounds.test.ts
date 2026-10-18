import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coordinateBounds } from '../src/domain/geo';
test('route bounds include the eastern end and every detour, not only the start', () => {
  const points = [{ latitude: 60.4, longitude: 5.31 }, { latitude: 60.41, longitude: 5.38 }, { latitude: 60.38, longitude: 5.35 }];
  const bounds = coordinateBounds(points)!;
  assert.deepEqual(bounds, [5.31, 60.38, 5.38, 60.41]);
  for (const p of points) assert.ok(p.longitude >= bounds[0] && p.longitude <= bounds[2] && p.latitude >= bounds[1] && p.latitude <= bounds[3]);
});
test('stationary, empty and invalid routes have safe bounds', () => {
  assert.equal(coordinateBounds([]), null); assert.equal(coordinateBounds([{ latitude: NaN, longitude: 5 }]), null);
  const b = coordinateBounds([{ latitude: 60.39, longitude: 5.34 }])!;
  assert.ok(b[2] - b[0] >= 0.00039 && b[3] - b[1] >= 0.00019);
  assert.deepEqual(coordinateBounds([{ latitude: 91, longitude: 5 }, { latitude: 60.39, longitude: 5.34 }]), b);
});
