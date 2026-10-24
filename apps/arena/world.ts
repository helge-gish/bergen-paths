/** Server-side domain prototype. A caller must load+save the world version in
 * one transaction. The simulation namespace cannot be imported as live rewards. */
export type Item = 'blueberry' | 'birch' | 'heather' | 'spruce' | 'echo' | 'light' | 'journal';
const tradable = new Set<Item>(['blueberry', 'birch', 'heather', 'spruce', 'echo', 'light']);
export type Player = { inventory: Partial<Record<Item, number>>; knows: string[]; chapter: number };
type Offer = Partial<Record<Item, number>>;
export type Trade = { from: string; to: string; give: Offer; receive: Offer; accepted: string[]; done: boolean };
export type World = { namespace: 'simulation'; version: number; players: Record<string, Player>; trades: Record<string, Trade>; commands: Record<string, string>; lanternContributors: string[]; lanternLit: boolean };
export type Command =
  | { type: 'learn'; keyword: 'iver' | 'two-names' }
  | { type: 'craft'; recipe: 'echo' | 'light' }
  | { type: 'offer'; tradeId: string; to: string; give: Offer; receive: Offer }
  | { type: 'accept'; tradeId: string }
  | { type: 'light-lantern' };
export function newWorld(ids: string[]): World {
  if (!ids.length || new Set(ids).size !== ids.length || ids.some(id => !/^[a-z0-9-]{1,64}$/i.test(id) || ['constructor', '__proto__', 'prototype'].includes(id))) throw new Error('Ugyldige spillere');
  return { namespace: 'simulation', version: 0, players: Object.fromEntries(ids.map(id => [id, { inventory: { blueberry: 1, birch: 1, heather: 1, spruce: 1, journal: 1 }, knows: [], chapter: 0 }])), trades: {}, commands: {}, lanternContributors: [], lanternLit: false };
}
function validateOffer(offer: Offer) {
  if (Object.keys(offer).length > 6) throw new Error('For mange varer');
  for (const [item, count] of Object.entries(offer)) if (!tradable.has(item as Item) || !Number.isSafeInteger(count) || count! <= 0 || count! > 99) throw new Error('Denne varen kan ikke byttes');
}
function has(player: Player, offer: Offer) { return Object.entries(offer).every(([item, count]) => (player.inventory[item as Item] ?? 0) >= count!); }
function move(from: Player, to: Player, offer: Offer) { for (const [key, count] of Object.entries(offer)) { const item = key as Item; from.inventory[item] = (from.inventory[item] ?? 0) - count!; to.inventory[item] = (to.inventory[item] ?? 0) + count!; } }
export function command(world: World, actor: string, id: string, expectedVersion: number, cmd: Command): World {
  if (!Object.hasOwn(world.players, actor) || !/^[a-z0-9-]{1,80}$/i.test(id)) throw new Error('Ukjent spiller eller kommando');
  const key = `${actor}:${id}`, body = JSON.stringify(cmd);
  if (world.commands[key]) { if (world.commands[key] !== body) throw new Error('Kommando-id er allerede brukt'); return world; }
  if (expectedVersion !== world.version) throw new Error('Verden ble oppdatert. Hent ny versjon.');
  const next = structuredClone(world), player = next.players[actor];
  if (cmd.type === 'learn') {
    if (!['iver', 'two-names'].includes(cmd.keyword)) throw new Error('Ukjent spor');
    // In this simulator, learning stands in for reaching a dialogue node.
    // Live API must verify that node and its prerequisites, never accept this directly.
    if (!player.knows.includes(cmd.keyword)) player.knows.push(cmd.keyword);
  } else if (cmd.type === 'craft') {
    const recipe: Offer = cmd.recipe === 'echo' ? { blueberry: 1, birch: 1 } : cmd.recipe === 'light' ? { heather: 1, spruce: 1 } : {};
    if (!Object.keys(recipe).length || !has(player, recipe)) throw new Error('Mangler ingredienser');
    for (const [key, count] of Object.entries(recipe)) player.inventory[key as Item]! -= count!;
    player.inventory[cmd.recipe] = (player.inventory[cmd.recipe] ?? 0) + 1;
  } else if (cmd.type === 'offer') {
    if (!/^[a-z0-9-]{1,80}$/i.test(cmd.tradeId) || ['constructor', '__proto__', 'prototype'].includes(cmd.tradeId) || Object.hasOwn(next.trades, cmd.tradeId) || cmd.to === actor || !Object.hasOwn(next.players, cmd.to)) throw new Error('Ugyldig handel');
    validateOffer(cmd.give); validateOffer(cmd.receive);
    if (!Object.keys(cmd.give).length && !Object.keys(cmd.receive).length) throw new Error('Tom handel');
    if (!has(player, cmd.give)) throw new Error('Mangler varer');
    next.trades[cmd.tradeId] = { from: actor, to: cmd.to, give: cmd.give, receive: cmd.receive, accepted: [], done: false };
  } else if (cmd.type === 'accept') {
    const trade = Object.hasOwn(next.trades, cmd.tradeId) ? next.trades[cmd.tradeId] : null;
    if (!trade || ![trade.from, trade.to].includes(actor) || trade.done) throw new Error('Handelen er ikke tilgjengelig');
    if (!trade.accepted.includes(actor)) trade.accepted.push(actor);
    if (trade.accepted.length === 2) {
      const from = next.players[trade.from], to = next.players[trade.to];
      if (!has(from, trade.give) || !has(to, trade.receive)) throw new Error('Varene finnes ikke lenger');
      move(from, to, trade.give); move(to, from, trade.receive); trade.done = true;
    }
  } else if (cmd.type === 'light-lantern') {
    if (!player.knows.includes('iver') || !(player.inventory.light! > 0)) throw new Error('Du trenger Ivers spor og lyktesmørje');
    if (player.chapter >= 1) throw new Error('Kapittelet er allerede fullført');
    player.inventory.light!--; player.chapter = 1;
    next.lanternLit = true;
    if (!next.lanternContributors.includes(actor)) next.lanternContributors.push(actor);
  } else throw new Error('Ukjent kommando');
  next.commands[key] = body; next.version++; return next;
}
