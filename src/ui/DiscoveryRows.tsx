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
  const counts = (['trail', 'steps', 'viewpoint'] as const).map(kind => ({ kind, count: unnamed.filter(i => i.kind === kind).length })).filter(entry => entry.count);
  const labels = { trail: ['sti', 'stier'], steps: ['trapp', 'trapper'], viewpoint: ['utsiktspunkt', 'utsiktspunkter'] };
  return <View style={{ gap: 14 }}>
    {named.slice(0, limit).map(renderItem)}
    {named.length > limit && <Button secondary title={`Vis flere funn (${named.length - limit} igjen)`} onPress={() => setLimit(limit + 25)} />}
    {unnamed.length > 0 && <View style={[s.card, { backgroundColor: '#EDF0E8', padding: 14, gap: 8 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${open ? 'Lukk' : 'Åpne'} funn uten navn`} accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={{ gap: 4, paddingVertical: 2 }}>
        <View style={s.between}><Text style={[s.body, { fontSize: 15 }]}>Uten navn · {unnamed.length}</Text><Text style={s.small}>{open ? '↑' : '↓'}</Text></View>
        <Text style={s.small}>{counts.map(entry => `${entry.count} ${labels[entry.kind][entry.count === 1 ? 0 : 1]}`).join(' · ')}</Text>
      </Pressable>
      {open && <><Text style={s.small}>Disse stedene og strekningene gir egne samlefunn først når de har navn og er besøkt eller gått.</Text>{unnamed.slice(0, groupLimit).map(renderItem)}{unnamed.length > groupLimit && <Button secondary title={`Vis flere uten navn (${unnamed.length - groupLimit} igjen)`} onPress={() => setGroupLimit(groupLimit + 12)} />}</>}
    </View>}
  </View>;
}
