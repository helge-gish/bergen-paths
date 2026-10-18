import type { Discovery } from './discoveries';
import { isUnnamedRoute } from './discoveryGroups';

/** Local Tråkk names never change the OSM source or the target identity. */
export function nameDiscovery(items: Discovery[], id: string, input: string): Discovery[] {
  const item = items.find(i => i.id === id);
  if (!item) throw new Error('Fant ikke denne stien eller trappen.');
  if (!isUnnamedRoute(item) && !item.localName) throw new Error('Dette kartobjektet har allerede et navn.');
  const name = input.trim();
  if (name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) throw new Error('Bruk et navn på maks 80 tegn uten linjeskift.');
  const sourceName = item.osmName ?? item.name;
  const updated = { ...item, name: name || sourceName, osmName: sourceName, localName: name || undefined };
  return items.map(i => i.id === id ? updated : i);
}
export function retainLocalName(existing: Discovery | undefined, incoming: Discovery): Discovery {
  // A newly mapped official name takes precedence and locks naming again.
  return existing?.localName && isUnnamedRoute(incoming) ? { ...incoming, osmName: incoming.name, name: existing.localName, localName: existing.localName } : incoming;
}
