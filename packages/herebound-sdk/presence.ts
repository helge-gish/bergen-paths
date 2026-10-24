import { metersBetween, validPoint } from './geo';
import type { Encounter, GamePack, PositionFix } from './types';

export const DISCOVERY_RADIUS_METERS = 5000;
export function freshPosition(fix: PositionFix | null, now: number): fix is PositionFix {
  return !!fix && validPoint(fix) && Number.isFinite(now) && Number.isFinite(fix.timestamp) && fix.timestamp <= now && now - fix.timestamp <= 30_000 &&
    Number.isFinite(fix.accuracy) && fix.accuracy >= 0 && fix.accuracy <= 50 && ['gps', 'simulation'].includes(fix.source);
}
/** Discovery is a platform rule; an individual game's entrance is separate. */
export function gamesNearby(registry: ReadonlyMap<string, GamePack>, fix: PositionFix | null, now: number): GamePack[] {
  if (!freshPosition(fix, now)) return [];
  return [...registry.values()].filter(pack => metersBetween(fix, pack.area.center) + fix.accuracy <= DISCOVERY_RADIUS_METERS)
    .sort((a, b) => metersBetween(fix, a.area.center) - metersBetween(fix, b.area.center));
}
export function canEnter(pack: GamePack, fix: PositionFix | null, now: number, started: boolean): boolean {
  if (!freshPosition(fix, now)) return false;
  const target = started ? pack.area.center : pack.start.position;
  const radius = started ? pack.area.radiusMeters : pack.start.radiusMeters;
  // Entrance is the advertised zone, not a smaller zone obtained by subtracting
  // GPS accuracy. Keep poor fixes blocked; precise world interactions stay stricter.
  return started ? metersBetween(fix, target) + fix.accuracy <= radius : fix.accuracy <= Math.min(50, radius) && metersBetween(fix, target) <= radius;
}

export function entryStatus(pack: GamePack, fix: PositionFix | null, now: number, started: boolean): { ready: boolean; text: string } {
  if (!fix || fix.source !== 'gps') return { ready:false, text:'Bruk GPS for å sjekke startsonen. Prøvemodus bruker simulert posisjon.' };
  if (!Number.isFinite(fix.accuracy) || fix.accuracy > 50) return { ready:false, text:`GPS er for usikker${Number.isFinite(fix.accuracy)?` (±${Math.round(fix.accuracy)} m)`:''}. Trenger 50 m eller bedre. Prøv med fri sikt.` };
  if (!freshPosition(fix,now)) return { ready:false, text:'Posisjonen er gammel. Trykk Start ute for å hente ny GPS.' };
  if (canEnter(pack,fix,now,started)) return { ready:true, text:started?'Du er i spillområdet. Fortsett når du vil.':'Du er i startsonen. Klar til å spille!' };
  const distance=Math.round(metersBetween(fix,started?pack.area.center:pack.start.position));
  const radius=started?pack.area.radiusMeters:pack.start.radiusMeters;
  return { ready:false, text:started?`Du er utenfor spillområdet (${distance} m fra sentrum).`:`${distance} m til startpunktet · startsonen er ${radius} m. Omtrent ${Math.max(0,distance-radius)} m igjen til sonen.` };
}

export function canMeet(encounter: Encounter, fix: PositionFix | null, now: number): boolean {
  return freshPosition(fix,now) && fix.source === 'gps' && fix.accuracy <= Math.min(30,encounter.radiusMeters) && metersBetween(fix,encounter.position) <= encounter.radiusMeters;
}
