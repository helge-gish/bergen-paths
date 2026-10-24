import { distance } from '../../src/domain/geo';
import type { Coordinate } from '../../src/domain/types';
import type { GameArea } from './manifest';

// Peakbook Fløyvarden: UTM 32V 298560 6701387, converted from EPSG:32632
// to WGS84. This establishes the universe centre, not approved encounter sites.
// https://peakbook.org/no/peakbook-element/78551/no/Fl%C3%B8yvarden.html
export const FLOEYVARDEN_AREA: GameArea = {
  center: { latitude: 60.39852082424811, longitude: 5.343193886616334 },
  radiusMeters: 5000,
};

export type RegionFix = Coordinate & { accuracy: number; timestamp: number };
export type RegionPresence = { state: 'inside' | 'outside' | 'uncertain'; meters: number | null };

/** Pure prototype presence check. The app/server must supply fixes and handle
 * consent, persistence and transitions. It neither starts GPS nor awards loot.
 * Near the boundary, uncertainty must not repeatedly enter/exit the game. */
export function floeyenPresence(fix: RegionFix | null, now: number): RegionPresence {
  if (!fix || !Number.isFinite(now) || !Number.isFinite(fix.latitude) || Math.abs(fix.latitude) > 90 ||
      !Number.isFinite(fix.longitude) || Math.abs(fix.longitude) > 180 ||
      !Number.isFinite(fix.timestamp) || fix.timestamp > now || now - fix.timestamp > 30_000 ||
      !Number.isFinite(fix.accuracy) || fix.accuracy < 0 || fix.accuracy > 50) {
    return { state: 'uncertain', meters: null };
  }
  const meters = distance(fix, FLOEYVARDEN_AREA.center);
  if (meters + fix.accuracy <= FLOEYVARDEN_AREA.radiusMeters) return { state: 'inside', meters };
  if (meters - fix.accuracy > FLOEYVARDEN_AREA.radiusMeters) return { state: 'outside', meters };
  return { state: 'uncertain', meters };
}
