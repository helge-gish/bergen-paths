import { walkingMetrics } from './natureTiming';
import type { TrailActivity } from './trailActivity';
import type { Trip } from './types';

export type MedalColor = 'gold' | 'silver' | 'bronze';
export type TourCategory = 'trails' | 'stretches' | 'meters' | 'ascent' | 'moving';
export type TourTotals = Record<TourCategory, number> & { hasElevation: boolean; elapsed: number };
export type Passage = Pick<TrailActivity, 'id' | 'itemId' | 'referenceId' | 'source' | 'direction' | 'name' | 'timestamp'> & { seconds: number };
export type TourMedal = {
  id: string; color: MedalColor; category: TourCategory | 'trail-time' | 'stretch-time';
  value: number; first: boolean; previousBest: number | null;
  name?: string; eventId?: string; direction?: Passage['direction'];
};
export type TourResult = { version: 1; tripId: string; endedAt: number; totals: TourTotals; passages: Passage[]; medals: TourMedal[] };
export const categoryNames: Record<TourCategory, string> = {
  trails: 'Stier gått', stretches: 'Strekk gått', meters: 'Distanse', ascent: 'Høydemeter opp', moving: 'Tid i bevegelse',
};
export const medalNames: Record<MedalColor, string> = { gold: 'Gull', silver: 'Sølv', bronze: 'Bronse' };
const colors: MedalColor[] = ['gold', 'silver', 'bronze'];

/** Rank distinct positive results at the time they were earned. Ties are not
 * new achievements. Round to visible units so sub-second GPS noise is no PB. */
function rank(value: number, previous: number[], lower: boolean) {
  if (!Number.isFinite(value) || value <= 0) return null;
  const valid = [...new Set(previous.filter(n => Number.isFinite(n) && n > 0))];
  if (valid.includes(value)) return null;
  const place = valid.filter(n => lower ? n < value : n > value).length;
  if (place >= 3) return null;
  return { color: colors[place], first: !valid.length, previousBest: valid.length ? (lower ? Math.min(...valid) : Math.max(...valid)) : null };
}

export function tourResult(trip: Trip, events: TrailActivity[], history: TourResult[]): TourResult | null {
  if (trip.endedAt === null) return null;
  const m = walkingMetrics(trip);
  const done = [...new Map(events.filter(e => e.tripId === trip.id && e.status === 'completed' &&
    e.startedAt >= trip.startedAt && e.timestamp <= trip.endedAt! && Number.isFinite(e.seconds) && e.seconds! > 0)
    .map(e => [e.id, e])).values()];
  const totals: TourTotals = {
    trails: new Set(done.filter(e => e.source === 'nature').map(e => e.itemId)).size,
    stretches: new Set(done.filter(e => e.source === 'personal').map(e => e.itemId)).size,
    meters: Math.round(m.meters / 10) * 10, ascent: Math.round(m.ascent), moving: Math.floor(m.moving / 1000) * 1000,
    hasElevation: m.hasElevation, elapsed: Math.max(0, trip.endedAt - trip.startedAt),
  };
  const prior = history.filter(h => h.tripId !== trip.id && h.endedAt <= trip.startedAt);
  const medals: TourMedal[] = [];
  for (const category of Object.keys(categoryNames) as TourCategory[]) {
    if (category === 'ascent' && !totals.hasElevation) continue;
    const award = rank(totals[category], prior.map(h => h.totals[category]), false);
    if (award) medals.push({ id: category, category, value: totals[category], ...award });
  }
  const passages: Passage[] = done.map(e => ({ id: e.id, itemId: e.itemId, referenceId: e.referenceId,
    source: e.source, direction: e.direction, name: e.name, timestamp: e.timestamp, seconds: Math.round(e.seconds!) }));
  // One time medal per geometry/direction per tour: its fastest passage. The
  // reference ID includes the geometry hash, so changed routes start anew.
  const best = new Map<string, Passage>();
  for (const p of passages) if (p.seconds > 0 && (!best.has(p.referenceId) || best.get(p.referenceId)!.seconds > p.seconds)) best.set(p.referenceId, p);
  for (const p of best.values()) {
    const award = rank(p.seconds, prior.flatMap(h => h.passages.filter(old => old.referenceId === p.referenceId).map(old => old.seconds)), true);
    if (award) medals.push({ id: p.referenceId, category: p.source === 'nature' ? 'trail-time' : 'stretch-time', value: p.seconds,
      name: p.name, eventId: p.id, direction: p.direction, ...award });
  }
  return { version: 1, tripId: trip.id, endedAt: trip.endedAt, totals, passages, medals };
}

export function medalCounts(medals: TourMedal[]) {
  return medals.reduce((sum, m) => { sum[m.color]++; return sum; }, { gold: 0, silver: 0, bronze: 0 });
}
