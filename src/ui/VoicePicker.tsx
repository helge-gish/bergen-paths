import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import { getStore } from '../data/native';
import { speak } from '../services/voice';
import { Button } from './components';
import { styles as s } from './theme';
export function VoicePicker() {
  const [voices, setVoices] = useState<Speech.Voice[]>([]);
  const [selected, setSelected] = useState(getStore().setting<string | null>('voiceId', null));
  const [status, setStatus] = useState('Laster stemmene på mobilen …');
  useEffect(() => { let mounted = true; Speech.getAvailableVoicesAsync().then(all => { if (mounted) { const norwegian = all.filter(v => /^nb|^nn|^no/.test(v.language)); setVoices(norwegian); setStatus(norwegian.length ? '' : 'Ingen norsk stemme funnet. Installer norsk i mobilens tekst-til-tale-innstillinger.'); } }).catch(() => { if (mounted) setStatus('Kunne ikke hente stemmene fra mobilen.'); }); return () => { mounted = false; }; }, []);
  return <View style={{ gap: 12 }}><Text style={s.subheading}>Turstemmen</Text><Text style={s.small}>Bergensk ordlyd. Uttalen følger stemmen du velger på mobilen; en egen Sandviken-stemme er ikke inkludert.</Text>{status ? <Text style={s.small}>{status}</Text> : null}
    {voices.map(v => <Button key={v.identifier} secondary title={`${selected === v.identifier ? '✓ ' : ''}${v.name} · ${v.language}`} onPress={() => { getStore().setSetting('voiceId', v.identifier); setSelected(v.identifier); void Speech.stop().then(() => speak('Heisann! Eg følger med på tiden. No e det bare å gå.')); }} />)}
    <Button secondary title="Prøv stemmen" icon="sound" onPress={() => { void Speech.stop().then(() => speak('God tur! Eg sier fra kordan du ligger an mot skyggen din.')); }} />
  </View>;
}
