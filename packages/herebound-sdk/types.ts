/** Herebound contract 0.1: deliberately small, local and declarative.
 * No game IDs, geography, item names or story rules belong in this package. */
export type Point = { latitude: number; longitude: number };
export type Area = { center: Point; radiusMeters: number };
export type PositionFix = Point & { accuracy: number; timestamp: number; source: 'gps' | 'simulation' };
export type Item = { id: string; name: string; description: string; weightGrams: number; kind: 'ingredient' | 'equipment' | 'potion' };
export type Helper = { id: string; name: string; description: string; carryGrams: number };
export type Topic = { id: string; label: string; text: string; requires?: string; clue?: { id: string; title: string; text: string } };
export type Stock = { itemId: string; buy: number; sell: number; quantity: number };
export type Encounter = {
  id: string; name: string; rumor: string; kind: 'merchant' | 'person' | 'landmark';
  position: Point; radiusMeters: number; description: string; greeting: string;
  topics: Topic[]; shop?: Stock[]; recruit?: { helperId: string; requires?: string };
};
export type GamePack = {
  sdkVersion: 1; id: string; version: number; title: string; subtitle: string;
  description: string; areaName: string; area: Area; spawn: Point;
  start: { name: string; position: Point; radiusMeters: number };
  simulationOnly: boolean; items: Item[]; helpers: Helper[]; imports: string[]; encounters: Encounter[];
};
export type GameRegistry = ReadonlyMap<string, GamePack> & { readonly items: ReadonlyMap<string, Item> };
export type Attributes = { strength: number; dexterity: number; constitution: number; intelligence: number; wisdom: number; charisma: number };
export type Character = { name: string; level: number; xp: number; gold: number; attributes: Attributes; inventory: Record<string, number>; helpers: Record<string, Helper> };
export type JournalEntry = { id: string; title: string; text: string };
export type GameProgress = { packVersion: number; position: Point; discovered: string[]; journal: JournalEntry[]; stock: Record<string, number>; visits: number };
export type Account = {
  schemaVersion: 1; namespace: 'local-test'; revision: number; currentGame: string | null;
  character: Character; items: Record<string, Item>; inventoryEvents: { commandId: string; gameId: string; itemId: string; delta: number }[]; games: Record<string, GameProgress>;
  receipts: Record<string, { fingerprint: string; message: string }>;
};
export type Action =
  | { type: 'enter'; gameId: string; fix: PositionFix }
  | { type: 'leave' }
  | { type: 'travel'; position: Point }
  | { type: 'discover'; encounterId: string }
  | { type: 'recruit'; encounterId: string }
  | { type: 'talk'; encounterId: string; topicId: string }
  | { type: 'trade'; encounterId: string; itemId: string; direction: 'buy' | 'sell'; quantity: number };
export type Command = { id: string; expectedRevision: number; action: Action };
export type Snapshot = { account: Account; message: string };
export interface Persistence { read(): Promise<string | null>; write(value: string): Promise<void>; }
