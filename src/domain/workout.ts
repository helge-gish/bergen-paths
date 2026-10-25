export type WorkoutKind = '4x4' | 'interval-walk' | 'walk-jog' | 'minute-intervals' | 'pyramid';
export type Workout = {
  kind: WorkoutKind;
  id?: string;
  startedAt?: number;
  completedAt?: number;
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
export const createWorkout = (now: number, audioEnabled: boolean, kind: WorkoutKind = '4x4'): Workout => ({ kind, startedAt: now, elapsedMs: 0, runningSince: now, endedAt: null, audioEnabled });
export function workoutElapsed(workout: Workout, now: number): number {
  return Math.min(workoutPlan(workout.kind).totalMs, Math.max(0, workout.elapsedMs + (workout.runningSince === null ? 0 : Math.max(0, now - workout.runningSince))));
}
export function workoutStatus(workout: Workout, now: number) {
  const plan = workoutPlan(workout.kind), phases = plan.phases;
  const elapsed = workoutElapsed(workout, now), seconds = elapsed / 1000;
  const index = phases.findIndex(p => seconds < p.start + p.seconds);
  const current = phases[index] ?? null;
  return { elapsed, current, next: current ? phases[index + 1] ?? null : null, remaining: current ? Math.ceil(current.start + current.seconds - seconds) : 0,
    totalRounds: plan.rounds, totalMs: plan.totalMs, rounds: phases.filter(p => p.kind === 'fast' && seconds >= p.start + p.seconds).length,
    complete: elapsed >= plan.totalMs, paused: workout.runningSince === null && workout.endedAt === null && elapsed < plan.totalMs };
}
export function changeWorkout(workout: Workout, action: 'pause' | 'resume' | 'stop', now: number): Workout {
  if (workout.endedAt !== null) return workout;
  const elapsedMs = workoutElapsed(workout, now);
  const completedAt = workoutCompletedAt(workout, now);
  return { ...workout, ...(completedAt !== null ? {completedAt} : {}), elapsedMs, runningSince: action === 'resume' && elapsedMs < workoutPlan(workout.kind).totalMs ? now : null, endedAt: action === 'stop' ? now : null };
}
/** Preserve the actual finish time even if the tour ends much later. */
export function workoutCompletedAt(workout: Workout, now: number): number | null {
  const total = workoutPlan(workout.kind).totalMs;
  if (workoutElapsed(workout, now) < total) return null;
  if (workout.completedAt !== undefined) return workout.completedAt;
  return workout.runningSince !== null ? workout.runningSince + Math.max(0, total - workout.elapsedMs) : workout.endedAt;
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


export type WorkoutPlan = { kind: WorkoutKind; name: string; description: string; shortDescription: string; phases: WorkoutPhase[]; cues: WorkoutCue[]; totalMs: number; rounds: number };
function intervalPlan(kind: WorkoutKind, name: string, description: string, stages: Omit<WorkoutPhase, 'start'>[]): WorkoutPlan {
  let start = 0;
  const phases = stages.map(p => { const result = { ...p, start }; start += p.seconds; return result; });
  const totalMs = start * 1000;
  const cues: WorkoutCue[] = phases.flatMap((p, i) => {
    const next = phases[i + 1];
    const opening = `${i === 0 ? `Vi er i gang med ${name}! ` : ''}${p.label}. ${p.seconds / 60} ${p.seconds === 60 ? 'minutt' : 'minutter'}. ${p.kind === 'fast' ? 'Finn en innsats som passer deg og terrenget!' : 'Senk tempoet og finn en god rytme.'}`;
    return [
      { at: p.start * 1000, text: opening, transition: true },
      ...(p.kind === 'fast' && p.seconds >= 180 ? [{ at: (p.start + p.seconds / 2) * 1000, text: 'Halvveis i draget! Godt jobbet, hold din egen rytme.' }] : []),
      { at: (p.start + p.seconds - 10) * 1000, text: next ? `Ti sekunder igjen. Så blir det ${next.label.toLocaleLowerCase('nb-NO')}.` : 'Ti sekunder igjen, så er økten fullført!' },
    ];
  });
  cues.push({ at: totalMs, text: `${name} er fullført! Skikkelig godt jobbet! Registreringen fortsetter, og du bestemmer tempoet selv.`, transition: true });
  return { kind, name, description, shortDescription: description, phases, cues, totalMs, rounds: phases.filter(p => p.kind === 'fast').length };
}
export const workoutPlans: WorkoutPlan[] = [
  { kind: '4x4', name: '4×4', shortDescription: '4 min raskt / 3 min rolig · 4 drag', description: '35 min · 5 min oppvarming, fire drag på 4 min rask gange med 3 min rolig mellom, 5 min nedtrapping.', phases: workoutPhases, cues: workoutCues, totalMs: WORKOUT_MS, rounds: 4 },
  intervalPlan('interval-walk', 'Japansk intervallgange', '30 min · 3 min rolig og 3 min rask gange, fem ganger. Raskt betyr din egen innsats, ikke en bestemt fart.', Array.from({ length: 5 }, (_, i) => [
    { kind: 'easy' as const, label: 'Rolig gange', seconds: 180, round: i + 1 },
    { kind: 'fast' as const, label: `Rask gange · runde ${i + 1} av 5`, seconds: 180, round: i + 1 },
  ]).flat()),
  intervalPlan('walk-jog', 'Gå/jogg', '25 min · 5 min oppvarming, seks runder med 1 min lett jogg og 2 min gange, 2 min nedtrapping.', [
    { kind: 'warmup', label: 'Oppvarming · rolig gange', seconds: 300, round: 0 },
    ...Array.from({ length: 6 }, (_, i) => [
      { kind: 'fast' as const, label: `Lett jogg · runde ${i + 1} av 6`, seconds: 60, round: i + 1 },
      { kind: 'easy' as const, label: 'Rolig gange', seconds: 120, round: i + 1 },
    ]).flat(),
    { kind: 'cooldown', label: 'Nedtrapping · rolig gange', seconds: 120, round: 0 },
  ]),
  intervalPlan('minute-intervals', 'Minuttintervaller', '30 min · 5 min oppvarming, ti runder med 1 min rask gange eller jogg og 1 min rolig, 5 min nedtrapping.', [
    { kind: 'warmup', label: 'Oppvarming · rolig gange', seconds: 300, round: 0 },
    ...Array.from({ length: 10 }, (_, i) => [
      { kind: 'fast' as const, label: `Rask gange eller jogg · runde ${i + 1} av 10`, seconds: 60, round: i + 1 },
      { kind: 'easy' as const, label: 'Rolig gange', seconds: 60, round: i + 1 },
    ]).flat(),
    { kind: 'cooldown', label: 'Nedtrapping · rolig gange', seconds: 300, round: 0 },
  ]),
  intervalPlan('pyramid', 'Pyramide', '23 min · 5 min oppvarming, drag på 1–2–3–2–1 min med 1 min rolig mellom, 5 min nedtrapping. Gå raskt eller jogg.', [
    { kind: 'warmup', label: 'Oppvarming · rolig gange', seconds: 300, round: 0 },
    ...[1, 2, 3, 2, 1].flatMap((minutes, i) => [
      { kind: 'fast' as const, label: `Rask gange eller jogg · drag ${i + 1} av 5`, seconds: minutes * 60, round: i + 1 },
      ...(i < 4 ? [{ kind: 'easy' as const, label: 'Rolig gange', seconds: 60, round: i + 1 }] : []),
    ]),
    { kind: 'cooldown', label: 'Nedtrapping · rolig gange', seconds: 300, round: 0 },
  ]),
];
const compactDescriptions: Partial<Record<WorkoutKind,string>> = {
  'interval-walk': '3 min rolig / 3 min raskt · 5 runder',
  'walk-jog': '1 min lett jogg / 2 min gange · 6 runder',
  'minute-intervals': '1 min raskt / 1 min rolig · 10 runder',
  pyramid: '1–2–3–2–1 min raskt · 1 min rolig mellom',
};
for (const plan of workoutPlans) plan.shortDescription = compactDescriptions[plan.kind] ?? plan.shortDescription;
export function workoutPlan(kind: WorkoutKind): WorkoutPlan { return workoutPlans.find(p => p.kind === kind) ?? workoutPlans[0]; }
