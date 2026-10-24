import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { applyCommand, canEnter, carryCapacity, createRegistry, decodeAccount, gamesNearby, inventoryWeight, metersBetween, newAccount, Session, stockKey, validatePack } from '../packages/herebound-sdk';
import type { Account, Action, GamePack, Persistence, PositionFix } from '../packages/herebound-sdk';
import { ultimaX } from '../games/ultima-x';
import { sharedItems } from '../content/shared-items';
const registry = createRegistry([ultimaX], sharedItems);
const now = 1_800_000_000_000;
const fix = (position = ultimaX.start.position): PositionFix => ({ ...position, accuracy: 0, timestamp: now, source: 'simulation' });
let commandId = 0;
function command(account: Account, action: Action) { return { id: `test-${++commandId}`, expectedRevision: account.revision, action }; }
function action(account: Account, a: Action) { return applyCommand(account, registry, command(account, a), now).account; }
function start() { return action(newAccount('Vandrer'), { type: 'enter', gameId: ultimaX.id, fix: fix() }); }
function shop() { return action(start(), { type: 'discover', encounterId: 'maren' }); }
const trade = (itemId: string, direction: 'buy' | 'sell', quantity = 1): Action => ({ type: 'trade', encounterId: 'maren', itemId, direction, quantity });
function memory(): Persistence & { value: string | null; fail: boolean } { return { value: null, fail: false, async read() { return this.value; }, async write(v) { if (this.fail) throw new Error('Disk full'); this.value = v; } }; }

test('catalogue: empty host, real 5 km threshold, stale/inaccurate GPS, no fallback to Bergen', () => {
  assert.deepEqual(gamesNearby(createRegistry([]), fix(), now), []);
  assert.equal(gamesNearby(registry, fix(), now)[0].id, 'ultima-x');
  const inside = fix({ latitude: ultimaX.area.center.latitude + .044, longitude: ultimaX.area.center.longitude });
  const outside = fix({ latitude: ultimaX.area.center.latitude + .046, longitude: ultimaX.area.center.longitude });
  assert.ok(metersBetween(inside, ultimaX.area.center) < 5000);
  assert.equal(gamesNearby(registry, inside, now).length, 1);
  assert.deepEqual(gamesNearby(registry, outside, now), []);
  for (const invalid of [null, { ...fix(), timestamp: now - 30_001 }, { ...fix(), timestamp: now + 1 }, { ...fix(), accuracy: 100 }, fix({ latitude: 59.91, longitude: 10.75 })]) assert.deepEqual(gamesNearby(registry, invalid, now), []);
});

test('discovery and first entry are separate: gate enforces pack start coordinate, not just region', () => {
  const city = fix({ latitude: ultimaX.area.center.latitude, longitude: ultimaX.area.center.longitude - .02 });
  assert.equal(gamesNearby(registry, city, now).length, 1);
  assert.equal(canEnter(ultimaX, city, now, false), false);
  assert.throws(() => action(newAccount('A'), { type: 'enter', gameId: ultimaX.id, fix: city }), /Meyermarken/);
  assert.equal(canEnter(ultimaX, city, now, true), true);
  assert.equal(canEnter(ultimaX, { ...fix(), accuracy: 45 }, now, false), false);
  assert.equal(canEnter(ultimaX, { ...fix(), timestamp: now - 31_000 }, now, false), false);
});

test('first journey persists trades, dialogue, discoveries and character across process recreation', async () => {
  const disk = memory(), session = new Session(registry, disk);
  let account = await session.create('Eira');
  const doAction = async (a: Action) => { account = (await session.dispatch(command(account, a))).account; };
  await doAction({ type: 'enter', gameId: ultimaX.id, fix: { ...fix(), timestamp: Date.now() } });
  await doAction({ type: 'discover', encounterId: 'maren' });
  await doAction({ type: 'talk', encounterId: 'maren', topicId: 'iver' });
  await doAction(trade('herebound:rowanberry', 'buy', 2));
  await doAction(trade('ultima-x:garlic', 'buy', 2));
  await doAction(trade('ultima-x:garlic', 'sell'));
  const reloaded = await new Session(registry, disk).load();
  assert.deepEqual(reloaded, account);
  assert.equal(reloaded!.character.credits, 15);
  assert.equal(reloaded!.character.inventory['herebound:rowanberry'], 2);
  assert.equal(reloaded!.character.inventory['ultima-x:garlic'], 1);
  assert.equal(reloaded!.games['ultima-x'].journal[0].id, 'missing-keeper');
  assert.equal(reloaded!.inventoryEvents.length, 3);
  assert.equal(reloaded!.inventoryEvents[0].gameId, 'ultima-x');
});

