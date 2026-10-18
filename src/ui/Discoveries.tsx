import { streetLength } from '../domain/streets';
import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { kindLabels, type Discovery, type DiscoveryKind, type Progress } from '../domain/discoveries';
import { colors, styles as s } from './theme';
import { Button, Icon } from './components';
export function Discoveries({ items, progress: readyProgress, busy, onSync, onMap }: { items: Discovery[]; progress: Record<string, Progress> | null; busy: boolean; onSync: () => void; onMap: (item: Discovery) => void }) {
  const [filter, setFilter] = useState<DiscoveryKind | 'all'>('all'), [limit, setLimit] = useState(25);
  const progress = readyProgress ?? {};
  const collected = Object.values(progress).filter(p => p.collected).length;
  const visible = items.filter(p => filter === 'all' || p.kind === filter).sort((a, b) => Number(progress[b.id]?.collected) - Number(progress[a.id]?.collected) || a.name.localeCompare(b.name, 'nb'));
  return <View style={{ gap: 18 }}>
    <View style={[s.card, { backgroundColor: colors.ink }]}>
      <Text style={{ color: '#C2D3C3', fontSize: 10, letterSpacing: 2 }}>FUNN PÅ TURENE DINE</Text>
      <Text style={{ color: colors.paper, fontSize: 36, fontWeight: '700' }}>{readyProgress ? `${collected.toLocaleString('nb-NO')} samlet` : 'Sjekker turene …'}</Text>
      {readyProgress && <Text style={{ color: colors.paper, fontSize: 16 }}>{items.filter(i => i.kind === 'street' && progress[i.id]?.collected).length} gater · {items.filter(i => i.kind === 'trail' && progress[i.id]?.collected).length} stier · {items.filter(i => !['street', 'trail'].includes(i.kind) && progress[i.id]?.collected).length} steder</Text>}
      <Text style={{ color: '#C2D3C3', fontSize: 14 }}>{items.length.toLocaleString('nb-NO')} gater, stier og steder er hentet fra kartet i områdene dine. Du velger selv hva du vil utforske.</Text>
    </View>
    {!readyProgress && <Text style={s.small}>Sjekker turene mot samlingen … Du kan bruke appen mens dette pågår.</Text>}
    <Text style={s.body}>Alle kategorier samles fra lagrede turer. Du kan også hente kartdata rundt valgt sted, hjemmeområdet eller posisjonen din før du går.</Text>
    <Button title={busy ? 'Henter fra OpenStreetMap …' : items.length ? 'Oppdater samlingen' : 'Hent kartdata i nærheten'} icon="map" secondary onPress={onSync} disabled={busy} />

    <Text style={s.body}>Gå en gate ende til ende og samle den i Turpasset. Hele gaten med eventuelle forgreninger vises på kartet. Gater med samme navn innen samme gateområde telles samlet. Gaten kan strekke seg utenfor radiusen til hjemmeområdet. {items.filter(i => i.kind === 'street' && progress[i.id]?.collected).length} av {items.filter(i => i.kind === 'street').length} hentede gater samlet.</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(['all', ...Object.keys(kindLabels)] as (DiscoveryKind | 'all')[]).map(kind => <Pressable key={kind} accessibilityRole="button" accessibilityState={{ selected: filter === kind }} onPress={() => { setFilter(kind); setLimit(25); }} style={[s.chip, { backgroundColor: filter === kind ? colors.ink : colors.pale }]}><Text style={[s.chipText, { color: filter === kind ? colors.paper : colors.ink }]}>{kind === 'all' ? 'Alle' : kindLabels[kind]}</Text></Pressable>)}</View>
    {visible.slice(0, limit).map(item => {
      const p = progress[item.id];
      return <View key={item.id} style={s.card}><View style={s.row}><View style={{ backgroundColor: p?.collected ? colors.ink : colors.pale, padding: 12, borderRadius: 50 }}><Icon name={p?.collected ? 'check' : ['trail', 'street'].includes(item.kind) ? 'map' : item.kind === 'peak' ? 'mountain' : 'location'} color={p?.collected ? colors.paper : colors.ink} /></View><View style={{ flex: 1, gap: 3 }}><Text style={s.subheading}>{item.name}</Text><Text style={s.small}>{kindLabels[item.kind]} · {p?.collected ? 'Samlet!' : ['trail', 'street'].includes(item.kind) ? `${Math.round((p?.fraction ?? 0) * 100)} % av traseen gått` : 'Venter på ditt besøk'}</Text></View></View>{['trail', 'street'].includes(item.kind) && <View style={{ height: 5, borderRadius: 5, backgroundColor: colors.pale }}><View style={{ height: 5, borderRadius: 5, backgroundColor: colors.ink, width: `${(p?.fraction ?? 0) * 100}%` }} /></View>}{item.kind === 'street' && <Text style={s.small}>{(streetLength(item) / 1000).toFixed(2)} km · {(item.streetEnds ?? []).length} ender / rundløypeankre · én sammenhengende tur</Text>}<View style={s.between}><Pressable accessibilityRole="button" onPress={() => onMap(item)} style={{ paddingVertical: 8 }}><Text style={s.chipText}>Vis på kartet →</Text></Pressable><Pressable accessibilityRole="link" onPress={() => void Linking.openURL(item.sourceUrl).catch(() => {})} style={{ paddingVertical: 8 }}><Text style={s.small}>OSM-kilde ↗</Text></Pressable></View></View>;
    })}
    {visible.length > limit && <Button secondary title={`Vis flere (${visible.length - limit} igjen)`} onPress={() => setLimit(limit + 25)} />}
    <Text style={s.small}>Gater krever minst 95 % av hele den viste traseen og besøk ved alle ender i én sammenhengende, lagret gåtur. Nøyaktig GPS (15 m eller bedre) og uten opphold over 20 sekunder mellom punktene. Gater kartlagt som private eller uten fotadgang er utelatt. Stier samles ved minst 85 % beregnet dekning, også fordelt over flere turer. GPS kan forveksle nærliggende stier. Turmål krever to nøyaktige punkter over minst 10 sekunder innen 40 m. OSM-stier er kartsegmenter, ikke nødvendigvis hele turruter.</Text>
    <Text style={s.small}>© OpenStreetMap-bidragsytere · ODbL. Kartdata er ufullstendige og endrer seg. En markør bekrefter ikke at en hytte er åpen eller at et område er tilgjengelig. Henting deler søkeområdet med Overpass; turloggen lastes ikke opp.</Text>
  </View>;
}
