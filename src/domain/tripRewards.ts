import { achievements } from './achievements';
import type { Discovery, Progress } from './discoveries';
import type { Trip } from './types';

/** Attribute awards to the walk that completed them, never to the data-download date. */
export function tripRewards(trip: Trip, trips: Trip[], items: Discovery[], progress: Record<string, Progress>) {
  const ordered = trips.filter(t => t.endedAt !== null).sort((a, b) => a.startedAt - b.startedAt || a.id.localeCompare(b.id));
  const index = ordered.findIndex(t => t.id === trip.id);
  const before = index < 0 ? [] : ordered.slice(0, index);
  const through = index < 0 ? [] : ordered.slice(0, index + 1);
  const beforeIds = new Set(before.map(t => t.id)), throughIds = new Set(through.map(t => t.id));
  const collectedBefore = items.filter(i => progress[i.id]?.collected && beforeIds.has(progress[i.id].earnedTripId ?? '')).length;
  const collectedAfter = items.filter(i => progress[i.id]?.collected && throughIds.has(progress[i.id].earnedTripId ?? '')).length;
  const earlier = achievements(before, collectedBefore), current = achievements(through, collectedAfter);
  return {
    newFinds: items.filter(i => progress[i.id]?.collected && progress[i.id].earnedTripId === trip.id),
    milestones: current.milestones.filter(m => m.earned && !earlier.milestones.find(p => p.id === m.id)?.earned),
    xp: current.xp - earlier.xp,
    levelBefore: earlier.level, levelAfter: current.level,
    beforeIds, throughIds,
  };
}
