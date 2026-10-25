import { requireOptionalNativeModule } from 'expo';
import { tripMetrics } from '../domain/metrics';
import { journeyContext } from '../domain/commentary';
import { workoutPlan } from '../domain/workout';
import type { Trip } from '../domain/types';
import {walkingMetrics} from '../domain/natureTiming';
const native = requireOptionalNativeModule<{ updateTripStatus(json: string | null): Promise<void> }>('TrakkCoach');
export async function syncTripStatus(trip: Trip | null) {
  if (!native) return;
  const m = trip ? tripMetrics(trip) : null;
  const walking=trip?.automatic?walkingMetrics(trip):m;
  const plan = trip?.workout ? workoutPlan(trip.workout.kind) : null;
  await native.updateTripStatus(trip && m && walking ? JSON.stringify({ id: trip.id, startedAt: trip.startedAt, meters: walking.meters, ascent: Math.round(walking.ascent), hasElevation: walking.hasElevation,
    lastGps: m.points.at(-1)?.timestamp ?? 0, workout: trip.workout, phases: plan?.phases, workoutName: plan?.name, workoutTotalMs: plan?.totalMs, commentary: journeyContext(m) }) : null);
}
