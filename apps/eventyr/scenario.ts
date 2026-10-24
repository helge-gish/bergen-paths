export type ScenarioPack = {
  id: string; version: number; title: string; locale: string;
  mode: 'cooperative'; combat: 'turn-based-pve' | 'none';
  ingredients: { id: string; name: string; inspiration: string }[];
  abilities: { id: string; name: string; kind: 'potion' | 'spell'; minimumLevel: number; effect: string }[];
};
export const floeyen: ScenarioPack = {
  id: 'bergen-floeyen-lanterns', version: 1, title: 'Lyktene under Fløyen', locale: 'nb-NO', mode: 'cooperative', combat: 'turn-based-pve',
  ingredients: [
    { id: 'blueberry', name: 'Blåbærminne', inspiration: 'Blåbær' }, { id: 'birch', name: 'Bjørkesølv', inspiration: 'Bjørk' },
    { id: 'heather', name: 'Lyngglød', inspiration: 'Røsslyng' }, { id: 'spruce', name: 'Grangnist', inspiration: 'Gran' },
    { id: 'rowan', name: 'Rognperle', inspiration: 'Rogn' }, { id: 'juniper', name: 'Einerduft', inspiration: 'Einer' },
  ],
  abilities: [
    { id: 'mist-sight', name: 'Tåkesyn', kind: 'potion', minimumLevel: 1, effect: 'reveal-clue' },
    { id: 'rain-brew', name: 'Bygebrygg', kind: 'potion', minimumLevel: 1, effect: 'restore-magic' },
    { id: 'heather-light', name: 'Lyngglød', kind: 'spell', minimumLevel: 1, effect: 'light' },
    { id: 'rowan-ward', name: 'Rognvern', kind: 'spell', minimumLevel: 2, effect: 'protect-ally' },
    { id: 'west-wind', name: 'Vestavind', kind: 'spell', minimumLevel: 3, effect: 'disrupt' },
  ],
};
// These are content definitions, not a live combat engine. Verified events are
// supplied by the server; a phone's request cannot award its own XP.
export type Progression = { xp: number; eventIds: string[]; walkingMinutesByDay: Record<string, number> };
export type VerifiedProgressEvent = { id: string; day: string; kind: 'walking'; minutes: number } | { id: string; day: string; kind: 'order' | 'encounter'; tier: 1 | 2 | 3 };
export function progressCharacter(progress: Progression, event: VerifiedProgressEvent): Progression {
  if (!event.id || !/^\d{4}-\d{2}-\d{2}$/.test(event.day)) throw new Error('Ugyldig hendelse');
  if (progress.eventIds.includes(event.id)) return progress;
  const next = structuredClone(progress);
  if (event.kind === 'walking') {
    if (!Number.isFinite(event.minutes) || event.minutes < 0 || event.minutes > 480) throw new Error('Ugyldig gåtid');
    const previous = next.walkingMinutesByDay[event.day] ?? 0;
    const counted = Math.min(event.minutes, Math.max(0, 120 - previous));
    next.walkingMinutesByDay[event.day] = previous + counted;
    next.xp += Math.floor(counted * 2);
  } else {
    if (![1, 2, 3].includes(event.tier)) throw new Error('Ugyldig utfordring');
    next.xp += event.tier * 20;
  }
  next.eventIds.push(event.id); return next;
}
export function characterPower(xp: number) {
  if (!Number.isFinite(xp) || xp < 0) throw new Error('Ugyldig erfaring');
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  return { level, magic: 10 + (level - 1) * 3, protection: 2 + level, nextLevelAt: level * level * 100 };
}
