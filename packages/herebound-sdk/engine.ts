import type { Account, Action, Command, Encounter, GamePack, GameRegistry, Item, Point, Snapshot } from './types';
import { canEnter } from './presence';
import { validPoint, metersBetween } from './geo';
export { validPoint, metersBetween } from './geo';

const id = (s: unknown): s is string => typeof s === 'string' && /^[a-z][a-z0-9:-]{0,79}$/.test(s) && !['constructor', 'prototype'].includes(s);
const count = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) >= 0 && (n as number) <= 1_000_000;
export function validatePack(pack: GamePack, catalogue: ReadonlyMap<string, Item> = new Map(pack.items.map(i => [i.id, i]))) {
  if (pack.sdkVersion !== 1 || !id(pack.id) || !count(pack.version) || pack.version < 1 || !pack.title?.trim() ||
      !validPoint(pack.area?.center) || !(pack.area.radiusMeters > 0 && pack.area.radiusMeters <= 5000) ||
      !validPoint(pack.spawn) || metersBetween(pack.spawn, pack.area.center) > pack.area.radiusMeters ||
      !validPoint(pack.start?.position) || !pack.start.name?.trim() || !(pack.start.radiusMeters > 0 && pack.start.radiusMeters <= 200) ||
      metersBetween(pack.start.position, pack.area.center) + pack.start.radiusMeters > pack.area.radiusMeters ||
      typeof pack.simulationOnly !== 'boolean' || !Array.isArray(pack.items) || !Array.isArray(pack.encounters)) throw new Error('Spillpakken støtter ikke denne Herebound-versjonen.');
  const helperIds = new Set<string>();
  for (const helper of pack.helpers) {
    if (!id(helper.id) || !helper.id.startsWith(pack.id + ':') || helperIds.has(helper.id) || !helper.name?.trim() || !count(helper.carryGrams)) throw new Error('Ugyldig hjelper.');
    helperIds.add(helper.id);
  }
  const itemIds = new Set<string>(), encounterIds = new Set<string>();
  for (const item of pack.items) {
    if (!id(item.id) || !item.id.startsWith(pack.id + ':') || itemIds.has(item.id) || !item.name.trim() || !count(item.weightGrams)) throw new Error('Ugyldig gjenstand i spillpakken.');
    itemIds.add(item.id);
  }
  for (const imported of pack.imports) {
    if (!id(imported) || itemIds.has(imported) || !catalogue.has(imported)) throw new Error('Spillet refererer til en ukjent gjenstand.');
    itemIds.add(imported);
  }
  const clueIds = new Set(pack.encounters.flatMap(e => e.topics.flatMap(t => t.clue ? [t.clue.id] : [])));
  for (const e of pack.encounters) {
    if (!id(e.id) || encounterIds.has(e.id) || !validPoint(e.position) || !e.name.trim() || !(e.radiusMeters > 0 && e.radiusMeters <= 200) ||
      metersBetween(e.position, pack.area.center) + e.radiusMeters > pack.area.radiusMeters) throw new Error('Møtestedet er utenfor spillområdet eller ugyldig.');
    encounterIds.add(e.id);
    if (e.recruit && (!helperIds.has(e.recruit.helperId) || (e.recruit.requires && !clueIds.has(e.recruit.requires)))) throw new Error('Ugyldig rekruttering.');
    const topics = new Set<string>(), stock = new Set<string>();
    for (const t of e.topics) {
      if (!id(t.id) || topics.has(t.id) || !t.text.trim() || (t.clue && (!id(t.clue.id) || !t.clue.title.trim() || !t.clue.text.trim())) || (t.requires && !clueIds.has(t.requires))) throw new Error('Ugyldig samtale.');
      topics.add(t.id);
    }
    for (const s of e.shop ?? []) {
      if (!itemIds.has(s.itemId) || stock.has(s.itemId) || !count(s.buy) || s.buy < 1 || !count(s.sell) || s.sell > s.buy || !count(s.quantity)) throw new Error('Ugyldig butikk.');
      stock.add(s.itemId);
    }
  }
}
export function createRegistry(packs: GamePack[], sharedItems: Item[] = []): GameRegistry {
  const registry = new Map<string, GamePack>();
  const catalogue = new Map<string, Item>();
  for (const item of sharedItems) {
    if (!id(item.id) || !item.id.startsWith('herebound:') || !item.name?.trim() || !count(item.weightGrams) || catalogue.has(item.id)) throw new Error('Ugyldig felles gjenstand.');
    catalogue.set(item.id, JSON.parse(JSON.stringify(item)));
  }
  for (const pack of packs) for (const item of pack.items) {
    if (catalogue.has(item.id)) throw new Error('Gjenstands-ID er allerede definert.');
    catalogue.set(item.id, item);
  }
  for (const pack of packs) {
    validatePack(pack, catalogue);
    if (registry.has(pack.id)) throw new Error('Spillet er allerede registrert.');
    registry.set(pack.id, JSON.parse(JSON.stringify(pack)));
  }
  return Object.assign(registry, { items: catalogue });
}
export function newAccount(name: string): Account {
  const clean = name.trim();
  if (!clean || clean.length > 30) throw new Error('Bruk et navn på 1–30 tegn.');
  return { schemaVersion: 1, namespace: 'local-test', revision: 0, currentGame: null,
    character: { name: clean, level: 1, xp: 0, gold: 20, attributes: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 }, inventory: {}, helpers: {} },
    items: {}, inventoryEvents: [], games: {}, receipts: {} };
}
export const stockKey = (encounterId: string, itemId: string) => `${encounterId}/${itemId}`;
export function nearby(pack: GamePack, position: Point, e: Encounter) {
  return validPoint(position) && metersBetween(position, pack.area.center) <= pack.area.radiusMeters && metersBetween(position, e.position) <= e.radiusMeters;
}
export function applyCommand(account: Account, registry: GameRegistry, command: Command, now = Date.now()): Snapshot {
  if (!id(command.id)) throw new Error('Ugyldig handling.');
  const fingerprint = JSON.stringify(command.action), receipt = account.receipts[command.id];
  if (receipt) {
    if (receipt.fingerprint !== fingerprint) throw new Error('Handlingen er allerede brukt.');
    return { account, message: receipt.message };
  }
  if (command.expectedRevision !== account.revision) throw new Error('Figuren er oppdatert. Prøv igjen.');
  // JSON keeps state serializable on web and Hermes; structuredClone is not
  // assumed to exist in the phone runtime.
  const next: Account = JSON.parse(JSON.stringify(account));
  const a: Action = command.action;
  let message = '';
  if (a.type === 'leave') { next.currentGame = null; message = 'Fremgangen er bevart.'; }
  else if (a.type === 'enter') {
    const pack = registry.get(a.gameId);
    if (!pack) throw new Error('Spillet er ikke installert.');
    if (!pack.simulationOnly) throw new Error('Denne utgaven kjører bare lokale prøvespill.');
    for (const item of registry.items.values()) if (!next.items[item.id]) next.items[item.id] = { ...item };
    if (a.fix.source !== 'simulation') throw new Error('Møtestedene er foreløpig bare åpne i simulatoren.');
    if (!canEnter(pack, a.fix, now, !!next.games[pack.id])) throw new Error(next.games[pack.id] ? 'Du må være innenfor spillområdet.' : `Gå til ${pack.start.name} for å begynne.`);
    if (!next.games[pack.id]) next.games[pack.id] = { packVersion: pack.version, position: { latitude: a.fix.latitude, longitude: a.fix.longitude }, discovered: [], journal: [], visits: 0,
      stock: Object.fromEntries(pack.encounters.flatMap(e => (e.shop ?? []).map(s => [stockKey(e.id, s.itemId), s.quantity]))) };
    if (next.games[pack.id].packVersion !== pack.version) throw new Error('Dette spillet trenger en oppdatering av lagringen. Fremgangen er bevart.');
    next.games[pack.id].visits++;
    next.currentGame = pack.id;
    message = `Velkommen til ${pack.title}.`;
  } else {
    const pack = next.currentGame && registry.get(next.currentGame);
    if (!pack) throw new Error('Velg et spill først.');
    const progress = next.games[pack.id];
    if (progress.packVersion !== pack.version) throw new Error('Spillversjonen er endret.');
    if (a.type === 'travel') {
      if (!pack.simulationOnly || !validPoint(a.position) || metersBetween(pack.area.center, a.position) > pack.area.radiusMeters) throw new Error('Velg et sted innenfor spillområdet.');
      progress.position = { ...a.position }; message = 'Flyttet i simulatoren.';
    } else {
      const encounter = pack.encounters.find(e => e.id === a.encounterId);
      if (!encounter || !nearby(pack, progress.position, encounter)) throw new Error('Du må være ved møtestedet.');
      if (a.type === 'discover') {
        if (!progress.discovered.includes(encounter.id)) {
          progress.discovered.push(encounter.id);
          next.character.xp += 10;
        }
        message = encounter.greeting;
      } else {
        if (!progress.discovered.includes(encounter.id)) throw new Error('Undersøk stedet først.');
        if (a.type === 'recruit') {
          const offer = encounter.recruit, helper = pack.helpers.find(h => h.id === offer?.helperId);
          if (!helper || !offer || (offer.requires && !progress.journal.some(j => j.id === offer.requires))) throw new Error('Hjelperen er ikke klar til å slå følge ennå.');
          if (!next.character.helpers[helper.id]) next.character.helpers[helper.id] = { ...helper };
          message = `${helper.name} slår følge. Hjelperen blir med deg til andre spill.`;
        } else if (a.type === 'talk') {
          const topic = encounter.topics.find(t => t.id === a.topicId);
          if (!topic || (topic.requires && !progress.journal.some(j => j.id === topic.requires))) throw new Error('Du kjenner ikke dette samtaleemnet ennå.');
          if (topic.clue && !progress.journal.some(j => j.id === topic.clue!.id)) progress.journal.push({ ...topic.clue });
          message = topic.text;
        } else if (a.type === 'trade') {
          if (!Number.isSafeInteger(a.quantity) || a.quantity < 1 || a.quantity > 99 || !['buy', 'sell'].includes(a.direction)) throw new Error('Ugyldig antall eller handel.');
          const offer = encounter.shop?.find(s => s.itemId === a.itemId);
          const item = next.items[a.itemId];
          if (!offer || !item) throw new Error('Varen finnes ikke i denne butikken.');
          const key = stockKey(encounter.id, item.id), owned = next.character.inventory[item.id] ?? 0;
          const price = (a.direction === 'buy' ? offer.buy : offer.sell) * a.quantity;
          if (a.direction === 'buy') {
            if (inventoryWeight(next) + item.weightGrams * a.quantity > carryCapacity(next)) throw new Error('Sekken blir for tung. Selg noe før du kjøper mer.');
            if (progress.stock[key] < a.quantity) throw new Error('Butikken har ikke nok på lager.');
            if (next.character.gold < price) throw new Error('Du har ikke nok gull.');
            progress.stock[key] -= a.quantity; next.character.gold -= price; next.character.inventory[item.id] = owned + a.quantity;
            message = `Kjøpt ${a.quantity} ${item.name.toLocaleLowerCase('nb-NO')} for ${price} gull.`;
          } else {
            if (owned < a.quantity) throw new Error('Du har ikke nok av denne varen.');
            if (!offer.sell) throw new Error('Denne varen kjøpes ikke tilbake.');
            next.character.inventory[item.id] = owned - a.quantity; next.character.gold += price; progress.stock[key] += a.quantity;
            message = `Solgt ${a.quantity} ${item.name.toLocaleLowerCase('nb-NO')} for ${price} gull.`;
          }
          next.inventoryEvents.push({ commandId: command.id, gameId: pack.id, itemId: item.id, delta: a.direction === 'buy' ? a.quantity : -a.quantity });
          if (![next.character.gold, next.character.inventory[item.id], progress.stock[key]].every(count)) throw new Error('Handelen overskrider prøveversjonens grenser.');
        } else throw new Error('Ukjent handling.');
      }
    }
  }
  next.revision++;
  next.receipts[command.id] = { fingerprint, message };
  return { account: next, message };
}

