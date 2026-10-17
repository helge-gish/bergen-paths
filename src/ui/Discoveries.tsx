import { useMemo, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { collectionProgress, kindLabels, type Discovery, type DiscoveryKind } from '../domain/discoveries';
import type { Trip } from '../domain/types';
import { colors, styles as s } from './theme';
import { Button, Icon } from './components';
export function Discoveries({ items, trips, awards, busy, onSync, onMap }: { items: Discovery[]; trips: Trip[]; awards: Record<string, number>; busy: boolean; onSync: () => void; onMap: (item: Discovery) => void }) {
  const [filter, setFilter] = useState<DiscoveryKind | 'all'>('all'), [limit, setLimit] = useState(25);
  const progress = useMemo(() => {
    const values = collectionProgress(items, trips);
    for (const item of items) if (awards[item.id] !== undefined) values[item.id] = { ...values[item.id], collected: true, firstVisit: awards[item.id] };
    return values;
  }, [items, trips, awards]);
  const collected = Object.values(progress).filter(p => p.collected).length;
  const visible = items.filter(p => filter === 'all' || p.kind === filter).sort((a, b) => Number(progress[b.id]?.collected) - Number(progress[a.id]?.collected) || a.name.localeCompare(b.name, 'nb'));
  return <View style={{ gap: 18 }}>
    <View style={[s.card, { backgroundColor: colors.ink }]}><Text style={{ color: '#C2D3C3', fontSize: 10, letterSpacing: 2 }}>DIN SAMLING · OPENSTREETMAP</Text><Text style={{ color: colors.paper, fontSize: 44, fontWeight: '700' }}>{collected}<Text style={{ fontSize: 21, color: '#C2D3C3' }}> / {items.length}</Text></Text><Text style={{ color: colors.paper, fontSize: 16 }}>Stier gått. Steder oppdaget.</Text></View>
    <Text style={s.body}>Hent stier og turmål innen 3 km fra kartets valgte punkt, eller fra Fløyen som utgangspunkt. Samlingen vokser når du henter flere områder. Fremgang beregnes fra lagrede turer.</Text>
    <Button title={busy ? 'Henter fra OpenStreetMap …' : items.length ? 'Hent / oppdater dette området' : 'Hent min første samling'} icon="map" secondary onPress={onSync} disabled={busy} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(['all', ...Object.keys(kindLabels)] as (DiscoveryKind | 'all')[]).map(kind => <Pressable key={kind} accessibilityRole="button" accessibilityState={{ selected: filter === kind }} onPress={() => { setFilter(kind); setLimit(25); }} style={[s.chip, { backgroundColor: filter === kind ? colors.ink : colors.pale }]}><Text style={[s.chipText, { color: filter === kind ? colors.paper : colors.ink }]}>{kind === 'all' ? 'Alle' : kindLabels[kind]}</Text></Pressable>)}</View>
    {visible.slice(0, limit).map(item => {
      const p = progress[item.id];
      return <View key={item.id} style={s.card}><View style={s.row}><View style={{ backgroundColor: p?.collected ? colors.ink : colors.pale, padding: 12, borderRadius: 50 }}><Icon name={p?.collected ? 'check' : item.kind === 'trail' ? 'map' : item.kind === 'peak' ? 'mountain' : 'location'} color={p?.collected ? colors.paper : colors.ink} /></View><View style={{ flex: 1, gap: 3 }}><Text style={s.subheading}>{item.name}</Text><Text style={s.small}>{kindLabels[item.kind]} · {p?.collected ? 'Samlet!' : item.kind === 'trail' ? `${Math.round((p?.fraction ?? 0) * 100)} % av traseen gått` : 'Venter på ditt besøk'}</Text></View></View>{item.kind === 'trail' && <View style={{ height: 5, borderRadius: 5, backgroundColor: colors.pale }}><View style={{ height: 5, borderRadius: 5, backgroundColor: colors.ink, width: `${(p?.fraction ?? 0) * 100}%` }} /></View>}<View style={s.between}><Pressable accessibilityRole="button" onPress={() => onMap(item)} style={{ paddingVertical: 8 }}><Text style={s.chipText}>Vis på kartet →</Text></Pressable><Pressable accessibilityRole="link" onPress={() => void Linking.openURL(item.sourceUrl).catch(() => {})} style={{ paddingVertical: 8 }}><Text style={s.small}>OSM-kilde ↗</Text></Pressable></View></View>;
    })}
    {visible.length > limit && <Button secondary title={`Vis flere (${visible.length - limit} igjen)`} onPress={() => setLimit(limit + 25)} />}
    <Text style={s.small}>Stier samles ved minst 85 % beregnet dekning, også fordelt over flere turer. GPS kan forveksle nærliggende stier. Turmål krever to nøyaktige punkter over minst 10 sekunder innen 40 m. OSM-stier er kartsegmenter, ikke nødvendigvis hele turruter.</Text>
    <Text style={s.small}>© OpenStreetMap-bidragsytere · ODbL. Kartdata er ufullstendige og endrer seg. En markør bekrefter ikke at en hytte er åpen eller at et område er tilgjengelig. Henting deler søkeområdet med Overpass; turloggen lastes ikke opp.</Text>
  </View>;
}