test('free order: lantern can be first; clue unlocks new dialogue without Maren prerequisite', () => {
  let a = start();
  a = action(a, { type: 'travel', position: ultimaX.encounters.find(e=>e.id==='lantern')!.position });
  a = action(a, { type: 'discover', encounterId: 'lantern' });
  a = action(a, { type: 'talk', encounterId: 'lantern', topicId: 'mark' });
  a = action(a, { type: 'travel', position: ultimaX.encounters.find(e=>e.id==='maren')!.position });
  a = action(a, { type: 'discover', encounterId: 'maren' });
  a = action(a, { type: 'talk', encounterId: 'maren', topicId: 'inscription' });
  assert.deepEqual(a.games['ultima-x'].journal.map(j => j.id), ['lantern-mark', 'memory-key']);
  a = action(a, { type: 'discover', encounterId: 'maren' });
  assert.equal(a.character.xp, 20);
  assert.throws(() => action(shop(), { type: 'talk', encounterId: 'maren', topicId: 'inscription' }), /samtaleemnet/);
});

test('trade invariants: no negative stock, gold, count, remote trades, or duplicate buys', () => {
  const a = shop(), before = JSON.stringify(a);
  for (const request of [trade('ultima-x:staff', 'buy', 9), trade('ultima-x:garlic', 'sell'), trade('missing', 'buy'), trade('ultima-x:garlic', 'buy', -1), trade('ultima-x:garlic', 'buy', NaN)]) assert.throws(() => action(a, request));
  assert.equal(JSON.stringify(a), before);
  const cmd = command(a, trade('ultima-x:garlic', 'buy'));
  const once = applyCommand(a, registry, cmd, now);
  assert.equal(applyCommand(once.account, registry, cmd, now).account, once.account);
  assert.throws(() => applyCommand(once.account, registry, { ...cmd, action: trade('ultima-x:ginseng', 'buy') }, now), /allerede/);
  assert.throws(() => applyCommand(once.account, registry, { ...cmd, id: 'stale' }, now), /oppdatert/);
  const far = action(a, { type: 'travel', position: ultimaX.encounters.find(e=>e.id==='rusk')!.position });
  assert.throws(() => action(far, trade('ultima-x:garlic', 'buy')), /møtestedet/);
  assert.throws(() => action(a, { type: 'travel', position: { latitude: 0, longitude: 0 } }));
  let spend = action(a, trade('ultima-x:staff', 'buy', 2));
  assert.throws(() => action(spend, trade('ultima-x:ginseng', 'buy', 2)), /saldoen/);
});

test('shared inventory survives entering a different game and unloading its original content', () => {
  const brazil: GamePack = { ...ultimaX, id: 'brazil-test', title: 'Brazil', helpers: [], items: [], imports: ['herebound:rowanberry'], encounters: [{ ...ultimaX.encounters.find(e=>e.id==='maren')!, id: 'merchant', topics: [], shop: [{ itemId: 'herebound:rowanberry', buy: 3, sell: 2, quantity: 2 }] }] };
  const both = createRegistry([ultimaX, brazil], sharedItems);
  let a = action(shop(), trade('herebound:rowanberry', 'buy', 2));
  a = action(a, { type: 'travel', position: ultimaX.encounters.find(e=>e.id==='rusk')!.position });
  a = action(a, { type: 'discover', encounterId: 'rusk' });
  a = action(a, { type: 'talk', encounterId: 'rusk', topicId: 'light' });
  a = action(a, { type: 'recruit', encounterId: 'rusk' });
  a = action(a, { type: 'recruit', encounterId: 'rusk' });
  assert.equal(carryCapacity(a), 25_000);
  const original = JSON.stringify(a.games['ultima-x']);
  a = applyCommand(a, both, command(a, { type: 'enter', gameId: brazil.id, fix: fix() }), now).account;
  a = applyCommand(a, both, command(a, { type: 'discover', encounterId: 'merchant' }), now).account;
  a = applyCommand(a, both, command(a, { type: 'trade', encounterId: 'merchant', itemId: 'herebound:rowanberry', direction: 'sell', quantity: 1 }), now).account;
  assert.equal(a.character.inventory['herebound:rowanberry'], 1);
  assert.equal(a.character.credits, 20);
  assert.equal(a.character.helpers['ultima-x:rusk'].name, 'Rusk');
  assert.equal(carryCapacity(a), 25_000);
  assert.equal(JSON.stringify(a.games['ultima-x']), original);
  assert.equal(a.inventoryEvents[1].gameId, brazil.id);
  assert.equal(decodeAccount(JSON.stringify(a)).items['ultima-x:staff'].name, 'Vandrestav');
  assert.equal(createRegistry([]).size, 0);
});