/** Preserve corrupt/future saves by failing closed. Never silently reset them. */
export function decodeAccount(raw: string): Account {
  try {
    const a = JSON.parse(raw) as Account;
    const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
    if (a.schemaVersion !== 1 || a.namespace !== 'local-test' || !count(a.revision) || !record(a.items) || !record(a.games) || !record(a.receipts) || !record(a.character)) throw 0;
    if (!Object.entries(a.items).every(([key, item]) => id(key) && item && item.id === key && typeof item.name === 'string' && typeof item.description === 'string' && count(item.weightGrams) && ['ingredient', 'equipment', 'potion'].includes(item.kind))) throw 0;
    if (!Array.isArray(a.inventoryEvents) || !a.inventoryEvents.every(e => e && id(e.commandId) && id(e.gameId) && id(e.itemId) && !!a.items[e.itemId] && Number.isSafeInteger(e.delta) && e.delta !== 0 && Math.abs(e.delta) <= 99)) throw 0;
    const c = a.character;
    if (typeof c.name !== 'string' || !c.name.trim() || c.name.length > 30 || ![c.level, c.xp, c.gold].every(count) || c.level < 1 || !record(c.attributes) || !record(c.inventory) || !record(c.helpers)) throw 0;
    if (!['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].every(k => count(c.attributes[k as keyof typeof c.attributes]))) throw 0;
    if (!Object.entries(c.helpers).every(([key, h]) => id(key) && h && h.id === key && typeof h.name === 'string' && typeof h.description === 'string' && count(h.carryGrams))) throw 0;
    if (!Object.entries(c.inventory).every(([key, n]) => id(key) && count(n) && !!a.items[key])) throw 0;
    for (const [key, p] of Object.entries(a.games)) {
      if (!id(key) || !record(p) || !validPoint(p.position) || !count(p.packVersion) || !count(p.visits) || !Array.isArray(p.discovered) || !p.discovered.every(id) || !Array.isArray(p.journal) || !p.journal.every(j => j && id(j.id) && typeof j.title === 'string' && typeof j.text === 'string') || !record(p.stock) || !Object.values(p.stock).every(count)) throw 0;
    }
    if (a.currentGame !== null && (!id(a.currentGame) || !Object.hasOwn(a.games, a.currentGame))) throw 0;
    if (!Object.entries(a.receipts).every(([key, r]) => id(key) && record(r) && typeof r.fingerprint === 'string' && typeof r.message === 'string')) throw 0;
    return a;
  } catch { throw new Error('Lagringen kan ikke åpnes av denne versjonen. Den er bevart. Eksporter den før du gjør endringer.'); }
}

/** Capacity is a shared rule. Games cannot bypass it by changing the UI. */
export const carryCapacity = (account: Account) => 10_000 + account.character.attributes.strength * 1000 + Object.values(account.character.helpers).reduce((sum, h) => sum + h.carryGrams, 0);
export const inventoryWeight = (account: Account) => Object.entries(account.character.inventory).reduce((sum, [id, amount]) => sum + (account.items[id]?.weightGrams ?? 0) * amount, 0);
