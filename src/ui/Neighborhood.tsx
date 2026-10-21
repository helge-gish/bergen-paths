import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { HomeArea } from '../domain/areas';
import type { NeighborhoodStreets } from '../domain/neighborhood';
import type { Discovery, Progress } from '../domain/discoveries';
import { rowProgressLabel } from '../domain/discoveryRows';
import { DiscoveryRows } from './DiscoveryRows';
import { Button, Icon } from './components';
import { colors, styles as s } from './theme';

type StatusProps = { result: NeighborhoodStreets; area: HomeArea | null; pending: boolean; error: string | null; live: boolean };
export function NeighborhoodCard({ result, area, pending, error, live, onPress }: StatusProps & { onPress: () => void }) {
  const checking = pending || !!error || result.checked < result.total;
  const known = !!area && result.total > 0;
  return <Pressable accessibilityRole="button" accessibilityLabel={known ? `Gater i nærområdet. ${result.complete.length} av ${result.total} kartlagte gater fullført${checking ? ', sjekken er ikke ferdig' : ''}. Se gatene.` : 'Gater i nærområdet. Se kartgrunnlag.'} onPress={onPress} style={[s.card, { backgroundColor: colors.ink, borderColor: colors.ink, gap: 10 }]}>
    <View style={s.between}><Text style={[s.eyebrow, { color: '#C9DBCA' }]}>NÆROMRÅDET DITT</Text><Icon name="arrow" color={colors.paper} size={20} /></View>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}><Text style={{ color: colors.paper, fontSize: 42, fontWeight: '800', letterSpacing: -1 }}>{known ? result.complete.length : '—'}</Text><Text style={{ color: '#D6E2D7', fontSize: 18 }}>{known ? `av ${result.total} gater fullført` : 'gater fullført'}</Text></View>
    {known && <View accessibilityRole="progressbar" accessibilityLabel="Andel kartlagte gater fullført" accessibilityValue={{ min: 0, max: result.total, now: result.complete.length }} style={{ height: 8, borderRadius: 8, overflow: 'hidden', backgroundColor: '#3B5B4D' }}><View style={{ height: '100%', width: `${result.percent ?? 0}%`, backgroundColor: '#E9BF68' }} /></View>}
    <Text style={{ color: '#D6E2D7', fontSize: 12, lineHeight: 18 }}>{!area ? 'Finn posisjonen din for å se gatene rundt deg.' : !known ? 'Ingen kartlagte gater i dette utvalget ennå. Trykk for kartgrunnlag.' : `${error ? 'Tursjekken må prøves igjen' : checking ? 'Sjekker lagrede turer …' : `${result.percent} % fullført`} · ${result.partial.length} delvis gått\n${area.radius / 1000} km rundt ${live ? 'deg' : 'sist kjente posisjon'} · kartlagte gater`}</Text>
  </Pressable>;
}

export function NeighborhoodDetails({ result, area, pending, error, live, progress, syncError, busy, onSync, onRetry, onMap }: StatusProps & { progress: Record<string, Progress>; syncError: string | null; busy: boolean; onSync: () => void; onRetry: () => void; onMap: (item: Discovery) => void }) {
  const [filter, setFilter] = useState<'partial' | 'remaining' | 'complete'>('partial');
  const rows = result[filter];
  return <View style={{ gap: 16 }}>
    <Text style={s.heading}>{result.total ? `${result.complete.length} av ${result.total} gater fullført` : 'Ingen kartlagte gater i utvalget'}</Text>
    <Text style={s.body}>{area ? `${area.radius / 1000} km rundt ${live ? 'posisjonen din' : 'sist kjente posisjon'}.` : 'Vi trenger en posisjon for å finne nærområdet.'} Telleren gjelder navngitte gater i kartdataene vi har hentet. Kartgrunnlaget kan være ufullstendig.</Text>
    {pending && <Text accessibilityLiveRegion="polite" style={s.small}>Sjekker lagrede turer: {result.checked} av {result.total} gater sjekket.</Text>}
    {!!error && <Button secondary title="Prøv tursjekken igjen" onPress={onRetry} />}
    {!!syncError && <Text style={s.small}>Noen kartdata kunne ikke hentes. Telleren kan endre seg når flere gater kommer til.</Text>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{([{ id: 'partial', label: 'Delvis gått' }, { id: 'remaining', label: 'Å utforske' }, { id: 'complete', label: 'Fullført' }] as const).map(option => <Pressable key={option.id} accessibilityRole="button" accessibilityState={{ selected: filter === option.id }} onPress={() => setFilter(option.id)} style={[s.chip, { minHeight: 44, justifyContent: 'center', backgroundColor: filter === option.id ? colors.ink : colors.pale }]}><Text style={[s.chipText, { color: filter === option.id ? colors.paper : colors.ink }]}>{option.label} · {result[option.id].length}</Text></Pressable>)}</View>
    {!rows.length && <Text style={s.small}>{pending ? 'Listen oppdateres mens turene sjekkes.' : 'Ingen gater i dette utvalget.'}</Text>}
    <DiscoveryRows key={filter} rows={rows} renderItem={row => <Pressable accessibilityRole="button" accessibilityLabel={`Vis ${row.item.name} i kartet`} onPress={() => onMap(row.item)} style={[s.card, s.between]}><View style={{ flex: 1 }}><Text style={s.subheading}>{row.item.name}</Text><Text style={s.small}>{rowProgressLabel(row, progress)} · Vis i kartet</Text></View><Icon name="arrow" /></Pressable>} />
    <Text style={s.small}>En gatetrase fullføres med minst 95 % dekning og besøk ved endene på én lagret tur. Alle kartdeler må være fullført. Deler utenfor radiusen teller også i kravet. Fortau langs gaten teller. Alle lagrede turer, også skyggeturer, sjekkes; pågående tur teller etter lagring.</Text>
    <Text style={s.small}>En sammenhengende gate telles én gang, selv om den er delt i flere kartobjekter. Prosenten gjelder hentede gater, ikke en garanti for alle gatene som finnes. Endret radius eller posisjon gir et nytt utvalg.</Text>
    <Button secondary title={busy ? 'Kartdata oppdateres …' : 'Hent / oppdater gatekart'} onPress={onSync} disabled={busy} />
  </View>;
}
