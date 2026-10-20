import { requireOptionalNativeModule } from 'expo';
import { getStore } from '../data/native';
import { WORKOUT_MS, workoutCues, workoutPhases } from '../domain/workout';
import type { Trip } from '../domain/types';
const native = requireOptionalNativeModule<{ configure(json: string | null): Promise<void>; busy(): boolean; offer(text: string, kind: string): Promise<boolean>; error(): string | null }>('TrakkCoach');
export const workoutAvailable = !!native;
let configured: string | null | undefined;
let sequence = Promise.resolve();
export function syncWorkoutCoach(trip: Trip | null): Promise<void> {
  if (!native) return Promise.resolve();
  const w = trip?.workout;
  const json = trip && trip.endedAt === null && w && w.endedAt === null
    ? JSON.stringify({ id: trip.id, elapsedMs: w.elapsedMs, runningSince: w.runningSince, running: w.runningSince !== null, audio: w.audioEnabled, routeAudio: trip.audioEnabled, routeKey: trip.ghostId,
      dialect: getStore().setting('localDialect', 'neutral'), vibrate: true, totalMs: WORKOUT_MS, phases: workoutPhases, cues: workoutCues }) : null;
  if (json === configured) return sequence;
  configured = json;
  sequence = sequence.catch(() => {}).then(() => native.configure(json)).catch(e => { configured = undefined; throw e; });
  return sequence;
}
export function workoutVoiceBusy() { return native?.busy() ?? false; }
export function workoutVoiceError() { return native?.error() ?? null; }

export async function offerWorkoutVoice(text: string, kind: 'ghost' | 'event') { await sequence.catch(() => {}); return native ? native.offer(text, kind) : false; }
