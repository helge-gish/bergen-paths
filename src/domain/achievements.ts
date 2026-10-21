import type { Trip } from './types';
import { tripMetrics } from './metrics';
import { companionEquipment } from './companion';
export type Achievement = { id: string; title: string; value: number; target: number; unit: string; earned: boolean; xp: number };
export function achievements(trips: Trip[], collected: number) {
  const totals = trips.filter(t => t.endedAt !== null).reduce((s, t) => { const m = tripMetrics(t); return { meters: s.meters + m.meters, ascent: s.ascent + m.ascent, trips: s.trips + 1 }; }, { meters: 0, ascent: 0, trips: 0 });
  const milestones: Achievement[] = [];
  const add = (id: string, title: string, value: number, thresholds: number[], unit: string) => thresholds.forEach((target, index) => milestones.push({ id: `${id}-${target}`, title: `${title} ${target.toLocaleString('nb-NO')} ${unit}`, value, target, unit, earned: value >= target, xp: (index + 1) * 100 }));
  add('distance', 'Til fots:', totals.meters / 1000, [1, 5, 10, 25, 50, 100, 250, 500, 1000], 'km');
  add('ascent', 'Oppover:', totals.ascent, [100, 500, 1000, 2500, 5000, 10000, 25000], 'hm');
  add('discoveries', 'Samlet:', collected, [1, 5, 10, 25, 50, 100, 250, 500], 'funn');
  const xp = milestones.filter(m => m.earned).reduce((s, m) => s + m.xp, 0);
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const equipment = companionEquipment;
  return { totals, milestones, xp, level, nextXp: level * level * 100, equipment, nextEquipment: equipment.find(e => e.level > level) };
}
