import type { Discovery } from '../../src/domain/discoveries';
import { parseStreets } from '../../src/domain/streets';
/** Build a season's immutable street catalogue on the server. Remove steps
 * before grouping: mixed same-name stairs must not become part of a street. */
export function gatekampenCatalogue(data: { elements: any[] }, fetchedAt: number, scope: string): Discovery[] {
  const roads = new Set(['residential', 'living_street', 'pedestrian', 'unclassified', 'service', 'tertiary', 'secondary', 'primary']);
  return parseStreets({ elements: data.elements.filter(e => roads.has(e.tags?.highway)) }, fetchedAt, scope).filter(i => i.kind === 'street');
}
export type VerifiedCompletion = { playerId: string; streetId: string; completedAt: number; evidenceId: string };
export type Season = { id: string; startsAt: number; endsAt: number; streetIds: string[]; playerIds: string[] };
/** Input is verified server evidence, never an accepted client point score.
 * One street per player per season; repeat uploads cannot multiply points. */
export function seasonScores(season: Season, completions: VerifiedCompletion[]) {
  if (!Number.isFinite(season.startsAt) || !Number.isFinite(season.endsAt) || season.endsAt <= season.startsAt) throw new Error('Ugyldig sesong');
  const streets = new Set(season.streetIds), players = new Map(season.playerIds.map(id => [id, new Set<string>()]));
  for (const c of completions) if (Number.isFinite(c.completedAt) && c.completedAt >= season.startsAt && c.completedAt < season.endsAt && c.evidenceId && streets.has(c.streetId)) players.get(c.playerId)?.add(c.streetId);
  return [...players].map(([playerId, walked]) => ({ playerId, streets: walked.size, total: streets.size })).sort((a, b) => b.streets - a.streets || a.playerId.localeCompare(b.playerId));
}
