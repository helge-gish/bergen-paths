export type Workout = {
  kind: '4x4';
  id?: string;
  startedAt?: number;
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
export type WorkoutCue = { at: number; text: string; transition?: boolean };
export const workoutCues: WorkoutCue[] = workoutPhases.flatMap(p => {
  const opening = p.kind === 'warmup' ? 'Velkommen ut i løypa! No starter vi fire ganger fire. Fem minutter rolig oppvarming. Finn rytmen, dette blir en fin økt!'
    : p.kind === 'fast' ? `Runde ${p.round} av fire. Og der går starten! Fire minutter rask gange! Finn flyten, og tilpass tempoet til terrenget.`
    : p.kind === 'easy' ? 'Der er draget i boks! Tre minutter rolig gange. Senk tempoet, hent deg inn, så er vi klare til neste start!'
    : 'Fire av fire drag i boks! For en gjennomført økt. No venter fem minutter rolig nedtrapping.';
  const offsets = p.kind === 'fast' ? [60, 120, 180, 230] : [p.seconds / 2, p.seconds - 60, p.seconds - 10];
  return [{ at: p.start * 1000, text: opening, transition: true }, ...offsets.map((offset, i) => {
    const left = p.seconds - offset;
    const remaining = left === 10 ? 'Ti sekunder' : left === 90 ? 'Ett og et halvt minutt' : left === 150 ? 'To og et halvt minutt' : left === 60 ? 'Ett minutt' : `${left / 60} minutter`;
    const next = p.kind === 'fast' ? 'rolig gange' : p.kind === 'cooldown' ? 'økten er ferdig' : 'rask gange';
    const motivation = p.kind === 'fast' && left > 10 ? ['Der ja! Hold en rytme som passer deg.', 'Halvveis i draget! Vi teller ned og følger deg hele veien.', 'Siste minuttet! Finn flyten, men husk fotfestet.'][i] + ' ' : '';
    return { at: (p.start + offset) * 1000, text: `${motivation}${remaining} igjen til ${next}.` };
  })];
}).concat([{ at: WORKOUT_MS, text: 'Og der er fire ganger fire fullført! Alle fire drag og nedtrappingen i boks. Skikkelig godt jobbet! Turen registreres videre, og no bestemmer du tempoet selv.', transition: true }]);
export const countdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
