import { awardXp, DEFAULT_APPEARANCE, EQUIP_SLOTS, migrateCharacter, prepareCharacter, validAppearance, validSkin } from './character';
import type { Account, Action, Command, Encounter, GamePack, GameRegistry, Item, Point, PositionFix, Skin, Snapshot } from './types';
import { canEnter, canMeet, freshPosition } from './presence';
import { progressFor, revealAt } from './exploration';
import { validPoint, metersBetween } from './geo';
export { validPoint, metersBetween } from './geo';

const id = (s: unknown): s is string => typeof s === 'string' && /^[a-z][a-z0-9:-]{0,79}$/.test(s) && !['constructor', 'prototype'].includes(s);
const count = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) >= 0 && (n as number) <= 1_000_000;
export function validatePack(pack: GamePack, catalogue: ReadonlyMap<string, Item> = new Map(pack.items.map(i => [i.id, i])), skins: ReadonlyMap<string, Skin> = new Map((pack.skins ?? []).map(s => [s.id, s]))) {
  if (pack.sdkVersion !== 1 || !id(pack.id) || !count(pack.version) || pack.version < 1 || !pack.title?.trim() ||
      !validPoint(pack.area?.center) || !(pack.area.radiusMeters > 0 && pack.area.radiusMeters <= 5000) ||
      !validPoint(pack.spawn) || metersBetween(pack.spawn, pack.area.center) > pack.area.radiusMeters ||
      !validPoint(pack.start?.position) || !pack.start.name?.trim() || !(pack.start.radiusMeters > 0 && pack.start.radiusMeters <= 200) ||
      metersBetween(pack.start.position, pack.area.center) + pack.start.radiusMeters > pack.area.radiusMeters ||
      typeof pack.simulationOnly !== 'boolean' || !Array.isArray(pack.items) || !Array.isArray(pack.encounters)) throw new Error('Spillpakken støtter ikke denne Herebound-versjonen.');
  const portal = pack.start.presentation;
  if (pack.mapTheme !== undefined && !['standard','parchment'].includes(pack.mapTheme)) throw new Error('Ukjent karttema.');
  if (portal && (!['rune-gate','beacon','camp'].includes(portal.motif) || !/^#[0-9a-fA-F]{6}$/.test(portal.accent) || !portal.label?.trim() || portal.label.length > 30)) throw new Error('Ugyldig startportal.');
  if (pack.currency && (!pack.currency.name?.trim() || !Number.isSafeInteger(pack.currency.unitsPerCredit) || pack.currency.unitsPerCredit < 1 || pack.currency.unitsPerCredit > 1000)) throw new Error('Ugyldig valutaomregning.');
  const helperIds = new Set<string>();
  for (const helper of pack.helpers) {
    if (!id(helper.id) || !helper.id.startsWith(pack.id + ':') || helperIds.has(helper.id) || !helper.name?.trim() || !count(helper.carryGrams)) throw new Error('Ugyldig hjelper.');
    helperIds.add(helper.id);
  }
  for (const skin of pack.skins ?? []) if (!validSkin(skin) || !skin.id.startsWith(pack.id + ':')) throw new Error('Ugyldig skin.');
  const itemIds = new Set<string>(), encounterIds = new Set<string>();
  for (const item of pack.items) {
    if (!id(item.id) || !item.id.startsWith(pack.id + ':') || itemIds.has(item.id) || !item.name.trim() || !count(item.weightGrams)) throw new Error('Ugyldig gjenstand i spillpakken.');
    if (item.wearable && (item.kind !== 'equipment' || !EQUIP_SLOTS.includes(item.wearable.slot) || !['staff','satchel','lantern'].includes(item.wearable.visual) || (item.wearable.minLevel !== undefined && (!count(item.wearable.minLevel) || item.wearable.minLevel < 1 || item.wearable.minLevel > 50)))) throw new Error('Ugyldig utstyr.');
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
    if (e.interaction) {
      const r = e.interaction;
      if (!id(r.id) || !r.label?.trim() || !id(r.clue?.id) || !r.clue.title?.trim() || !r.clue.text?.trim() || !count(r.xp) || r.xp > 100 || (r.requires && !clueIds.has(r.requires))) throw new Error('Ugyldig møtehandling.');
      if (r.skinReward && (!skins.has(r.skinReward) || skins.get(r.skinReward)!.source !== 'adventure')) throw new Error('Ukjent skinbelønning.');
      const costs = new Set<string>();
      for (const c of r.costs) { if (!itemIds.has(c.itemId) || costs.has(c.itemId) || !Number.isInteger(c.amount) || c.amount < 1 || c.amount > 99) throw new Error('Ugyldig kostnad.'); costs.add(c.itemId); }
      if (r.reward && (!itemIds.has(r.reward.itemId) || !Number.isInteger(r.reward.amount) || r.reward.amount < 1 || r.reward.amount > 99)) throw new Error('Ugyldig belønning.');
    }
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
export function createRegistry(packs: GamePack[], sharedItems: Item[] = [], sharedSkins: Skin[] = []): GameRegistry {
  const registry = new Map<string, GamePack>();
  const catalogue = new Map<string, Item>();
  const skins = new Map<string, Skin>();
  if (sharedSkins.some(s => !s.id.startsWith('herebound:'))) throw new Error('Ugyldig felles skin.');
  for (const skin of [...sharedSkins, ...packs.flatMap(p => p.skins ?? [])]) {
    if (!validSkin(skin) || skins.has(skin.id)) throw new Error('Ugyldig eller duplisert skin.');
    skins.set(skin.id, { ...skin });
  }
  for (const item of sharedItems) {
    if (!id(item.id) || !item.id.startsWith('herebound:') || !item.name?.trim() || !count(item.weightGrams) || catalogue.has(item.id)) throw new Error('Ugyldig felles gjenstand.');
    catalogue.set(item.id, JSON.parse(JSON.stringify(item)));
  }
  for (const pack of packs) for (const item of pack.items) {
    if (catalogue.has(item.id)) throw new Error('Gjenstands-ID er allerede definert.');
    catalogue.set(item.id, item);
  }
  for (const pack of packs) {
    validatePack(pack, catalogue, skins);
    if (registry.has(pack.id)) throw new Error('Spillet er allerede registrert.');
    registry.set(pack.id, JSON.parse(JSON.stringify(pack)));
  }
  return Object.assign(registry, { items: catalogue, skins });
}
export function newAccount(name: string): Account {
  const clean = name.trim();
  if (!clean || clean.length > 30) throw new Error('Bruk et navn på 1–30 tegn.');
  return { schemaVersion: 1, namespace: 'local-test', revision: 0, currentGame: null,
    character: { appearance: { ...DEFAULT_APPEARANCE }, equipment: {}, ownedSkins: {}, skin: null, xpClaims: {}, name: clean, level: 1, xp: 0, credits: 20, attributes: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 }, inventory: {}, helpers: {} },
    items: {}, inventoryEvents: [], games: {}, receipts: {} };
}
export const stockKey = (encounterId: string, itemId: string) => `${encounterId}/${itemId}`;
export function nearby(pack: GamePack, position: Point, e: Encounter) {
  return validPoint(position) && metersBetween(position, pack.area.center) <= pack.area.radiusMeters && metersBetween(position, e.position) <= e.radiusMeters;
}
export function applyCommand(account: Account, registry: GameRegistry, command: Command, now = Date.now(), physicalFix: PositionFix | null = null, arEncounter: string | null = null): Snapshot {
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
  for (const item of registry.items.values()) if (!next.items[item.id]) next.items[item.id] = { ...item };
  prepareCharacter(next, registry);
  const previousLevel = next.character.level;
  const a: Action = command.action;
  let message = '';
  if (a.type === 'appearance') {
    if (!validAppearance(a.appearance)) throw new Error('Ugyldig utseende.');
    next.character.appearance = { ...a.appearance }; message = 'Utseendet er lagret.';
  } else if (a.type === 'equip') {
    if (!EQUIP_SLOTS.includes(a.slot)) throw new Error('Ukjent utstyrsplass.');
    if (a.itemId === null) delete next.character.equipment[a.slot];
    else {
      const item = next.items[a.itemId];
      if (!item?.wearable || item.wearable.slot !== a.slot || !(next.character.inventory[item.id] > 0)) throw new Error('Du må eie utstyret for å ta det på.');
      if (next.character.level < (item.wearable.minLevel ?? 1)) throw new Error('Utstyret krever høyere nivå.');
      next.character.equipment[a.slot] = item.id;
    }
    message = a.itemId ? `${next.items[a.itemId].name} er tatt på.` : 'Utstyret er lagt i sekken.';
  } else if (a.type === 'wear-skin') {
    const skin = a.skinId && next.skins?.[a.skinId];
    if (a.skinId !== null && (!skin || !next.character.ownedSkins[a.skinId] || next.character.level < skin.minLevel)) throw new Error('Dette antrekket er ikke låst opp ennå.');
    next.character.skin = a.skinId; message = 'Antrekket er tatt på.';
  } else if (a.type === 'buy-skin') {
    const skin = registry.skins.get(a.skinId);
    if (!skin || skin.source !== 'shop' || !skin.price) throw new Error('Dette antrekket er ikke til salgs.');
    if (next.character.ownedSkins[skin.id]) throw new Error('Du eier allerede dette antrekket.');
    if (next.character.level < skin.minLevel) throw new Error('Antrekket krever høyere nivå.');
    if (next.character.credits < skin.price) throw new Error('Du har ikke nok Herebound-mynt.');
    next.character.credits -= skin.price; next.character.ownedSkins[skin.id] = true;
    message = `${skin.name} er lagt i garderoben.`;
  } else if (a.type === 'leave') { next.currentGame = null; message = 'Fremgangen er bevart.'; }
  else if (a.type === 'enter') {
    const pack = registry.get(a.gameId);
    if (!pack) throw new Error('Spillet er ikke installert.');
    const mode = a.mode ?? 'simulation';
    if (!['simulation', 'field'].includes(mode)) throw new Error('Ukjent spillmodus.');
    const enteringField = mode === 'field';
    if (enteringField && pack.simulationOnly) throw new Error('Spillet er ikke åpnet for feltprøve.');
    const fix = enteringField ? physicalFix : a.fix;
    if (!fix || (enteringField && fix.accuracy > 50) || fix.source !== (enteringField ? 'gps' : 'simulation')) throw new Error('Venter på riktig posisjonskilde.');
    const states = enteringField ? (next.fieldGames ??= {}) : next.games;
    if (!canEnter(pack, fix, now, !!states[pack.id])) throw new Error(states[pack.id] ? 'Kom tilbake til spillområdet med fersk GPS.' : `Gå til ${pack.start.name} med brukbar GPS for å begynne.`);
    for (const item of registry.items.values()) if (!next.items[item.id]) next.items[item.id] = { ...item };
    if (!states[pack.id]) states[pack.id] = { packVersion: pack.version, position: { latitude: fix.latitude, longitude: fix.longitude }, discovered: [], journal: [], visits: 0,
      stock: Object.fromEntries(pack.encounters.flatMap(e => (e.shop ?? []).map(s => [stockKey(e.id, s.itemId), s.quantity]))) };
    if (states[pack.id].packVersion !== pack.version) throw new Error('Dette spillet trenger en oppdatering av lagringen. Fremgangen er bevart.');
    states[pack.id].visits++;
    states[pack.id].position = { latitude: fix.latitude, longitude: fix.longitude };
    states[pack.id].revealed = revealAt(pack, states[pack.id], fix);
    states[pack.id].lastObservedAt = fix.timestamp;
    next.activeMode = mode;
    next.currentGame = pack.id;
    message = `Velkommen til ${pack.title}.`;
  } else {
    const pack = next.currentGame && registry.get(next.currentGame);
    if (!pack) throw new Error('Velg et spill først.');
    const progress = progressFor(next)!;
    const field = next.activeMode === 'field';
    if (field) {
      if (!freshPosition(physicalFix, now) || physicalFix.source !== 'gps' || physicalFix.accuracy > 30) throw new Error('Venter på fersk GPS med bedre enn 30 m nøyaktighet.');
      if (metersBetween(physicalFix, pack.area.center) + physicalFix.accuracy > pack.area.radiusMeters) throw new Error('Du er utenfor spillområdet. Fremgangen er bevart.');
      progress.position = { latitude: physicalFix.latitude, longitude: physicalFix.longitude };
    }
    if (progress.packVersion !== pack.version) throw new Error('Spillversjonen er endret.');
    if (a.type === 'observe') {
      if (!field || !physicalFix) throw new Error('Observasjon krever fysisk posisjon.');
      if (physicalFix.timestamp <= (progress.lastObservedAt ?? 0)) return { account, message: '' };
      const old = progressFor(account)!;
      const seconds = (physicalFix.timestamp - (old.lastObservedAt ?? physicalFix.timestamp)) / 1000;
      if (seconds > 0 && seconds < 30 && metersBetween(old.position, physicalFix) / seconds > 8) throw new Error('GPS hoppet. Venter på en stabil posisjon.');
      progress.revealed = revealAt(pack, progress, physicalFix);
      progress.lastObservedAt = physicalFix.timestamp;
    } else if (a.type === 'travel') {
      if (field || !validPoint(a.position) || metersBetween(pack.area.center, a.position) > pack.area.radiusMeters) throw new Error('Velg et sted innenfor spillområdet.');
      progress.position = { ...a.position }; progress.revealed = revealAt(pack, progress, a.position); message = 'Flyttet i simulatoren.';
    } else {
      const encounter = pack.encounters.find(e => e.id === a.encounterId);
      if (!encounter || !nearby(pack, progress.position, encounter) || (field && !canMeet(encounter,physicalFix,now))) throw new Error('Du må være ved møtestedet.');
      if (field && arEncounter !== encounter.id) throw new Error('Åpne dette møtet i AR før du samhandler.');
      if (a.type === 'discover') {
        if (!progress.discovered.includes(encounter.id)) {
          progress.discovered.push(encounter.id);
          awardXp(next, `${pack.id}/discover/${encounter.id}`, 10);
        }
        message = encounter.greeting;
      } else {
        if (!progress.discovered.includes(encounter.id)) throw new Error('Undersøk stedet først.');
        if (a.type === 'interact') {
          const interaction = encounter.interaction;
          if (!interaction || (interaction.requires && !progress.journal.some(j => j.id === interaction.requires))) throw new Error('Du trenger et spor til før du kan gjøre dette.');
          if (progress.journal.some(j => j.id === interaction.clue.id)) return { account, message: 'Du har allerede gjort dette.' };
          for (const cost of interaction.costs) if ((next.character.inventory[cost.itemId] ?? 0) < cost.amount) throw new Error(`Du trenger ${cost.amount} ${next.items[cost.itemId]?.name ?? cost.itemId}.`);
          for (const cost of interaction.costs) { next.character.inventory[cost.itemId] -= cost.amount; next.inventoryEvents.push({ commandId: command.id, gameId: pack.id, itemId: cost.itemId, delta: -cost.amount }); }
          if (interaction.reward) {
            const reward = interaction.reward;
            if (inventoryWeight(next) + next.items[reward.itemId].weightGrams * reward.amount > carryCapacity(next)) throw new Error('Sekken har ikke plass til belønningen ennå.');
            next.character.inventory[reward.itemId] = (next.character.inventory[reward.itemId] ?? 0) + reward.amount;
            next.inventoryEvents.push({ commandId: command.id, gameId: pack.id, itemId: reward.itemId, delta: reward.amount });
          }
          progress.journal.push({ ...interaction.clue }); awardXp(next, `${pack.id}/interact/${encounter.id}`, interaction.xp);
          if (interaction.skinReward) next.character.ownedSkins[interaction.skinReward] = true;
          message = interaction.clue.text;
        } else if (a.type === 'recruit') {
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
            if (next.character.credits < price) throw new Error('Du har ikke nok på Herebound-saldoen.');
            progress.stock[key] -= a.quantity; next.character.credits -= price; next.character.inventory[item.id] = owned + a.quantity;
            message = `Kjøpt ${a.quantity} ${item.name.toLocaleLowerCase('nb-NO')} for ${price * (pack.currency?.unitsPerCredit ?? 1)} ${pack.currency?.name ?? 'mynt'}.`;
          } else {
            if (owned < a.quantity) throw new Error('Du har ikke nok av denne varen.');
            if (!offer.sell) throw new Error('Denne varen kjøpes ikke tilbake.');
            next.character.inventory[item.id] = owned - a.quantity; next.character.credits += price; progress.stock[key] += a.quantity;
            message = `Solgt ${a.quantity} ${item.name.toLocaleLowerCase('nb-NO')} for ${price * (pack.currency?.unitsPerCredit ?? 1)} ${pack.currency?.name ?? 'mynt'}.`;
          }
          next.inventoryEvents.push({ commandId: command.id, gameId: pack.id, itemId: item.id, delta: a.direction === 'buy' ? a.quantity : -a.quantity });
          if (![next.character.credits, next.character.inventory[item.id], progress.stock[key]].every(count)) throw new Error('Handelen overskrider prøveversjonens grenser.');
        } else throw new Error('Ukjent handling.');
      }
    }
  }
  prepareCharacter(next, registry);
  if (next.character.level > previousLevel) message += ` Nivå ${next.character.level}! Se belønningene i garderoben.`;
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
    // 0.1.x called the shared balance gold. Preserve its value during migration.
    const legacy = c as typeof c & { gold?: number };
    if (c.credits === undefined && count(legacy.gold)) c.credits = legacy.gold;
    delete legacy.gold;
    if (typeof c.name !== 'string' || !c.name.trim() || c.name.length > 30 || ![c.level, c.xp, c.credits].every(count) || c.level < 1 || !record(c.attributes) || !record(c.inventory) || !record(c.helpers)) throw 0;
    if (!['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].every(k => count(c.attributes[k as keyof typeof c.attributes]))) throw 0;
    if (!Object.entries(c.helpers).every(([key, h]) => id(key) && h && h.id === key && typeof h.name === 'string' && typeof h.description === 'string' && count(h.carryGrams))) throw 0;
    if (!Object.entries(c.inventory).every(([key, n]) => id(key) && count(n) && !!a.items[key])) throw 0;
    if (a.activeMode !== undefined && !['simulation', 'field'].includes(a.activeMode)) throw 0;
    if (a.fieldGames !== undefined && !record(a.fieldGames)) throw 0;
    for (const [key, p] of [...Object.entries(a.games), ...Object.entries(a.fieldGames ?? {})]) {
      if (p.revealed && (!record(p.revealed) || !Object.entries(p.revealed).every(([cell, value]) => /^-?\d{1,4},-?\d{1,4}$/.test(cell) && value === true))) throw 0;
      if (p.lastObservedAt !== undefined && (!Number.isFinite(p.lastObservedAt) || p.lastObservedAt < 0)) throw 0;
      if (!id(key) || !record(p) || !validPoint(p.position) || !count(p.packVersion) || !count(p.visits) || !Array.isArray(p.discovered) || !p.discovered.every(id) || !Array.isArray(p.journal) || !p.journal.every(j => j && id(j.id) && typeof j.title === 'string' && typeof j.text === 'string') || !record(p.stock) || !Object.values(p.stock).every(count)) throw 0;
    }
    if (a.currentGame !== null && (!id(a.currentGame) || !Object.hasOwn(a.activeMode === 'field' ? a.fieldGames ?? {} : a.games, a.currentGame))) throw 0;
    if (!Object.entries(a.receipts).every(([key, r]) => id(key) && record(r) && typeof r.fingerprint === 'string' && typeof r.message === 'string')) throw 0;
    if (c.appearance !== undefined && !validAppearance(c.appearance)) throw 0;
    if (c.equipment !== undefined && (!record(c.equipment) || !Object.entries(c.equipment).every(([slot, itemId]) => EQUIP_SLOTS.includes(slot as any) && typeof itemId === 'string' && c.inventory[itemId] > 0 && a.items[itemId]?.wearable?.slot === slot))) throw 0;
    if (a.skins !== undefined && (!record(a.skins) || !Object.entries(a.skins).every(([key, s]) => s.id === key && validSkin(s)))) throw 0;
    if (c.ownedSkins !== undefined && (!record(c.ownedSkins) || !Object.entries(c.ownedSkins).every(([key,v]) => id(key) && v === true && !!a.skins?.[key]))) throw 0;
    if (c.skin !== undefined && c.skin !== null && (!id(c.skin) || !c.ownedSkins?.[c.skin])) throw 0;
    if (c.xpClaims !== undefined && (!record(c.xpClaims) || !Object.entries(c.xpClaims).every(([key,v]) => /^[a-z0-9:-]+\/(discover|interact)\/[a-z0-9:-]+$/.test(key) && v === true))) throw 0;
    migrateCharacter(a);
    return a;
  } catch { throw new Error('Lagringen kan ikke åpnes av denne versjonen. Den er bevart. Eksporter den før du gjør endringer.'); }
}

/** Capacity is a shared rule. Games cannot bypass it by changing the UI. */
export const carryCapacity = (account: Account) => 10_000 + account.character.attributes.strength * 1000 + Object.values(account.character.helpers).reduce((sum, h) => sum + h.carryGrams, 0);
export const inventoryWeight = (account: Account) => Object.entries(account.character.inventory).reduce((sum, [id, amount]) => sum + (account.items[id]?.weightGrams ?? 0) * amount, 0);
