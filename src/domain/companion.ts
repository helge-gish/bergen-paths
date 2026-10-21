// Stable item/slot IDs for future assembly. Unlocks use earned levels only;
// there are no purchases, social identities or location sharing in this model.
export const companionEquipment = [
  { id: 'walking-boots', slot: 'feet', level: 1, name: 'Tursko' },
  { id: 'trail-cap', slot: 'head', level: 2, name: 'Caps' },
  { id: 'daypack', slot: 'back', level: 3, name: 'Ryggsekk' },
  { id: 'walking-stick', slot: 'hand', level: 5, name: 'Turstav' },
  { id: 'gold-pin', slot: 'badge', level: 8, name: 'Gullmerke' },
] as const;
export const companionRanks = [
  { level: 1, name: 'Nysgjerrig vandrer' },
  { level: 2, name: 'Nabolagsvandrer' },
  { level: 3, name: 'Stifinner' },
  { level: 5, name: 'Turvenn' },
  { level: 8, name: 'Lokalhelt' },
];
export function companionVariant(saved: unknown): 'male' | 'female' {
  return saved === 'male' ? 'male' : 'female';
}
