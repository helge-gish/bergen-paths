import type { Discovery } from './discoveries';
import type { Trail } from './types';
import { cleanPoints, distance, segments } from './geo';
import { elevation } from './metrics';

// Preserve the source scale; SAC T1–T6 is not the Norwegian colour grading.
export const sacGrades = ['hiking', 'mountain_hiking', 'demanding_mountain_hiking', 'alpine_hiking', 'demanding_alpine_hiking', 'difficult_alpine_hiking'] as const;
const gradeNames = ['T1 · Fottur', 'T2 · Fjelltur', 'T3 · Krevende fjelltur', 'T4 · Alpin tur', 'T5 · Krevende alpin tur', 'T6 · Svært krevende alpin tur'];
export type TrailFacts = { length: number; ascent: number | null; descent: number | null; grade: string | null; partialGrade: boolean; saved: boolean; hasGaps: boolean };
export function trailFacts(members: Discovery[], saved?: Trail): TrailFacts {
  const points = saved ? cleanPoints(saved.points) : [];
  const paths = saved ? segments(points) : members.flatMap(item => item.streetPaths ?? [item.geometry]);
  let length = 0;
  const seen = new Set<string>();
  for (const path of paths) for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const key = [JSON.stringify(a), JSON.stringify(b)].sort().join('|');
    // Shared mapped edges count once; saved walks may deliberately double back.
    if (!saved && seen.has(key)) continue;
    seen.add(key);
    const d = distance(a, b); if (Number.isFinite(d)) length += d;
  }
  const measured = saved ? elevation(points) : null;
  const validHeightCount = points.filter(p => p.altitude !== null && Number.isFinite(p.altitude) && p.altitudeAccuracy !== null && p.altitudeAccuracy >= 0 && p.altitudeAccuracy <= 15).length;
  const completeHeights = !!measured?.hasElevation && validHeightCount >= points.length * .9;
  const grades = members.map(item => sacGrades.indexOf(item.sacScale as typeof sacGrades[number]));
  const highest = grades.length ? Math.max(...grades) : -1;
  return { length, ascent: completeHeights ? measured!.ascent : null, descent: completeHeights ? measured!.descent : null, grade: highest >= 0 ? gradeNames[highest] : null, partialGrade: highest >= 0 && grades.some(g => g < 0), saved: !!saved, hasGaps: !!saved && paths.length > 1 };
}
