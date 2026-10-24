import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gatekampenCatalogue, seasonScores } from '../apps/gatekampen/rules';
import { command, newWorld } from '../apps/arena/world';
test('Gatekampen removes same-name stair fragments before grouping and counts only season members once per street', () => {
  const way = (id: number, highway: string) => ({ type: 'way', id, tags: { highway, name: 'Gaten' }, geometry: [{ lat: 60, lon: 5 + id * .001 }, { lat: 60.001, lon: 5 + id * .001 }] });
  const streets = gatekampenCatalogue({ elements: [way(1, 'residential'), way(2, 'steps'), way(3, 'footway')] }, 100, 'test');
  assert.equal(streets.length, 1); assert.ok(streets[0].streetPaths!.flat().every(p => p.longitude < 5.002));
  const season = { id: 's', startsAt: 100, endsAt: 200, streetIds: ['a'], playerIds: ['p', 'q'] };
  const completion = { playerId: 'p', streetId: 'a', completedAt: 100, evidenceId: 'proof' };
  const scores = seasonScores(season, [completion, completion, { ...completion, playerId: 'outsider' }, { ...completion, playerId: 'q', completedAt: 200 }]);
  assert.deepEqual(scores, [{ playerId: 'p', streets: 1, total: 1 }, { playerId: 'q', streets: 0, total: 1 }]);
});
test('adventure trades require both participants, are atomic and cannot duplicate goods on retry', () => {
  let w = newWorld(['a', 'b', 'c']);
  w = command(w, 'a', 'offer', w.version, { type: 'offer', tradeId: 't', to: 'b', give: { birch: 1 }, receive: { heather: 1 } });
  w = command(w, 'a', 'yes-a', w.version, { type: 'accept', tradeId: 't' });
  assert.equal(w.players.a.inventory.birch, 1);
  assert.throws(() => command(w, 'c', 'intrude', w.version, { type: 'accept', tradeId: 't' }));
  const before = w;
  w = command(w, 'b', 'yes-b', w.version, { type: 'accept', tradeId: 't' });
  assert.equal(w.players.b.inventory.birch, 2); assert.equal(w.players.a.inventory.heather, 2);
  assert.equal(before.players.b.inventory.birch, 1);
  assert.equal(command(w, 'b', 'yes-b', before.version, { type: 'accept', tradeId: 't' }), w);
  assert.throws(() => command(w, 'a', 'stale', 0, { type: 'craft', recipe: 'echo' }));
  assert.throws(() => command(w, 'a', 'book', w.version, { type: 'offer', tradeId: 'book', to: 'b', give: { journal: 1 }, receive: {} }));
});
test('solo and shared lanterns advance each personal story without consuming someone else’s discovery', () => {
  let w = newWorld(['a', 'b']);
  for (const actor of ['a', 'b']) {
    w = command(w, actor, 'learn', w.version, { type: 'learn', keyword: 'iver' });
    w = command(w, actor, 'mix', w.version, { type: 'craft', recipe: 'light' });
    w = command(w, actor, 'lantern', w.version, { type: 'light-lantern' });
  }
  assert.equal(w.lanternLit, true); assert.deepEqual(w.lanternContributors, ['a', 'b']);
  assert.equal(w.players.a.chapter, 1); assert.equal(w.players.b.chapter, 1);
  assert.equal(w.namespace, 'simulation');
  assert.throws(() => command(w, 'a', 'again', w.version, { type: 'light-lantern' }));
});

import { progressCharacter, characterPower, floeyen } from '../apps/arena/scenario';
test('persistent character growth deduplicates server events, bounds daily walking XP, and unlocks local spells', () => {
  let p = { xp: 0, eventIds: [] as string[], walkingMinutesByDay: {} as Record<string, number> };
  const event = { id: 'proof-1', day: '2026-10-24', kind: 'walking' as const, minutes: 60 };
  p = progressCharacter(p, event); assert.equal(p.xp, 120);
  assert.equal(progressCharacter(p, event), p);
  p = progressCharacter(p, { ...event, id: 'proof-2', minutes: 120 }); assert.equal(p.xp, 240);
  p = progressCharacter(p, { ...event, id: 'proof-3' }); assert.equal(p.xp, 240);
  p = progressCharacter(p, { id: 'order-1', day: '2026-10-24', kind: 'order', tier: 2 }); assert.equal(p.xp, 280);
  assert.ok(characterPower(p.xp).magic > characterPower(0).magic);
  assert.ok(floeyen.abilities.some(a => a.kind === 'spell' && a.minimumLevel <= characterPower(p.xp).level));
  assert.throws(() => progressCharacter(p, { ...event, id: 'bad', minutes: NaN }));
});

