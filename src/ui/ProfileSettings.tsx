import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { getStore } from '../data/native';
import { profileInput } from '../domain/profile';
import type { Profile } from '../domain/types';
import { Button } from './components';
import { colors, styles as s } from './theme';
export function ProfileSettings() {
  const [profile] = useState(() => getStore().profile());
  const [weight, setWeight] = useState(profile.weightKg?.toString() ?? ''), [age, setAge] = useState(profile.age?.toString() ?? '');
  const [gender, setGender] = useState<Profile['gender']>(profile.gender ?? null);
  const [message, setMessage] = useState('');
  return <View style={s.card}>
    <Text style={s.subheading}>Om deg</Text><Text style={s.small}>Valgfritt · lagres bare på mobilen.</Text>
    <Text style={s.body}>Vekt (kg)</Text><TextInput accessibilityLabel="Vekt i kg" value={weight} onChangeText={value => { setWeight(value); setMessage(''); }} keyboardType="decimal-pad" style={s.input} />
    <Text style={s.body}>Alder</Text><TextInput accessibilityLabel="Alder" value={age} onChangeText={value => { setAge(value); setMessage(''); }} keyboardType="number-pad" style={s.input} />
    <Text style={s.body}>Kjønn</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{([{ value: null, label: 'Ikke oppgitt' }, { value: 'woman', label: 'Kvinne' }, { value: 'man', label: 'Mann' }, { value: 'other', label: 'Annet' }] as const).map(option => <Pressable key={option.label} accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ checked: gender === option.value }} onPress={() => { setGender(option.value); setMessage(''); }} style={[s.chip, { minHeight: 44, justifyContent: 'center', backgroundColor: gender === option.value ? colors.ink : colors.pale }]}><Text style={{ color: gender === option.value ? colors.paper : colors.ink }}>{option.label}</Text></Pressable>)}</View>
    <Button secondary title="Lagre profil" onPress={() => { try { getStore().setSetting('profile', profileInput(weight, age, gender)); setMessage('Lagret'); } catch (e) { setMessage((e as Error).message); } }} />
    {!!message && <Text accessibilityLiveRegion="polite" style={s.small}>{message}</Text>}
  </View>;
}
