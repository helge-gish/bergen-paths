import type { Coordinate } from '../../src/domain/types';
import { distance } from '../../src/domain/geo';
import { FLOEYVARDEN_AREA } from './region';
export type LocalGame = {
  id: string; scenarioId: string; title: string; areaName: string;
  center: Coordinate; discoveryRadius: number; status: 'prototype' | 'published';
  cooperative: boolean;
};
export const firstGame: LocalGame = {
  id: 'floeyen-01', scenarioId: 'bergen-floeyen-lanterns', title: 'ULTIMA X', areaName: 'Fløyvarden',
  // The player selects a game in the platform catalogue. Presence inside this
  // area enables that selected world; individual discoveries remain separate.
  // Still a prototype, with encounter locations awaiting validation.
  center: FLOEYVARDEN_AREA.center, discoveryRadius: FLOEYVARDEN_AREA.radiusMeters, status: 'prototype', cooperative: true,
};
export function gamesNear(games: LocalGame[], position: Coordinate | null, includePrototypes = false) {
  if (!position || !Number.isFinite(position.latitude) || Math.abs(position.latitude) > 90 || !Number.isFinite(position.longitude) || Math.abs(position.longitude) > 180) return [];
  return games.filter(g => g.status === 'published' || includePrototypes).flatMap(game => {
    if (!Number.isFinite(game.discoveryRadius) || game.discoveryRadius <= 0) return [];
    const meters = distance(position, game.center);
    return Number.isFinite(meters) && meters <= game.discoveryRadius ? [{ game, meters }] : [];
  }).sort((a, b) => a.meters - b.meters);
}
