/** Herebound contract 0.1: deliberately small, local and declarative.
 * No game IDs, geography, item names or story rules belong in this package. */
export type Point = { latitude: number; longitude: number };
export type Area = { center: Point; radiusMeters: number };
export type PositionFix = Point & { accuracy: number; timestamp: number; source: 'gps' | 'simulation' };
export type EquipSlot = 'hand' | 'back' | 'charm';
export type Appearance = { body: 'woman' | 'man'; skin: 'light' | 'warm' | 'deep'; hair: 'dark' | 'copper' | 'silver'; hairStyle: 'short' | 'swept' | 'braids' };
export type Skin = { id: string; name: string; description: string; style: 'forest' | 'storm' | 'ember'; minLevel: number; source: 'level' | 'shop' | 'adventure'; price?: number };
export type Item = { id: string; name: string; description: string; weightGrams: number; kind: 'ingredient' | 'equipment' | 'potion'; wearable?: { slot: EquipSlot; visual: 'staff' | 'satchel' | 'lantern'; minLevel?: number } };
export type Helper = { id: string; name: string; description: string; carryGrams: number };
export type Topic = { id: string; label: string; text: string; requires?: string; clue?: { id: string; title: string; text: string } };
export type Stock = { itemId: string; buy: number; sell: number; quantity: number };
export type Encounter = {
  id: string; name: string; rumor: string; kind: 'merchant' | 'person' | 'landmark';
  position: Point; radiusMeters: number; description: string; greeting: string;
  mapLabel?: string; visual?: 'lantern' | 'sprite' | 'merchant' | 'berries' | 'satchel';
  interaction?: { id: string; label: string; requires?: string; costs: { itemId: string; amount: number }[]; reward?: { itemId: string; amount: number }; clue: { id: string; title: string; text: string }; xp: number; skinReward?: string };
  topics: Topic[]; shop?: Stock[]; recruit?: { helperId: string; requires?: string };
};
export type GamePack = {
  sdkVersion: 1; id: string; version: number; title: string; subtitle: string;
  description: string; areaName: string; area: Area; spawn: Point;
  mapTheme?: 'standard' | 'parchment';
  start: { name: string; position: Point; radiusMeters: number; presentation?: { motif: 'rune-gate' | 'beacon' | 'camp'; accent: string; label: string } };
  currency?: { name: string; unitsPerCredit: number };
  skins?: Skin[];
  simulationOnly: boolean; items: Item[]; helpers: Helper[]; imports: string[]; encounters: Encounter[];
};
export type GameRegistry = ReadonlyMap<string, GamePack> & { readonly items: ReadonlyMap<string, Item>; readonly skins: ReadonlyMap<string, Skin> };
export type Attributes = { strength: number; dexterity: number; constitution: number; intelligence: number; wisdom: number; charisma: number };
export type Character = { appearance: Appearance; equipment: Partial<Record<EquipSlot, string>>; ownedSkins: Record<string, true>; skin: string | null; xpClaims: Record<string, true>; name: string; level: number; xp: number; credits: number; attributes: Attributes; inventory: Record<string, number>; helpers: Record<string, Helper> };
export type JournalEntry = { id: string; title: string; text: string };
export type GameProgress = { packVersion: number; position: Point; discovered: string[]; journal: JournalEntry[]; stock: Record<string, number>; visits: number; revealed?: Record<string, true>; lastObservedAt?: number };
export type Account = {
  activeMode?: 'simulation' | 'field'; fieldGames?: Record<string, GameProgress>;
  schemaVersion: 1; namespace: 'local-test'; revision: number; currentGame: string | null;
  skins?: Record<string, Skin>; character: Character; items: Record<string, Item>; inventoryEvents: { commandId: string; gameId: string; itemId: string; delta: number }[]; games: Record<string, GameProgress>;
  receipts: Record<string, { fingerprint: string; message: string }>;
};
export type Action =
  | { type: 'appearance'; appearance: Appearance }
  | { type: 'equip'; slot: EquipSlot; itemId: string | null }
  | { type: 'wear-skin'; skinId: string | null }
  | { type: 'buy-skin'; skinId: string }
  | { type: 'enter'; gameId: string; fix: PositionFix; mode?: 'simulation' | 'field' }
  | { type: 'leave' }
  | { type: 'abandon'; gameId: string }
  | { type: 'observe' }
  | { type: 'interact'; encounterId: string }
  | { type: 'travel'; position: Point }
  | { type: 'discover'; encounterId: string }
  | { type: 'recruit'; encounterId: string }
  | { type: 'talk'; encounterId: string; topicId: string }
  | { type: 'trade'; encounterId: string; itemId: string; direction: 'buy' | 'sell'; quantity: number };
export type Command = { id: string; expectedRevision: number; action: Action };
export type Snapshot = { account: Account; message: string };
export interface Persistence { read(): Promise<string | null>; write(value: string): Promise<void>; }
