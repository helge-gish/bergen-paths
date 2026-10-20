import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Button } from './components';
import { styles as s } from './theme';
/** Titles are read-only until the user explicitly asks to edit. */
export function OptionalName({ value, emptyLabel, label = 'Endre navn', onSave }: { value: string; emptyLabel?: string; label?: string; onSave: (value: string) => boolean | void }) {
  const [editing, setEditing] = useState(false), [draft, setDraft] = useState(value);
  return <View style={{ gap: 8 }}>
    {!editing ? <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Text style={[value ? s.heading : s.small, { flex: 1 }]}>{value || emptyLabel}</Text><Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => { setDraft(value); setEditing(true); }} style={{ paddingVertical: 10, paddingHorizontal: 4 }}><Text style={s.small}>Endre</Text></Pressable></View> : <>
      <TextInput autoFocus accessibilityLabel="Nytt navn" value={draft} onChangeText={setDraft} maxLength={80} style={s.input} />
      <Button secondary title="Lagre navn" disabled={!draft.trim()} onPress={() => { if (onSave(draft.trim()) !== false) setEditing(false); }} />
      <Button secondary title="Avbryt navneendring" onPress={() => setEditing(false)} />
    </>}
  </View>;
}
