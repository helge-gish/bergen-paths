import { kindLabels, type Discovery, type Progress } from './discoveries';
import { needsDiscoveryName, routeProgressLabel } from './discoveryGroups';

export type DiscoveryRow = { id: string; item: Discovery; members: Discovery[] };
const route = (item: Discovery) => ['trail', 'steps', 'street'].includes(item.kind);
const paths = (item: Discovery) => item.streetPaths ?? [item.geometry];

/**
 * One display row per connected, named route, including path/stair transitions.
 * OSM ways share junction coordinates. Names alone must never merge distant
 * places, point landmarks, unnamed routes or independently named personal finds.
 * Source objects, progress and saved IDs remain untouched.
 */
export function discoveryRows(items: Discovery[]): DiscoveryRow[] {
  const unique = [...new Map(items.map(item => [item.id, item])).values()];
  const parents = unique.map((_, i) => i);
  function root(i: number): number {
    while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i]; }
    return i;
  }
  const junctions = new Map<string, number>();
  unique.forEach((item, i) => {
    if (!route(item) || item.routeUnit || needsDiscoveryName(item) || item.localName || !item.name.trim()) return;
    const name = item.name.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('nb');
    for (const path of paths(item)) for (const point of path) {
      if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) continue;
      const key = JSON.stringify([name, point.latitude.toFixed(6), point.longitude.toFixed(6)]);
      const previous = junctions.get(key);
      if (previous !== undefined) {
        const a = root(previous), b = root(i);
        parents[Math.max(a, b)] = Math.min(a, b);
      } else junctions.set(key, i);
    }
  });
  const groups = new Map<number, Discovery[]>();
  unique.forEach((item, i) => {
    const key = root(i), members = groups.get(key) ?? [];
    members.push(item); groups.set(key, members);
  });
  return [...groups.values()].map(members => {
    if (members.length === 1) return { id: members[0].id, item: members[0], members };
    const first = members[0];
    const id = `display-route:${members.map(item => item.id).sort()[0]}`;
    // MultiLineString-style paths preserve every bend and gap. Never concatenate
    // disjoint paths into an invented straight line, or persist this display ID.
    const item: Discovery = { ...first, id, streetPaths: members.flatMap(paths), streetEnds: [] };
    return { id, item, members };
  });
}

export function rowKinds(row: DiscoveryRow) {
  return [...new Set(row.members.map(item => kindLabels[item.kind]))].join(' og ');
}

export function rowProgress(row: DiscoveryRow, progress: Record<string, Progress>) {
  const known = row.members.map(item => progress[item.id]);
  return {
    complete: known.every(p => p?.collected),
    collected: known.some(p => p?.collected),
    visited: known.some(p => p?.fraction > 0),
    firstVisit: Math.max(0, ...known.map(p => p?.firstVisit ?? 0)),
  };
}

export function rowProgressLabel(row: DiscoveryRow, progress: Record<string, Progress>) {
  if (row.members.length === 1) {
    const p = progress[row.item.id];
    return !p ? 'Venter på sjekk' : p.collected ? needsDiscoveryName(row.item) ? 'Registrert' : 'Samlet'
      : route(row.item) ? routeProgressLabel(p) : 'Ikke besøkt ennå';
  }
  const completed = row.members.filter(item => progress[item.id]?.collected).length;
  return completed === row.members.length ? 'Alle kartlagte deler gått'
    : completed ? `${completed} av ${row.members.length} deler gått`
      : rowProgress(row, progress).visited ? 'Delvis gått' : 'Ikke gått ennå';
}

/** Group before filtering so a connecting stair/previously visited piece cannot
 * split one route into repeated entries, or put it in both trip sections. */
export function tripDiscoveryRows(rows: DiscoveryRow[], tripId: string, progress: Record<string, Progress>, visited: Record<string, Progress>) {
  const fresh: DiscoveryRow[] = [], other: DiscoveryRow[] = [];
  for (const row of rows) {
    if (row.members.some(item => !needsDiscoveryName(item) && progress[item.id]?.collected && progress[item.id]?.earnedTripId === tripId)) fresh.push(row);
    else if (rowProgress(row, visited).visited) other.push(row);
  }
  return { fresh, other };
}
