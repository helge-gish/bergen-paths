export type Workout = {
  kind: '4x4';
  elapsedMs: number;
  runningSince: number | null;
  endedAt: number | null;
  audioEnabled: boolean;
};
export type WorkoutPhase = { kind: 'warmup' | 'fast' | 'easy' | 'cooldown'; label: string; round: number; start: number; seconds: number };
export const workoutPhases: WorkoutPhase[] = [];
function phase(kind: WorkoutPhase['kind'], label: string, seconds: number, round = 0) {
  const previous = workoutPhases.at(-1);
  workoutPhases.push({ kind, label, seconds, round, start: previous ? previous.start + previous.seconds : 0 });
}
phase('warmup', 'Oppvarming · rolig gange', 300);
for (let round = 1; round <= 4; round++) {
  phase('fast', `Rask gange · runde ${round} av 4`, 240, round);
  if (round < 4) phase('easy', 'Rolig gange · hent deg inn', 180, round);
}
phase('cooldown', 'Nedtrapping · rolig gange', 300);
export const WORKOUT_MS = 35 * 60_000;
export const createWorkout = (now: number, audioEnabled: boolean): Workout => ({ kind: '4x4', elapsedMs: 0, runningSince: now, endedAt: null, audioEnabled });
export function workoutElapsed(workout: Workout, now: number): number {
  return Math.min(WORKOUT_MS, Math.max(0, workout.elapsedMs + (workout.runningSince === null ? 0 : Math.max(0, now - workout.runningSince))));
}
export function workoutStatus(workout: Workout, now: number) {
  const elapsed = workoutElapsed(workout, now), seconds = elapsed / 1000;
  const index = workoutPhases.findIndex(p => seconds < p.start + p.seconds);
  const current = workoutPhases[index] ?? null;
  return { elapsed, current, next: workoutPhases[index + 1] ?? null, remaining: current ? Math.ceil(current.start + current.seconds - seconds) : 0,
    rounds: workoutPhases.filter(p => p.kind === 'fast' && seconds >= p.start + p.seconds).length,
    complete: elapsed >= WORKOUT_MS, paused: workout.runningSince === null && workout.endedAt === null && elapsed < WORKOUT_MS };
}
export function changeWorkout(workout: Workout, action: 'pause' | 'resume' | 'stop', now: number): Workout {
  if (workout.endedAt !== null) return workout;
  const elapsedMs = workoutElapsed(workout, now);
  return { ...workout, elapsedMs, runningSince: action === 'resume' && elapsedMs < WORKOUT_MS ? now : null, endedAt: action === 'stop' ? now : null };
}
export type WorkoutCue = { at: number; text: string };
export const workoutCues: WorkoutCue[] = workoutPhases.flatMap(p => {
  const opening = p.kind === 'warmup' ? 'No starter vi fire ganger fire. Gå rolig i fem minutter og bli varm.'
    : p.kind === 'fast' ? `Runde ${p.round} av fire. No går vi raskt i fire minutter! Finn et tempo som passer deg og underlaget.`
    : p.kind === 'easy' ? 'Godt jobbet! Gå rolig i tre minutter og hent deg inn før neste runde.'
    : 'Alle fire drag er ferdige! No trapper vi ned med fem minutter rolig gange.';
  const offsets = p.kind === 'fast' ? [60, 120, 180, 230] : [p.seconds / 2, p.seconds - 60, p.seconds - 10];
  return [{ at: p.start * 1000, text: opening }, ...offsets.map((offset, i) => {
    const left = p.seconds - offset;
    const remaining = left === 10 ? 'Ti sekunder' : left === 90 ? 'Ett og et halvt minutt' : left === 150 ? 'To og et halvt minutt' : left === 60 ? 'Ett minutt' : `${left / 60} minutter`;
    const next = p.kind === 'fast' ? 'rolig gange' : p.kind === 'cooldown' ? 'økten er ferdig' : 'rask gange';
    const motivation = p.kind === 'fast' && left > 10 ? ['Flott innsats! Hold en god rytme.', 'Halvveis i draget! Dette går fint.', 'Siste minuttet. Godt jobbet!'][i] + ' ' : '';
    return { at: (p.start + offset) * 1000, text: `${motivation}${remaining} igjen til ${next}.` };
  })];
}).concat([{ at: WORKOUT_MS, text: 'Der var fire ganger fire fullført! Skikkelig godt jobbet. Turen registreres videre, og no bestemmer du tempoet selv.' }]);
export const countdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
