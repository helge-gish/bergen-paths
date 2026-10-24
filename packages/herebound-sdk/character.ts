import type { Account, Appearance, EquipSlot, GameRegistry, Skin } from './types';
export const DEFAULT_APPEARANCE: Appearance = { body: 'woman', skin: 'warm', hair: 'dark', hairStyle: 'swept' };
export const EQUIP_SLOTS: EquipSlot[] = ['hand', 'back', 'charm'];
export const xpForLevel = (level: number) => 15 * (level - 1) * level;
export function levelForXp(xp: number) { return Math.min(50, Math.floor((1 + Math.sqrt(1 + 4 * Math.max(0, xp) / 15)) / 2)); }
export function levelProgress(xp: number) {
  const level = levelForXp(xp), start = xpForLevel(level), end = level === 50 ? null : xpForLevel(level + 1);
  return { level, start, end, earned: xp - start, needed: end === null ? 0 : end - xp, fraction: end === null ? 1 : (xp - start) / (end - start) };
}
export function validAppearance(a: unknown): a is Appearance {
  const v = a as Appearance | undefined;
  return !!v && ['woman','man'].includes(v.body) && ['light','warm','deep'].includes(v.skin) && ['dark','copper','silver'].includes(v.hair) && ['short','swept','braids'].includes(v.hairStyle);
}
export function validSkin(s: Skin) {
  return !!s && !['constructor','prototype'].includes(s.id) && /^[a-z][a-z0-9:-]{0,79}$/.test(s.id) && !!s.name?.trim() && !!s.description?.trim() && ['forest','storm','ember'].includes(s.style) && Number.isInteger(s.minLevel) && s.minLevel >= 1 && s.minLevel <= 50 && ['level','shop','adventure'].includes(s.source) && (s.source !== 'shop' || (Number.isSafeInteger(s.price) && s.price! > 0 && s.price! <= 1_000_000));
}
/** Save migration preserves existing XP. The ledger prevents re-awards across modes. */
export function migrateCharacter(a: Account) {
  const c = a.character;
  c.appearance ??= { ...DEFAULT_APPEARANCE }; c.equipment ??= {}; c.ownedSkins ??= {}; c.skin ??= null;
  if (!c.xpClaims) {
    c.xpClaims = {};
    for (const [game, p] of [...Object.entries(a.games), ...Object.entries(a.fieldGames ?? {})]) {
      for (const encounter of p.discovered) c.xpClaims[`${game}/discover/${encounter}`] = true;
      // Completed interaction clues are reconciled against the loaded registry below.
    }
  }
  c.level = levelForXp(c.xp);
}
/** Reconciles newly supported presentation and earned rewards without repeating XP. */
export function prepareCharacter(a: Account, registry: GameRegistry) {
  migrateCharacter(a); a.skins ??= {};
  for (const item of registry.items.values()) a.items[item.id] = { ...item, ...a.items[item.id], ...(item.wearable ? { wearable: { ...item.wearable } } : {}) };
  for (const skin of registry.skins.values()) a.skins[skin.id] = { ...skin };
  for (const pack of registry.values()) for (const e of pack.encounters) if (e.interaction) {
    const complete = [a.games[pack.id], a.fieldGames?.[pack.id]].some(p => p?.journal.some(j => j.id === e.interaction!.clue.id));
    if (complete) {
      a.character.xpClaims[`${pack.id}/interact/${e.id}`] = true;
      if (e.interaction.skinReward) a.character.ownedSkins[e.interaction.skinReward] = true;
    }
  }
  for (const skin of Object.values(a.skins)) if (skin.source === 'level' && a.character.level >= skin.minLevel) a.character.ownedSkins[skin.id] = true;
  for (const slot of EQUIP_SLOTS) {
    const item = a.character.equipment[slot];
    if (item && !(a.character.inventory[item] > 0)) delete a.character.equipment[slot];
  }
}
export function awardXp(a: Account, key: string, amount: number) {
  if (a.character.xpClaims[key]) return;
  a.character.xpClaims[key] = true;
  a.character.xp = Math.min(1_000_000, a.character.xp + amount);
  a.character.level = levelForXp(a.character.xp);
}
