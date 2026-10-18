import type { Trail, Trip } from './types';
import { cleanPoints } from './geo';
/** A saved segment has its own clock, including the pauses within that segment. */
export function trailReference(trail: Trail): Trip {
  const points = cleanPoints(trail.points);
  const start = points[0]?.timestamp ?? trail.createdAt;
  return { id: `trail:${trail.id}`, name: trail.name, startedAt: start, endedAt: points.at(-1)?.timestamp ?? start, points, ghostId: null, audioEnabled: false, lastCueAt: 0 };
}
