/** A small turn-based PvE model for the simulator. Grid moves are screen
 * actions, never instructions to walk physical steps around other people. */
export type Fighter = { id: string; side: 'party' | 'foe'; x: number; y: number; hp: number; attack: number; mana: number; maxMana: number; guard: boolean; potions: number; spells: string[] };
export type Battle = { version: number; fighters: Fighter[]; turn: string; outcome: 'ongoing' | 'won' | 'retreated' | 'lost'; commands: Record<string, string> };
export type BattleAction = { type: 'move'; x: number; y: number } | { type: 'attack'; target: string } | { type: 'guard' } | { type: 'potion' } | { type: 'cast'; spell: 'rowan-ward' | 'west-wind'; target: string } | { type: 'retreat' };
const range = (a: Fighter, b: { x: number; y: number }) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const damage = (who: Fighter, n: number) => { who.hp = Math.max(0, who.hp - Math.max(0, n - (who.guard ? 3 : 0))); who.guard = false; };
export function startBattle(party: Fighter[], foes: Fighter[]): Battle {
  const all = [...party, ...foes];
  if (!party.length || !foes.length || party.some(f => f.side !== 'party') || foes.some(f => f.side !== 'foe') || new Set(all.map(f => f.id)).size !== all.length || new Set(all.map(f => `${f.x}:${f.y}`)).size !== all.length || all.some(f => !/^[a-z0-9-]+$/i.test(f.id) || !Number.isSafeInteger(f.x) || !Number.isSafeInteger(f.y) || f.x < 0 || f.y < 0 || f.x > 4 || f.y > 4 || ![f.hp, f.attack, f.mana, f.maxMana, f.potions].every(Number.isSafeInteger) || f.hp <= 0 || f.attack < 1 || f.mana < 0 || f.mana > f.maxMana || f.potions < 0)) throw new Error('Ugyldig møte');
  return { version: 0, fighters: structuredClone(all), turn: party[0].id, outcome: 'ongoing', commands: {} };
}
export function battleAction(state: Battle, actor: string, commandId: string, expectedVersion: number, action: BattleAction): Battle {
  if (!/^[a-z0-9-]{1,80}$/i.test(commandId)) throw new Error('Ugyldig kommando');
  const key = `${actor}:${commandId}`, body = JSON.stringify(action);
  if (state.commands[key]) { if (state.commands[key] !== body) throw new Error('Kommando-id brukt'); return state; }
  if (state.version !== expectedVersion || state.outcome !== 'ongoing' || state.turn !== actor) throw new Error('Ikke din tur');
  const next = structuredClone(state), hero = next.fighters.find(f => f.id === actor && f.side === 'party' && f.hp > 0);
  if (!hero) throw new Error('Ingen aktiv figur');
  const target = 'target' in action ? next.fighters.find(f => f.id === action.target && f.hp > 0) : undefined;
  if (action.type === 'move') {
    if (!Number.isSafeInteger(action.x) || !Number.isSafeInteger(action.y) || action.x < 0 || action.y < 0 || action.x > 4 || action.y > 4 || range(hero, action) !== 1 || next.fighters.some(f => f.hp > 0 && f.x === action.x && f.y === action.y)) throw new Error('Ugyldig plassering');
    hero.x = action.x; hero.y = action.y;
  } else if (action.type === 'attack') {
    if (!target || target.side !== 'foe' || range(hero, target) !== 1) throw new Error('Fienden er utenfor rekkevidde');
    damage(target, hero.attack);
  } else if (action.type === 'guard') hero.guard = true;
  else if (action.type === 'potion') {
    if (hero.potions < 1 || hero.mana >= hero.maxMana) throw new Error('Kan ikke bruke Bygebrygg');
    hero.potions--; hero.mana = Math.min(hero.maxMana, hero.mana + 6);
  } else if (action.type === 'cast') {
    if (!hero.spells.includes(action.spell) || !target || range(hero, target) > 3 || hero.mana < 3) throw new Error('Formelen kan ikke brukes');
    if (action.spell === 'rowan-ward' && target.side === 'party') target.guard = true;
    else if (action.spell === 'west-wind' && target.side === 'foe') damage(target, hero.attack + 2);
    else throw new Error('Ugyldig mål');
    hero.mana -= 3;
  } else if (action.type === 'retreat') next.outcome = 'retreated';
  else throw new Error('Ukjent handling');
  if (!next.fighters.some(f => f.side === 'foe' && f.hp > 0)) next.outcome = 'won';
  if (next.outcome === 'ongoing') {
    const heroes = next.fighters.filter(f => f.side === 'party' && f.hp > 0), index = heroes.findIndex(f => f.id === actor);
    if (index < heroes.length - 1) next.turn = heroes[index + 1].id;
    else {
      for (const foe of next.fighters.filter(f => f.side === 'foe' && f.hp > 0)) {
        const victim = heroes.filter(f => f.hp > 0).sort((a, b) => range(foe, a) - range(foe, b))[0];
        if (!victim) break;
        if (range(foe, victim) === 1) damage(victim, foe.attack);
        else {
          const options = [{ x: foe.x + Math.sign(victim.x - foe.x), y: foe.y }, { x: foe.x, y: foe.y + Math.sign(victim.y - foe.y) }];
          const step = options.find(p => range(foe, p) === 1 && !next.fighters.some(f => f.hp > 0 && f.x === p.x && f.y === p.y));
          if (step) { foe.x = step.x; foe.y = step.y; }
        }
      }
      const survivor = heroes.find(f => f.hp > 0); if (survivor) next.turn = survivor.id; else next.outcome = 'lost';
    }
  }
  next.commands[key] = body; next.version++; return next;
}
