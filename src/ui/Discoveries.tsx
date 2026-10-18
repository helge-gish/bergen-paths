import { useMemo, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { kindLabels, type Discovery, type DiscoveryKind, type Progress } from '../domain/discoveries';
import { colors, styles as s } from './theme';
import { Button } from './components';
const nameOrder = new Intl.Collator('nb', { numeric: true });
export function Discoveries({ items, progress, checking, checked, error, onRetry, syncError, busy, onSync, onMap }: { items: Discovery[]; progress: Record<string, Progress>; checking: boolean; checked: number; error: string | null; onRetry: () => void; syncError: string | null; busy: boolean; onSync: () => void; onMap: (item: Discovery) => void }) {
  const [filter, setFilter] = useState<DiscoveryKind | 'all'>('all'), [limit, setLimit] = useState(25);
  const [show, setShow] = useState<'collected' | 'started' | 'all'>('collected');
  const [rules, setRules] = useState(false);
  const counts = useMemo(() => Object.fromEntries(Object.keys(kindLabels).map(k => [k, items.filter(i => i.kind === k && progress[i.id]?.collected).length])), [items, progress]);
  const total = Object.values(counts).reduce((n, value) => n + value, 0);
  const visible = useMemo(() => items.filter(i => (filter === 'all' || i.kind === filter) && (show === 'all' || (show === 'collected' ? progress[i.id]?.collected : progress[i.id]?.fraction > 0 && !progress[i.id]?.collected))).sort((a, b) => (show === 'collected' ? (progress[b.id]?.firstVisit ?? 0) - (progress[a.id]?.firstVisit ?? 0) : 0) || nameOrder.compare(a.name, b.name)), [items, filter, show, progress]);
  return <View style={{ gap: 18 }}>
    <View style={[s.card, { backgroundColor: colors.ink }]}><Text style={{ color: colors.paper, fontSize: 30, fontWeight: '700' }}>{total.toLocaleString('nb-NO')} funn i samlingen</Text><Text style={{ color: colors.paper }}>{counts.street} gater · {counts.steps} trapper · {counts.trail} stier · {total - counts.street - counts.steps - counts.trail} steder</Text></View>
    {checking && <Text accessibilityLiveRegion="polite" style={s.small}>Oppdaterer funn: {checked} av {items.length} sjekket. Tidligere funn vises mens vi jobber.</Text>}
    {!!error && <View style={s.notice}><Text style={s.body}>Kunne ikke fullføre sjekken. Turene og tidligere funn er beholdt.</Text><Button secondary title="Prøv sjekken igjen" onPress={onRetry} /></View>}
    {!!syncError && <Text style={s.small}>Noen kartdata mangler. Funn kan komme til når karttjenesten svarer igjen.</Text>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{([{ id: 'collected', label: 'Samlet' }, { id: 'started', label: 'Påbegynt' }, { id: 'all', label: 'Alt i kartet' }] as const).map(option => <Pressable key={option.id} accessibilityRole="button" accessibilityLabel={`Vis ${option.label.toLowerCase()}`} accessibilityState={{ selected: show === option.id }} onPress={() => { setShow(option.id); setLimit(25); }} style={[s.chip, { backgroundColor: show === option.id ? colors.ink : colors.pale }]}><Text style={[s.chipText, { color: show === option.id ? colors.paper : colors.ink }]}>{option.label}</Text></Pressable>)}</View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(['all', ...Object.keys(kindLabels)] as (DiscoveryKind | 'all')[]).map(kind => <Pressable key={kind} accessibilityRole="button" accessibilityState={{ selected: filter === kind }} onPress={() => { setFilter(kind); setLimit(25); }} style={[s.chip, { backgroundColor: filter === kind ? colors.ink : colors.pale }]}><Text style={[s.chipText, { color: filter === kind ? colors.paper : colors.ink }]}>{kind === 'all' ? 'Alle typer' : kindLabels[kind]}</Text></Pressable>)}</View>
    <Text style={s.subheading}>{show === 'collected' ? 'Dine funn' : show === 'started' ? 'Påbegynte traseer' : 'Tilgjengelig i kartet'} · {visible.length}</Text>
    {!visible.length && <Text style={s.body}>{checking ? 'Funnene vises her etter hvert som sjekken blir ferdig.' : show === 'collected' ? 'Ingen bekreftede funn i dette utvalget ennå. Se Påbegynt for traseer du har gått deler av.' : 'Ingen objekter i dette utvalget.'}</Text>}
    {visible.slice(0, limit).map(item => { const p = progress[item.id]; return <View key={item.id} style={s.card}>
      <Text style={s.subheading}>{p?.collected ? '✓ ' : ''}{item.name}</Text>
      <Text style={s.small}>{kindLabels[item.kind]} · {p?.collected ? 'Samlet' : p ? ['trail','street','steps'].includes(item.kind) ? `${Math.round(p.fraction * 100)} % gått` : 'Ikke besøkt ennå' : 'Venter på sjekk'}</Text>
      <Button secondary title={`Vis ${item.name} på kartet`} onPress={() => onMap(item)} />
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(item.sourceUrl).catch(() => {})}><Text style={s.small}>OSM-kilde ↗</Text></Pressable>
    </View>; })}
    {visible.length > limit && <Button secondary title={`Vis flere (${visible.length - limit} igjen)`} onPress={() => setLimit(limit + 25)} />}
    <Text style={s.small}>{items.length.toLocaleString('nb-NO')} kartobjekter er hentet. Dette er kartgrunnlaget, ikke antall funn.</Text>
    <Button title={busy ? 'Henter kartdata …' : 'Hent / oppdater kartdata'} icon="map" secondary onPress={onSync} disabled={busy} />
    <Pressable accessibilityRole="button" onPress={() => setRules(!rules)}><Text style={s.chipText}>{rules ? 'Skjul' : 'Hvordan teller'} funnene?</Text></Pressable>
    {rules && <Text style={s.small}>Alle lagrede turer teller, også skyggeturer. Gater og trapper krever minst 95 % av hele traseen og besøk ved endene i én sammenhengende tur. Gange på fortau teller mot gaten. GPS må være nøyaktig og uten opphold over 20 sekunder. Stier krever 85 % beregnet dekning og kan samles over flere turer. Punktmål krever to nøyaktige posisjoner over minst 10 sekunder innen 40 m. OSM-stier er kartsegmenter, ikke nødvendigvis hele turruter. Kartdata og GPS kan være unøyaktige.</Text>}
    <Text style={s.small}>© OpenStreetMap-bidragsytere · ODbL. Henting deler søkeområdet med Overpass; turloggen lastes ikke opp.</Text>
  </View>;
}
