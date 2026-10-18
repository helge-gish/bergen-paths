import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import type { Discovery } from '../domain/discoveries';
import { isUnnamedRoute } from '../domain/discoveryGroups';
import { Button } from './components';
import { styles as s } from './theme';

export function RouteNameEditor({ item, onRename }: { item: Discovery; onRename: (item: Discovery, name: string) => void }) {
  const [open, setOpen] = useState(false), [name, setName] = useState(item.localName ?? '');
  if (!isUnnamedRoute(item) && !item.localName) return null;
  return <View style={{ gap: 8 }}>
    {item.localName && <Text style={s.small}>Ditt Tråkk-navn · lagret på denne mobilen</Text>}
    {!open ? <Button secondary title={item.localName ? 'Endre Tråkk-navn' : 'Gi et Tråkk-navn'} onPress={() => setOpen(true)} /> : <>
      <Text style={s.small}>Velg gjerne et navn som gjør stedet lett å kjenne igjen. Navnet lagres hos deg; det endrer ikke OpenStreetMap.</Text>
      <TextInput accessibilityLabel="Tråkk-navn" placeholder="Navn på stien eller trappen" value={name} onChangeText={setName} maxLength={80} style={s.input} />
      <Button secondary title="Lagre Tråkk-navn" disabled={!name.trim()} onPress={() => { onRename(item, name); setOpen(false); }} />
      {item.localName && <Button secondary title="Fjern mitt Tråkk-navn" onPress={() => { onRename(item, ''); setOpen(false); setName(''); }} />}
      <Button secondary title="Avbryt navngiving" onPress={() => { setOpen(false); setName(item.localName ?? ''); }} />
    </>}
  </View>;
}
