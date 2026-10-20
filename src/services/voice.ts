import { localizeSpeech } from '../domain/dialect';
import { offerWorkoutVoice } from './workoutCoach';
import * as Speech from 'expo-speech';
import { getStore } from '../data/native';
export async function speak(text: string, tripId?: string, kind: 'ghost' | 'event' = 'event') {
  try {
    const dialect = getStore().setting<'bergen' | 'neutral'>('localDialect', 'neutral');
    text = localizeSpeech(text, dialect);
    if (tripId) { const active = getStore().active(); if (active?.id !== tripId || !active.audioEnabled) return; if (await offerWorkoutVoice(text, kind)) return; }
    const voices = (await Speech.getAvailableVoicesAsync()).filter(v => /^(nb|nn|no)/.test(v.language));
    const voice = voices.find(v => !/network/i.test(v.identifier)) ?? voices[0];
    if (tripId) { const active = getStore().active(); if (active?.id !== tripId || !active.audioEnabled) return; }
    Speech.speak(text, { language: voice?.language ?? 'nb-NO', voice: voice?.identifier, rate: 1.02, pitch: 1.04,
      onError: () => getStore().setSetting('audioError', 'Tale kunne ikke spilles av. Kontroller taleinnstillingene på mobilen.') });
  } catch { getStore().setSetting('audioError', 'Kunne ikke laste stemmen fra mobilen.'); }
}
