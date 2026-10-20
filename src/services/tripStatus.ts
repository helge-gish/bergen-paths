import { requireOptionalNativeModule } from 'expo';
import { tripMetrics } from '../domain/metrics';
import { journeyContext } from '../domain/commentary';
import { workoutPhases } from '../domain/workout';
import type { Trip } from '../domain/types';
const native = requireOptionalNativeModule<{ updateTripStatus(json: string | null): Promise<void> }>('TrakkCoach');
export async function syncTripStatus(trip: Trip | null) {
  if (!native) return;
  const m = trip ? tripMetrics(trip) : null;
  await native.updateTripStatus(trip && m ? JSON.stringify({ id: trip.id, startedAt: trip.startedAt, meters: m.meters, ascent: Math.round(m.ascent), hasElevation: m.hasElevation,
    lastGps: m.points.at(-1)?.timestamp ?? 0, workout: trip.workout, phases: workoutPhases, commentary: journeyContext(m) }) : null);
}
