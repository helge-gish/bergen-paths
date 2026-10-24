import { distance } from '../../src/domain/geo';
import type { Coordinate } from '../../src/domain/types';
export const MAX_GAME_RADIUS_METERS = 5000;
export type GameArea = { center: Coordinate; radiusMeters: number };
export type GameManifest = { id: string; formatVersion: 1; creatorId: string; kind: 'roleplaying' | 'mystery' | 'cooperative-hunt'; area: GameArea; encounters: { id: string; area: GameArea }[] };
const coordinate = (v: unknown): v is Coordinate => !!v && typeof v === 'object' && Number.isFinite((v as Coordinate).latitude) && Math.abs((v as Coordinate).latitude) <= 90 && Number.isFinite((v as Coordinate).longitude) && Math.abs((v as Coordinate).longitude) <= 180;
const areaValid = (a: unknown): a is GameArea => !!a && typeof a === 'object' && coordinate((a as GameArea).center) && Number.isFinite((a as GameArea).radiusMeters) && (a as GameArea).radiusMeters > 0 && (a as GameArea).radiusMeters <= MAX_GAME_RADIUS_METERS;
const idValid = (s: unknown): s is string => typeof s === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/i.test(s);
/** Validate untrusted creator data before accepting a package. This validates
 * geometry, not real-world access, GPS authenticity or permission to publish. */
export function validateGameManifest(value: unknown): value is GameManifest {
  if (!value || typeof value !== 'object') return false;
  const v = value as GameManifest;
  if (!idValid(v.id) || !idValid(v.creatorId) || v.formatVersion !== 1 || !['roleplaying', 'mystery', 'cooperative-hunt'].includes(v.kind) || !areaValid(v.area) || !Array.isArray(v.encounters) || v.encounters.length > 200) return false;
  const ids = new Set<string>();
  for (const encounter of v.encounters) {
    if (!encounter || !idValid(encounter.id) || ids.has(encounter.id) || !areaValid(encounter.area)) return false;
    if (distance(v.area.center, encounter.area.center) + encounter.area.radiusMeters > v.area.radiusMeters) return false;
    ids.add(encounter.id);
  }
  return true;
}
