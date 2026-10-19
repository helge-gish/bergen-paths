import { cleanPoints, distance, MAX_GAP_MS } from './geo';
import type { Fix, Trip } from './types';
export const elapsedMs = (trip: Pick<Trip, 'startedAt' | 'endedAt'>, now = Date.now()) => Math.max(0, (trip.endedAt ?? now) - trip.startedAt);
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
type Geometry = ReturnType<typeof measureTrack>;
const geometryCache = new WeakMap<Fix[], { start: number; end: number | null; from: number; until: number; value: Geometry }>();
export function elevation(points: Fix[]) {
  let ascent = 0, descent = 0, anchor: number | null = null;
  let window: number[] = [], previousTime: number | null = null, count = 0;
  for (const p of points) {
    if (previousTime !== null && p.timestamp - previousTime > MAX_GAP_MS) { window = []; anchor = null; }
    previousTime = p.timestamp;
    if (p.altitude === null || !Number.isFinite(p.altitude) || p.altitudeAccuracy === null || p.altitudeAccuracy < 0 || p.altitudeAccuracy > 15) continue;
    count++;
    window.push(p.altitude);
    if (window.length > 5) window.shift();
    const value = median(window);
    if (anchor === null) { anchor = value; continue; }
    const change = value - anchor;
    if (Math.abs(change) >= 4) { if (change > 0) ascent += change; else descent -= change; anchor = value; }
  }
  return { ascent, descent, hasElevation: count >= 2 };
}
function measureTrack(trip: Trip, now: number) {
  const points = cleanPoints(trip.points.filter(p => p.timestamp >= trip.startedAt && p.timestamp <= (trip.endedAt ?? now)));
  let meters = 0, anchor = points[0], gapsMs = 0;
  for (let i = 1; i < points.length; i++) {
    const p = points[i], prev = points[i - 1];
    const dt = p.timestamp - prev.timestamp;
    if (dt > MAX_GAP_MS) { gapsMs += dt; anchor = p; continue; }
    const step = distance(anchor, p);
    if (step >= Math.max(3, (anchor.accuracy + p.accuracy) / 4)) { meters += step; anchor = p; }
  }
  return { points, meters, gapsMs, ...elevation(points) };
}
export function tripMetrics(trip: Trip, now = Date.now()) {
  let cached = geometryCache.get(trip.points);
  if (!cached || cached.start !== trip.startedAt || cached.end !== trip.endedAt || now < cached.from || now >= cached.until) {
    const value = measureTrack(trip, now);
    // Future-dated fixes must become visible when the clock catches up. Ended
    // tracks have a fixed cutoff; elapsed time and stale speed remain live below.
    const until = trip.endedAt !== null ? Infinity : trip.points.reduce((n, p) => p.timestamp > now ? Math.min(n, p.timestamp) : n, Infinity);
    cached = { start: trip.startedAt, end: trip.endedAt, from: now, until, value };
    geometryCache.set(trip.points, cached);
  }
  const { points, meters } = cached.value;
  const duration = elapsedMs(trip, now);
  const latest = points.at(-1), previous = points.at(-2);
  let speedKmh: number | null = null;
  if (latest && now - latest.timestamp < 15_000 && trip.endedAt === null) {
    if (latest.speed !== null && latest.speed >= 0 && latest.speed <= 12) speedKmh = latest.speed * 3.6;
    else if (previous && latest.timestamp - previous.timestamp <= 15_000) speedKmh = distance(previous, latest) / ((latest.timestamp - previous.timestamp) / 1000) * 3.6;
  }
  return { ...cached.value, elapsed: duration, averageKmh: duration > 0 ? meters / duration * 3600 : 0, paceSeconds: meters >= 50 ? duration / meters : null, speedKmh };
}
/** Gross energy range from broad activity MET bands, including resting time.
 * Never use age/height to imply individualized physiological accuracy. */
export function energyEstimate(trip: Trip, weightKg: number | null) {
  if (trip.endedAt === null || weightKg === null || !Number.isFinite(weightKg) || weightKg < 25 || weightKg > 300) return null;
  const total = elapsedMs(trip);
  if (total < 60_000) return null;
  const points = cleanPoints(trip.points.filter(p => p.timestamp >= trip.startedAt && p.timestamp <= trip.endedAt!));
  let covered = 0, metMs = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dt = b.timestamp - a.timestamp;
    if (dt > MAX_GAP_MS) continue;
    const d = distance(a, b);
    const speed = b.speed !== null && b.speed >= 0 ? b.speed * 3.6 : d / dt * 3600;
    if (speed > 9) return null; // Hiking estimate is not valid for running/cycling.
    const met = speed < 1 ? 1.3 : speed < 4 ? 3 : speed < 6 ? 4.5 : 6;
    covered += dt;
    metMs += met * dt;
  }
  if (covered < total * 0.9) return null;
  const kcal = weightKg * (metMs + (total - covered) * 1.3) / 3_600_000;
  return { low: Math.round(kcal * 0.7 / 10) * 10, high: Math.round(kcal * 1.3 / 10) * 10 };
}
export function durationLabel(ms: number) {
  const secs = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(secs / 3600)).padStart(2, '0')}:${String(Math.floor(secs / 60) % 60).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
}
export const kmLabel = (m: number) => (m / 1000).toLocaleString('nb-NO', { maximumFractionDigits: 2, minimumFractionDigits: 1 });
export const shortDistance = (m: number) => m < 1000 ? `${Math.round(m / 10) * 10} m` : `${kmLabel(m)} km`;
