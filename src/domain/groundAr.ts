import type { Fix } from './types';
import { cameraHeadingFresh, cameraPositionReady, type CameraHeading, type NearbyTrail } from './trailFinder';
export type GroundGuide = { id: string; bearing: number; heading: number; validUntil: number };
export type GroundState = { state: 'searching' | 'tracking' | 'surface' | 'anchored' | 'unavailable' | 'install'; reason: string; ready: boolean; targetId?: string | null };

// Ground anchors stabilize a local direction arrow. They do not locate the trail
// geographically. Native code enforces this deadline even if JS stops updating.
export function groundGuide(target: NearbyTrail | null | undefined, heading: CameraHeading | null, position: Fix | null, now: number): GroundGuide | null {
  if (!target || !cameraHeadingFresh(heading, now) || !heading.reliable || !cameraPositionReady(position, now)
    || !Number.isFinite(target.bearing) || !Number.isFinite(target.meters) || target.meters < Math.max(8, position.accuracy)
    || Math.abs(heading.pitch) > 75) return null;
  return { id: target.id, bearing: target.bearing, heading: heading.bearing, validUntil: Math.min(heading.timestamp + 2500, position.timestamp + 30000) };
}
