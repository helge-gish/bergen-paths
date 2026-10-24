import * as Location from 'expo-location';
import { getStore } from '../data/native';
import { natureArea, needsAreaConsent } from '../domain/natureArea';
import { freshPosition, type MapPosition } from '../domain/position';
import type { HomeArea } from '../domain/areas';
export function stageAreaConsent(position: MapPosition): boolean {
  const store = getStore(), area = store.setting<HomeArea | null>('activeNatureArea', null);
  if (!freshPosition(position) || !needsAreaConsent(area, position)) return false;
  store.setSetting('pendingNatureArea', natureArea(null, position));
  store.setSetting('lastMapPosition', position);
  store.setSetting('automaticRecording', 'paused');
  return true;
}
export async function currentAreaPosition(): Promise<MapPosition> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const p = await Promise.race([Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Finner ikke fersk GPS. Gå under åpen himmel og prøv igjen.')), 15000); })]);
    const position = { latitude: p.coords.latitude, longitude: p.coords.longitude, timestamp: p.timestamp, accuracy: p.coords.accuracy ?? 999 };
    if (!freshPosition(position)) throw new Error('GPS-posisjonen er for usikker. Prøv igjen under åpen himmel.');
    return position;
  } finally { clearTimeout(timer); }
}
export async function approveAreaHere() {
  const p = await currentAreaPosition(), store = getStore();
  store.setSetting('activeNatureArea', natureArea(null, p));
  store.setSetting('pendingNatureArea', null);
  store.setSetting('lastMapPosition', p);
  return p;
}
