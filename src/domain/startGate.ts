import { cleanPoints, distance, validFix } from './geo';
import type { Fix, Trip } from './types';
export function startGate(reference: Trip, fix: Fix | null, now: number) {
  const start = cleanPoints(reference.points)[0];
  const meters = start && fix ? distance(start, fix) : null;
  const fresh = !!fix && validFix(fix) && fix.accuracy <= 20 && now - fix.timestamp <= 15000 && fix.timestamp <= now + 2000;
  return { start, meters, ready: !!start && fresh && meters !== null && meters <= 25,
    message: !start ? 'Dette sporet mangler et startpunkt.' : !fresh ? 'Venter på en fersk, nøyaktig GPS-posisjon …' : meters! <= 25 ? 'Du er ved start. Klar når du er!' : `Gå til START på kartet · ${Math.round(meters!)} m i luftlinje` };
}
