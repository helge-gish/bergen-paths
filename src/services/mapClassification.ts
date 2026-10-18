import type { Store } from '../data/store';
import type { Discovery } from '../domain/discoveries';
import type { Goal } from '../domain/goals';

/** Re-fetch derived OSM data; never edit GPS tracks or user-saved trails. */
export function refreshMapClassification(store: Store) {
  if (store.setting('mapClassificationVersion', 0) >= 2) return;
  const legacy = (item: Discovery) => item.kind === 'trail' && !item.osmHighway;
  const items = store.setting<Discovery[]>('osmDiscoveries', []).filter(i => !legacy(i));
  const ids = new Set(items.map(i => i.id));
  store.setSetting('osmDiscoveries', items);
  store.setSetting('osmAwards', Object.fromEntries(Object.entries(store.setting('osmAwards', {})).filter(([id]) => ids.has(id))));
  // Preserve activated definitions, but do not award their obsolete fragments.
  store.setSetting('goals', store.setting<Goal[]>('goals', []).map(g => g.targets.some(legacy) ? { ...g, needsRefresh: true } : g));
  store.setSetting('goalCatalog', store.setting<Goal[]>('goalCatalog', []).filter(g => !g.targets.some(legacy)));
  store.setSetting('surveyCache', { points: {}, regions: {}, streets: {} });
  store.setSetting('mapClassificationVersion', 2);
}
