import type { Discovery, Progress } from './discoveries';

const fallbacks: Partial<Record<Discovery['kind'], string[]>> = { trail: ['Sti uten navn'], steps: ['Trapp', 'Trapp uten navn'], viewpoint: ['Utsiktspunkt', 'Utsiktspunkt uten navn'] };

/** Older saved map data has fallback titles but no explicit unnamed flag. */
export function needsDiscoveryName(item: Discovery) {
  if (item.localName?.trim()) return false;
  const names = fallbacks[item.kind];
  if (!names) return false;
  return item.unnamed ?? names.includes(item.name.trim());
}
export function groupDiscoveries(items: Discovery[]) {
  const named: Discovery[] = [], unnamed: Discovery[] = [];
  for (const item of items) (needsDiscoveryName(item) ? unnamed : named).push(item);
  return { named, unnamed };
}
export function routeProgressLabel(p: Progress) {
  const coverage = `${Math.round(p.fraction * 100)} % gått`;
  if (!p.streetCheck || p.collected || p.streetCheck.endsVisited === p.streetCheck.endsTotal) return coverage;
  return `${coverage} · ${p.streetCheck.endsVisited} av ${p.streetCheck.endsTotal} gateender bekreftet`;
}
