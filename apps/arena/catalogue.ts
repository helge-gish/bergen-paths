import type { Coordinate } from '../../src/domain/types';
import { distance } from '../../src/domain/geo';
export type LocalGame = {
  id: string; scenarioId: string; title: string; areaName: string;
  center: Coordinate; discoveryRadius: number; status: 'prototype' | 'published';
  cooperative: boolean;
};
export const firstGame: LocalGame = {
  id: 'floeyen-01', scenarioId: 'bergen-floeyen-lanterns', title: 'Lyktene under Fløyen', areaName: 'Fløyen',
  // Approximate discovery centre only. Quest checkpoints need field validation.
  center: { latitude: 60.3943, longitude: 5.3433 }, discoveryRadius: 3000, status: 'prototype', cooperative: true,
};
export function gamesNear(games: LocalGame[], position: Coordinate | null, includePrototypes = false) {
  if (!position || !Number.isFinite(position.latitude) || Math.abs(position.latitude) > 90 || !Number.isFinite(position.longitude) || Math.abs(position.longitude) > 180) return [];
  return games.filter(g => g.status === 'published' || includePrototypes).flatMap(game => {
    if (!Number.isFinite(game.discoveryRadius) || game.discoveryRadius <= 0) return [];
    const meters = distance(position, game.center);
    return Number.isFinite(meters) && meters <= game.discoveryRadius ? [{ game, meters }] : [];
  }).sort((a, b) => a.meters - b.meters);
}
