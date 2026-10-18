import { cleanPoints, distance, MAX_GAP_MS } from './geo';
import { elapsedMs } from './metrics';
import type { Coordinate, Trip } from './types';
import { matchRoute, type RouteMatch } from './routeMatch';
export type GhostComparison = { position: Coordinate | null; gapSeconds: number | null; reason: string | null };
export function ghostComparison(current: Trip, reference: Trip, now = Date.now(), routeMatch?: RouteMatch): GhostComparison {
  const ref = cleanPoints(reference.points), live = cleanPoints(current.points);
  const elapsed = elapsedMs(current, now), target = reference.startedAt + elapsed;
  let position: Coordinate | null = null;
  for (let i = 1; i < ref.length; i++) {
    const a = ref[i - 1], b = ref[i];
    if (target >= a.timestamp && target <= b.timestamp && b.timestamp - a.timestamp <= MAX_GAP_MS) {
      const f = (target - a.timestamp) / (b.timestamp - a.timestamp);
      position = { latitude: a.latitude + f * (b.latitude - a.latitude), longitude: a.longitude + f * (b.longitude - a.longitude) };
      break;
    }
  }
  if (reference.endedAt !== null && target >= reference.endedAt) position = ref.at(-1) ?? null;
  const unavailable = (reason: string): GhostComparison => ({ position, gapSeconds: null, reason });
  if (!live.length || ref.length < 2) return unavailable('Venter på GPS-spor');
  if (distance(live[0], ref[0]) > 60) return unavailable('Start nær samme sted som forrige tur');
  const match = routeMatch ?? matchRoute(current, reference, now);
  if (match.deviated) return unavailable('Endret rute – totaltidene er ikke direkte sammenlignbare');
  if (match.state !== 'same') return unavailable(match.label);
  const last = live.at(-1)!;
  if (now - last.timestamp > 20_000 && current.endedAt === null) return unavailable('Venter på en fersk GPS-posisjon');
  // Reuse the ordered route match. Nearest geometry alone confuses outward and
  // return passes on the same street, suppressing otherwise valid comparisons.
  if (match.referenceTime === null) return unavailable('Venter på et tydelig spor');
  return { position, gapSeconds: ((match.referenceTime - reference.startedAt) - (last.timestamp - current.startedAt)) / 1000, reason: null };
}
export function gapLabel(seconds: number) {
  const n = Math.round(Math.abs(seconds));
  if (n < 5) return 'Helt jevnt med skyggen';
  const amount = n >= 60 ? `${Math.floor(n / 60)} min ${n % 60} sek` : `${n} sek`;
  return `${amount} ${seconds > 0 ? 'foran' : 'bak'} skyggen`;
}
export function voiceCue(comparison: GhostComparison, now: number, lastCueAt: number, enabled: boolean): string | null {
  if (!enabled || comparison.gapSeconds === null || now - lastCueAt < 60_000) return null;
  const seconds = Math.round(Math.abs(comparison.gapSeconds));
  if (seconds < 5) return 'No e du helt likt med skyggen.';
  const amount = seconds >= 60 ? `${Math.floor(seconds / 60)} minutter og ${seconds % 60} sekunder` : `${seconds} sekunder`;
  return `No e du ${amount} ${comparison.gapSeconds > 0 ? 'foran' : 'bak'} skyggen.`;
}
