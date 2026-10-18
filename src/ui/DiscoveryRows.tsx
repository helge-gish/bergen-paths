import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Discovery } from '../domain/discoveries';
import { groupDiscoveries } from '../domain/discoveryGroups';
import { Button } from './components';
import { styles as s } from './theme';

/** Presentation only: each mapped segment keeps its identity, award and map link. */
export function DiscoveryRows({ items, renderItem }: { items: Discovery[]; renderItem: (item: Discovery) => ReactNode }) {
  const { named, unnamed } = useMemo(() => groupDiscoveries(items), [items]);
  const [limit, setLimit] = useState(25), [open, setOpen] = useState(false), [groupLimit, setGroupLimit] = useState(12);
  const trails = unnamed.filter(i => i.kind === 'trail').length;
  return <View style={{ gap: 14 }}>
    {named.slice(0, limit).map(renderItem)}
    {named.length > limit && <Button secondary title={`Vis flere funn (${named.length - limit} igjen)`} onPress={() => setLimit(limit + 25)} />}
    {unnamed.length > 0 && <View style={[s.card, { backgroundColor: '#EDF0E8' }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${open ? 'Lukk' : 'Åpne'} stier og trapper uten navn`} accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={{ gap: 8, paddingVertical: 8 }}>
        <Text style={s.subheading}>Stier og trapper uten navn · {unnamed.length}</Text>
        <Text style={s.small}>{trails} stier · {unnamed.length - trails} trapper</Text>
        <Text style={s.body}>{open ? 'Skjul delstrekninger ↑' : 'Se delstrekninger og kart →'}</Text>
      </Pressable>
      <Text style={s.small}>Disse delstrekningene gir ikke egne samlefunn før de har navn og er gått.</Text>
      {open && <>{unnamed.slice(0, groupLimit).map(renderItem)}{unnamed.length > groupLimit && <Button secondary title={`Vis flere delstrekninger (${unnamed.length - groupLimit} igjen)`} onPress={() => setGroupLimit(groupLimit + 12)} />}</>}
    </View>}
  </View>;
}
