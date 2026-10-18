import { type Discovery, collectionProgress, kindLabels } from './discoveries';
import { type HomeArea, inArea } from './areas';
import type { Trip } from './types';
import { PEAKS } from './collections';
import { distance } from './geo';
export type Goal = { id: string; title: string; description: string; targets: Discovery[]; createdAt: number; curated?: boolean };
// Stable definition IDs, independent of labels, ordering and activation date. Future rankings must share this exact definition.
function fingerprint(value: string) { let hash = 2166136261; for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619); return (hash >>> 0).toString(16); }
export function areaGoals(area: HomeArea, items: Discovery[], now = Date.now()): Goal[] {
  return (['street', 'peak', 'viewpoint', 'hut', 'landmark', 'trail'] as const).flatMap(kind => {
    const targets = items.filter(i => i.kind === kind && inArea(i, area)).sort((a, b) => a.id.localeCompare(b.id));
    if (!targets.length) return [];
    const definition = JSON.stringify(targets.map(i => [i.id, i.latitude, i.longitude, i.streetPaths ?? i.geometry]));
    return [{ id: `area-v1-${kind}-${fingerprint(definition)}`, title: `${kindLabels[kind]} · ${area.name}`, description: `Alle ${targets.length} i dette kartutvalget · ${area.radius / 1000} km radius rundt ${area.latitude.toFixed(4)}, ${area.longitude.toFixed(4)}. Gater følges i hele det viste gateområdet.`, targets, createdAt: now }];
  });
}
export function bergenGoal(items: Discovery[], now = Date.now()): Goal | null {
  const targets = PEAKS.flatMap(peak => {
    // OSM maps the actual Fløyen summit as Fløyfjellet; keep the documented local alias and geographic check.
    const names = peak.id === 'floyen' ? [peak.name, 'Fløyfjellet'] : [peak.name];
    const target = items.find(i => i.kind === 'peak' && names.some(name => i.name.toLocaleLowerCase('nb') === name.toLocaleLowerCase('nb')) && distance(i, peak) < 1500);
    return target ? [{ ...target, name: target.name === peak.name ? peak.name : `${peak.name} (${target.name})` }] : [];
  });
  if (targets.length !== 7) return null;
  return { id: `bergen-seven-v1-${fingerprint(JSON.stringify(targets.map(i => [i.id, i.latitude, i.longitude])))}`, title: 'De syv byfjellene i Bergen', description: 'Ulriken, Fløyen, Rundemanen, Sandviksfjellet, Løvstakken, Damsgårdsfjellet og Lyderhorn. Besøk alle syv, fordelt på så mange turer du vil.', targets, createdAt: now, curated: true };
}
export function goalProgress(goal: Goal, trips: Trip[]) {
  const progress = collectionProgress(goal.targets, trips);
  const collected = goal.targets.filter(t => progress[t.id]?.collected).length;
  return { collected, total: goal.targets.length, complete: goal.targets.length > 0 && collected === goal.targets.length };
}
