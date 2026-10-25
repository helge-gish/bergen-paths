import type { Trip } from './types';
import { workoutCompletedAt, workoutPlan, workoutStatus, type WorkoutKind } from './workout';

export type WorkoutLogEntry = {
  id: string; tripId: string; kind: WorkoutKind; name: string;
  timestamp: number; startedAt: number; elapsed: number;
  complete: boolean; rounds: number; totalRounds: number;
};
export function workoutLog(trips: Trip[], now: number): WorkoutLogEntry[] {
  const entries: WorkoutLogEntry[] = [];
  for (const trip of trips) {
    const seen = new Set<string>();
    for (const [index, workout] of [...(trip.workoutHistory ?? []), ...(trip.workout ? [trip.workout] : [])].entries()) {
      const key = workout.id ?? `legacy:${index}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const end = Math.min(now, workout.endedAt ?? trip.endedAt ?? now);
      const status = workoutStatus(workout, end);
      if (!status.complete && workout.endedAt === null && trip.endedAt === null) continue;
      entries.push({ id: `${trip.id}:workout:${key}`, tripId: trip.id, kind: workout.kind, name: workoutPlan(workout.kind).name,
        startedAt: workout.startedAt ?? trip.startedAt,
        timestamp: (status.complete ? workoutCompletedAt(workout, end) : null) ?? workout.endedAt ?? trip.endedAt ?? end,
        elapsed: status.elapsed, complete: status.complete, rounds: status.rounds, totalRounds: status.totalRounds });
    }
  }
  return entries.sort((a, b) => b.timestamp - a.timestamp);
}
