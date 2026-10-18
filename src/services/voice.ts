import * as Speech from 'expo-speech';
import { getStore } from '../data/native';
export async function speak(text: string, tripId?: string) {
  try {
    const selected = getStore().setting<string | null>('voiceId', null);
    const voices = await Speech.getAvailableVoicesAsync();
    const voice = voices.find(v => v.identifier === selected) ?? voices.find(v => /^nb|^nn|^no/.test(v.language));
    if (tripId) { const active = getStore().active(); if (active?.id !== tripId || !active.audioEnabled) return; }
    Speech.speak(text, { language: voice?.language ?? 'nb-NO', voice: voice?.identifier, rate: .95,
      onError: () => getStore().setSetting('audioError', 'Tale kunne ikke spilles av. Kontroller taleinnstillingene på mobilen.') });
  } catch { getStore().setSetting('audioError', 'Kunne ikke laste stemmen fra mobilen.'); }
}
