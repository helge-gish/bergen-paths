export type Character = { id: string; name: string; xp: number; spells: string[]; recipes: string[]; inventory: Record<string, number>; equipment: string[] };
export type GameJournal = { chapter: number; clues: string[]; choices: Record<string, string> };
export type AdventureAccount = { character: Character; currentGame: string | null; journals: Record<string, GameJournal> };
/** Discovery/entry changes the current adventure, never the character's power
 * or possessions. Geography is validated at the API boundary, not by this reducer. */
export function enterAdventure(account: AdventureAccount, gameId: string): AdventureAccount {
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(gameId) || ['constructor', 'prototype'].includes(gameId)) throw new Error('Ugyldig spill');
  return { ...account, currentGame: gameId, journals: Object.hasOwn(account.journals, gameId) ? account.journals : { ...account.journals, [gameId]: { chapter: 0, clues: [], choices: {} } } };
}