import { gamesNear, firstGame } from '../apps/arena/catalogue';
test('platform discovers nearby published adventures without treating a regional hit as an arrival or publishing the prototype', () => {
  assert.equal(gamesNear([firstGame], firstGame.center).length, 0);
  assert.equal(gamesNear([firstGame], firstGame.center, true).length, 1);
  const published = { ...firstGame, status: 'published' as const };
  assert.equal(gamesNear([published], firstGame.center).length, 1);
  assert.equal(gamesNear([published], { latitude: 59.9, longitude: 10.75 }).length, 0);
  assert.equal(gamesNear([published], null).length, 0);
});

import { enterAdventure, type AdventureAccount } from '../apps/arena/character';
test('entering a different region/theme preserves every spell, recipe, item and experience point', () => {
  const account: AdventureAccount = { character: { id: 'hero', name: 'Helge', xp: 12000, spells: ['floeyen:west-wind', 'coast:tide'], recipes: ['rain-brew'], inventory: { staff: 1, gold: 500, blueberry: 20 }, equipment: ['staff'] }, currentGame: 'floeyen-01', journals: { 'floeyen-01': { chapter: 2, clues: ['iver'], choices: { lantern: 'remember' } } } };
  const coast = enterAdventure(account, 'coast-01');
  assert.equal(coast.character, account.character);
  assert.deepEqual(coast.journals['floeyen-01'], account.journals['floeyen-01']);
  assert.equal(coast.journals['coast-01'].chapter, 0);
  const returned = enterAdventure(coast, 'floeyen-01');
  assert.equal(returned.character.xp, 12000); assert.equal(returned.journals['floeyen-01'].chapter, 2);
  assert.deepEqual(returned.character, account.character);
});

import { startBattle, battleAction, type Fighter } from '../apps/arena/battle';
test('tactical PvE respects turns, range, shared protection, mana/potions, and exactly-once actions', () => {
  const fighter = (id: string, side: Fighter['side'], x: number, y: number): Fighter => ({ id, side, x, y, hp: 10, attack: 4, mana: 3, maxMana: 9, guard: false, potions: 1, spells: ['rowan-ward', 'west-wind'] });
  let b = startBattle([fighter('a', 'party', 0, 0), fighter('b', 'party', 0, 1)], [fighter('fog', 'foe', 0, 2)]);
  assert.throws(() => battleAction(b, 'b', 'early', 0, { type: 'guard' }), /Ikke din tur/);
  assert.throws(() => battleAction(b, 'a', 'far', 0, { type: 'attack', target: 'fog' }), /rekkevidde/);
  b = battleAction(b, 'a', 'ward', 0, { type: 'cast', spell: 'rowan-ward', target: 'b' });
  assert.equal(b.fighters[0].mana, 0);
  b = battleAction(b, 'b', 'hit', b.version, { type: 'attack', target: 'fog' });
  assert.equal(b.fighters[1].hp, 9); // 4 damage minus 3 protection.
  b = battleAction(b, 'a', 'drink', b.version, { type: 'potion' });
  assert.equal(b.fighters[0].mana, 6); assert.equal(b.fighters[0].potions, 0);
  b = battleAction(b, 'b', 'wind', b.version, { type: 'cast', spell: 'west-wind', target: 'fog' });
  assert.equal(b.outcome, 'won');
  assert.equal(battleAction(b, 'b', 'wind', 0, { type: 'cast', spell: 'west-wind', target: 'fog' }), b);
  assert.throws(() => battleAction(b, 'a', 'extra', b.version, { type: 'guard' }));
});

import { validateGameManifest } from '../apps/arena/manifest';
test('creator game packages have a hard 5 km radius and cannot place encounter zones beyond the boundary', () => {
  const game = { id: 'floeyen', creatorId: 'studio', formatVersion: 1, kind: 'roleplaying', area: { center: { latitude: 60.3943, longitude: 5.3433 }, radiusMeters: 5000 }, encounters: [{ id: 'lantern', area: { center: { latitude: 60.3943, longitude: 5.3433 }, radiusMeters: 50 } }] };
  assert.equal(validateGameManifest(game), true);
  assert.equal(validateGameManifest({ ...game, area: { ...game.area, radiusMeters: 5001 } }), false);
  assert.equal(validateGameManifest({ ...game, area: { ...game.area, radiusMeters: 0 } }), false);
  assert.equal(validateGameManifest({ ...game, encounters: [{ id: 'outside', area: { center: { latitude: 60.4343, longitude: 5.3433 }, radiusMeters: 1000 } }] }), false);
  assert.equal(validateGameManifest({ ...game, encounters: [...game.encounters, ...game.encounters] }), false);
  assert.equal(validateGameManifest({ ...game, area: { center: { latitude: NaN, longitude: 5 }, radiusMeters: 1000 } }), false);
});