test('strength controls global capacity; overload blocks acquisitions but not sales or travel', () => {
  let a = shop();
  assert.equal(carryCapacity(a), 20_000);
  a.items['ultima-x:staff'].weightGrams = 19_900;
  a = action(a, trade('ultima-x:staff', 'buy'));
  a = action(a, trade('herebound:rowanberry', 'buy'));
  assert.equal(inventoryWeight(a), 20_000);
  assert.throws(() => action(a, trade('ultima-x:garlic', 'buy')), /tung/);
  const stronger = JSON.parse(JSON.stringify(a)) as Account;
  stronger.character.attributes.strength = 11;
  assert.doesNotThrow(() => action(stronger, trade('ultima-x:garlic', 'buy')));
  a.character.attributes.strength = 9;
  assert.doesNotThrow(() => action(a, { type: 'travel', position: ultimaX.encounters.find(e=>e.id==='rusk')!.position }));
  a = action(a, trade('ultima-x:staff', 'sell'));
  assert.equal(inventoryWeight(a), 100);
});

test('failed durable writes never commit a trade; rejected save remains recoverable', async () => {
  const disk = memory(); disk.value = JSON.stringify(shop());
  const session = new Session(registry, disk); const a = (await session.load())!;
  const cmd = command(a, trade('ultima-x:staff', 'buy'));
  disk.fail = true;
  await assert.rejects(session.dispatch(cmd), /Disk full/);
  assert.equal(decodeAccount(disk.value!).character.credits, 20);
  disk.fail = false;
  const result = await session.dispatch(cmd);
  assert.equal(result.account.character.credits, 12);
  assert.equal(result.account.games['ultima-x'].stock[stockKey('maren', 'ultima-x:staff')], 1);
});

test('corrupt and future saves are preserved and cannot be overwritten by a new figure', async () => {
  for (const raw of ['broken', JSON.stringify({ ...shop(), schemaVersion: 99 }), JSON.stringify({ ...shop(), items: {} })]) {
    const disk = memory(); disk.value = raw;
    // Empty item catalogue is valid until inventory exists; use an owned item to expose missing definitions.
    if (raw.includes('"items":{}')) { const value = JSON.parse(raw); value.character.inventory['ultima-x:staff'] = 1; disk.value = JSON.stringify(value); }
    const preserved = disk.value, session = new Session(registry, disk);
    await assert.rejects(session.load(), /bevart/);
    await assert.rejects(session.create('New'), /allerede/);
    assert.equal(disk.value, preserved);
  }
});

test('pack validation rejects unknown shared IDs, duplicate definitions, and distant entrances', () => {
  assert.doesNotThrow(() => createRegistry([ultimaX], sharedItems));
  assert.throws(() => createRegistry([ultimaX]));
  assert.throws(() => createRegistry([ultimaX, ultimaX], sharedItems));
  assert.throws(() => createRegistry([{ ...ultimaX, start: { ...ultimaX.start, position: { latitude: 0, longitude: 0 } } }], sharedItems));
  assert.throws(() => createRegistry([{ ...ultimaX, items: [{ ...ultimaX.items[0], weightGrams: -1 }] }], sharedItems));
});

test('architecture: engine has no game/host imports; only host composition root imports concrete games', () => {
  for (const file of readdirSync('packages/herebound-sdk').filter(f => /\.tsx?$/.test(f))) {
    const code = readFileSync(`packages/herebound-sdk/${file}`, 'utf8');
    assert.doesNotMatch(code, /from ['"][^'"]*(?:games\/|apps\/|ultima|arena|trakk)/i);
  }
  for (const file of readdirSync('apps/herebound').filter(f => /\.tsx?$/.test(f) && f !== 'registry.ts')) {
    assert.doesNotMatch(readFileSync(`apps/herebound/${file}`, 'utf8'), /from ['"][^'"]*games\//);
  }
});
