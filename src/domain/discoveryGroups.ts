import type { Discovery, Progress } from './discoveries';

/** Older saved map data has fallback titles but no explicit unnamed flag. */
export function isUnnamedRoute(item: Discovery) {
  if (item.localName?.trim()) return false;
  if (item.kind !== 'trail' && item.kind !== 'steps') return false;
  return item.unnamed ?? (item.kind === 'trail' ? item.name === 'Sti uten navn' : ['Trapp', 'Trapp uten navn'].includes(item.name));
}
export function groupDiscoveries(items: Discovery[]) {
  const named: Discovery[] = [], unnamed: Discovery[] = [];
  for (const item of items) (isUnnamedRoute(item) ? unnamed : named).push(item);
  return { named, unnamed };
}
export function routeProgressLabel(p: Progress) {
  const coverage = `${Math.round(p.fraction * 100)} % gått`;
  if (!p.streetCheck || p.collected || p.streetCheck.endsVisited === p.streetCheck.endsTotal) return coverage;
  return `${coverage} · ${p.streetCheck.endsVisited} av ${p.streetCheck.endsTotal} gateender bekreftet`;
}
