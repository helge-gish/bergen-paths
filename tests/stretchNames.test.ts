import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stretchName } from '../src/domain/stretchNames';
import type { Discovery } from '../src/domain/discoveries';
import type { Fix } from '../src/domain/types';

const p = (n: number, time = n * 10000): Fix => ({ latitude: 60.4 + n * .0002, longitude: 5.34, timestamp: time, accuracy: 5, altitude: null, altitudeAccuracy: null, speed: 2 });
const walk = Array.from({ length: 61 }, (_, i) => p(i));
const place = (name: string, at: number, kind: Discovery['kind'] = 'landmark'): Discovery => ({
  id: name, name, kind, ...p(at), geometry: [], sourceUrl: '', fetchedAt: 1,
});
const route = (name: string, from: number, to: number): Discovery => ({ ...place(name, from, 'trail'), geometry: [p(from), p(to)] });
const start = place('Sandvikskirken', 0), end = place('Fløyen', 60, 'peak');
const via = route('Skredderdalen', 20, 40);

test('automatic titles retain direction and include a genuinely followed via route', () => {
  assert.equal(stretchName(walk, [start, end, via]), 'Sandvikskirken – Fløyen via Skredderdalen');
  const reversed = [...walk].reverse().map((point, i) => ({ ...point, timestamp: i * 10000 }));
  assert.equal(stretchName(reversed, [via, end, start]), 'Fløyen – Sandvikskirken via Skredderdalen');
});

test('via recognition combines differently split OSM trail/stair fragments without repeating the title', () => {
  const pieces = Array.from({ length: 20 }, (_, i) => ({
    ...route(i % 2 ? '  SKREDDERDALEN ' : 'Skredderdalen', 20 + i, 21 + i),
    id: `way/${i}`, kind: i % 2 ? 'steps' as const : 'trail' as const,
  }));
  assert.equal(stretchName(walk, [start, end, ...pieces]), 'Sandvikskirken – Fløyen via Skredderdalen');
});

test('a nearby landmark takes precedence over a road at the endpoints; a remote landmark does not', () => {
  const road = route('Fjellveien', 0, 60);
  assert.equal(stretchName(walk, [road, start, end]), 'Sandvikskirken – Fløyen via Fjellveien');
  assert.equal(stretchName(walk, [road, { ...start, longitude: start.longitude + .0008 }]), 'Langs Fjellveien');
});

test('via points must be passed in the interior, not merely nearby or somewhere on the map', () => {
  const lookout = place('Utsikten', 30, 'viewpoint');
  assert.equal(stretchName(walk, [start, end, lookout]), 'Sandvikskirken – Fløyen via Utsikten');
  assert.equal(stretchName(walk, [start, end, { ...lookout, longitude: lookout.longitude + .002 }]), 'Sandvikskirken – Fløyen');
  assert.equal(stretchName(walk, [start, end, place('Ved starten', 1)]), 'Sandvikskirken – Fløyen');
});

test('clipped ranges use their own endpoints, not the parent trip endpoints', () => {
  const a = place('Mulen', 20), b = place('Brushytten', 40, 'hut');
  assert.equal(stretchName(walk.slice(20, 41), [start, end, a, b]), 'Mulen – Brushytten');
});

test('same endpoint names and round trips produce readable titles without repeating the place', () => {
  assert.equal(stretchName(walk, [route('Fjellveien', 0, 60)]), 'Langs Fjellveien');
  const loop = [...walk, ...walk.slice(0, -1).reverse()].map((point, i) => ({ ...point, timestamp: i * 10000 }));
  assert.equal(stretchName(loop, [start, place('Utsikten', 30, 'viewpoint')]), 'Runde fra Sandvikskirken via Utsikten');
});

test('missing or poor GPS and unnamed map objects do not invent location titles', () => {
  assert.equal(stretchName(walk, []), null);
  assert.equal(stretchName(walk.map(p => ({ ...p, accuracy: 30 })), [start, end, via]), null);
  assert.equal(stretchName(walk, [{ ...via, name: 'Sti uten navn', unnamed: true }]), null);
  assert.equal(stretchName([], [start, end]), null);
  assert.equal(stretchName(walk, [start]), 'Fra Sandvikskirken');
  assert.equal(stretchName(walk, [end]), 'Til Fløyen');
});

test('GPS outages cannot invent a via visit or join short route encounters into a long traversal', () => {
  const gap = [...walk.slice(0, 11), ...walk.slice(50)].map((point, i) => ({ ...point, timestamp: i * 10000 + (i > 10 ? 200000 : 0) }));
  assert.equal(stretchName(gap, [start, end, place('Utsikten', 30), route('Mellomstykket', 10, 50)]), 'Sandvikskirken – Fløyen');
});

test('long names keep both endpoints within the 80 character limit, omitting via before truncating endpoints', () => {
  const longStart = { ...start, name: 'Startstedet med et veldig langt og detaljert navn' };
  const longEnd = { ...end, name: 'Sluttstedet med et veldig langt og detaljert navn' };
  const result = stretchName(walk, [longStart, longEnd, via])!;
  assert.ok(result.length <= 80);
  assert.match(result, /^Startstedet.* – Sluttstedet/);
  assert.ok(!result.includes(' via '));
});
