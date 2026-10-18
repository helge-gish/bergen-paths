import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordMedals, routeRecord, sameCompletedRoute } from '../src/domain/records';
import { stretchResults } from '../src/domain/stretchRuns';
import type { Fix, Trail, Trip } from '../src/domain/types';
const epoch = 1_000_000;
function walk(id: string, start: number, step = 10000, count = 41): Trip {
  const points: Fix[] = Array.from({ length: count }, (_, i) => ({ latitude: 60 + i * .0001, longitude: 5.3, timestamp: start + i * step, accuracy: 4, altitude: null, altitudeAccuracy: null, speed: 1 }));
  return { id, name: id, startedAt: start, endedAt: points.at(-1)!.timestamp, ghostId: null, audioEnabled: true, lastCueAt: start, points };
}
const first = walk('source', epoch), faster = walk('faster', epoch + 1000000, 8000);
const trail: Trail = { id: 'hill', tripId: first.id, name: 'Bakken', points: first.points.slice(5, 31), createdAt: first.endedAt! };
test('full-route and stretch record medals remain on earning trip after future faster walks', () => {
  const future = walk('future', epoch + 2000000, 6000);
  const history = [future, faster, first];
  const medals = recordMedals(faster, stretchResults(faster, [trail], history), history);
  assert.deepEqual(medals.map(m => m.kind), ['route', 'stretch']);
  assert.equal(medals[0].previousSeconds, 400);
  assert.equal(medals[0].seconds, 320);
  assert.deepEqual(recordMedals(first, stretchResults(first, [trail], history), history), []);
});
test('beating a slower selected ghost is not beating your personal best', () => {
  const middle = { ...walk('middle', epoch + 2000000, 9000), ghostId: first.id };
  assert.equal(routeRecord(middle, [first, faster]), null);
  assert.equal(recordMedals(middle, stretchResults(middle, [trail], [first, faster], first), [first, faster]).length, 0);
});
test('five-second margin, pauses, and finished history determine record eligibility', () => {
  assert.equal(routeRecord(walk('near', epoch + 1000000, 9900), [first]), null);
  assert.ok(routeRecord(walk('better', epoch + 1000000, 9800), [first]));
  assert.equal(routeRecord({ ...faster, endedAt: first.endedAt! - first.startedAt + faster.startedAt }, [first]), null);
  assert.equal(routeRecord({ ...faster, endedAt: null }, [first]), null);
  assert.equal(routeRecord(faster, [{ ...first, endedAt: null }]), null);
});
test('partial, reversed, detoured, missing GPS and different endpoints cannot win full route', () => {
  const partial = walk('partial', epoch + 1000000, 8000, 30);
  const reverse = { ...faster, points: [...faster.points].reverse().map((p,i) => ({ ...p, timestamp: faster.startedAt + i * 8000 })) };
  const missing = { ...faster, points: faster.points.filter((_,i) => i < 10 || i > 17) };
  const detour = { ...faster, points: faster.points.map((p,i) => ({ ...p, longitude: i > 8 && i < 20 ? p.longitude + .0015 : p.longitude })) };
  const late = { ...faster, startedAt: faster.startedAt - 120000 };
  for (const t of [partial, reverse, missing, detour, late]) {
    assert.equal(sameCompletedRoute(t, first), false, t.id);
    assert.equal(routeRecord(t, [first]), null);
    assert.equal(sameCompletedRoute(first, t), false, 'symmetric');
  }
});
test('multiple laps compare to earlier laps and award one fastest medal per stretch', () => {
  const shifted = (start: number, step: number) => walk('lap', start, step).points;
  const start = epoch + 1000000;
  const points = [...shifted(start, 8000), ...shifted(start + 500000, 9000), ...shifted(start + 1000000, 6000)];
  const laps = { ...walk('laps', start), points, endedAt: points.at(-1)!.timestamp };
  const results = stretchResults(laps, [trail], [first]);
  assert.equal(results.length, 3);
  assert.equal(results[1].bestSeconds, results[0].seconds);
  const medals = recordMedals(laps, results, [first]).filter(m => m.kind === 'stretch');
  assert.equal(medals.length, 1);
  assert.equal(medals[0].seconds, results[2].seconds);
  assert.equal(medals[0].previousSeconds, results[0].bestSeconds);
});
test('finished matching resolves shared outward/return geometry despite independent GPS drift', () => {
  const base = walk('loop', epoch);
  const route = [...base.points, ...base.points.slice(0,-1).reverse().map((p,i)=>({...p,timestamp:epoch+(i+41)*10000}))];
  const source = {...base, points:route, endedAt:route.at(-1)!.timestamp};
  const repeated = {...source,id:'loop-again',startedAt:epoch+2000000,endedAt:epoch+2000000+80*8000,points:route.map((p,i)=>({...p,longitude:p.longitude+Math.sin(i/5)*.0001,timestamp:epoch+2000000+i*8000}))};
  assert.equal(sameCompletedRoute(source,repeated),true);
  assert.equal(sameCompletedRoute(repeated,source),true);
  assert.ok(routeRecord(repeated,[source]));
  const partial = {...repeated,points:repeated.points.slice(0,41),endedAt:repeated.points[40].timestamp};
  assert.equal(sameCompletedRoute(partial,source),false);
});
