import { distance } from './geo';
import { freshPosition } from './position';
import type { Fix } from './types';
export const IDLE_PAUSE_MS = 10 * 60_000;
export type IdleEvidence = { anchor: Fix; since: number; lastSeen: number; samples: number };
/** Require sustained good stationary fixes. A GPS outage, old replayed samples,
 * walking speed or movement outside the anchor restarts the observation period. */
export function idleEvidence(previous: IdleEvidence | null, point: Fix, now: number): IdleEvidence | null {
  if (!freshPosition(point, now) || point.accuracy > 30) return null;
  if (previous && point.timestamp <= previous.lastSeen) return previous;
  const restart = { anchor: point, since: point.timestamp, lastSeen: point.timestamp, samples: 1 };
  if (!previous || point.timestamp - previous.lastSeen > 60000 || (point.speed !== null && point.speed > .7) || distance(previous.anchor, point) > 30) return restart;
  return { ...previous, lastSeen: point.timestamp, samples: previous.samples + 1 };
}
export function shouldPauseIdle(evidence: IdleEvidence | null): boolean {
  return !!evidence && evidence.samples >= 20 && evidence.lastSeen - evidence.since >= IDLE_PAUSE_MS;
}
