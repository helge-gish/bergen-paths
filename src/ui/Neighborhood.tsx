import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { HomeArea } from '../domain/areas';
import { neighborhoodLabels, type NeighborhoodStreets, type NeighborhoodResults, type NeighborhoodKind } from '../domain/neighborhood';
import type { Discovery, Progress } from '../domain/discoveries';
import { rowProgressLabel } from '../domain/discoveryRows';
import { DiscoveryRows } from './DiscoveryRows';
import { Button, Icon } from './components';
import { colors, styles as s } from './theme';

type StatusProps = { result: NeighborhoodStreets; area: HomeArea | null; pending: boolean; error: string | null; live: boolean };
export function NeighborhoodCard({ results, area, pending, error, live, onPress }: Omit<StatusProps, 'result'> & { results: NeighborhoodResults; onPress: (kind: NeighborhoodKind) => void }) {
  return <View style={[s.card, { backgroundColor: colors.ink, borderColor: colors.ink, gap: 6 }]}>
    <Text style={[s.eyebrow, { color: '#C9DBCA' }]}>NÆROMRÅDET DITT</Text>
    {(['street', 'steps', 'trail'] as const).map(kind => {
      const result = results[kind], label = neighborhoodLabels[kind];
      const known = !!area && result.total > 0;
      const checking = pending || !!error || result.checked < result.total;
      return <Pressable key={kind} accessibilityRole="button" accessibilityLabel={known ? `${result.complete.length} av ${result.total} ${label} gått${checking ? ', sjekken er ikke ferdig' : ''}. Se detaljer.` : `${label}: ingen kartdata i utvalget. Se detaljer.`} onPress={() => onPress(kind)} style={{ gap: 8, paddingVertical: 12, minHeight: 64 }}>
        <View style={s.between}><Text style={{ color: colors.paper, fontSize: 20, fontWeight: '700', flex: 1 }}>{known ? `${result.complete.length} av ${result.total}` : '—'} {label} gått</Text><Icon name="arrow" color={colors.paper} size={18} /></View>
        {known && <View accessibilityRole="progressbar" accessibilityLabel={`Andel ${label} gått`} accessibilityValue={{ min: 0, max: result.total, now: result.complete.length }} style={{ height: 5, borderRadius: 8, overflow: 'hidden', backgroundColor: '#3B5B4D' }}><View style={{ height: '100%', width: `${result.percent ?? 0}%`, backgroundColor: '#E9BF68' }} /></View>}
      </Pressable>;
    })}
    <Text style={{ color: '#D6E2D7', fontSize: 12, lineHeight: 18 }}>{!area ? 'Finn posisjonen din for å se nærområdet.' : `${area.radius / 1000} km rundt ${live ? 'deg' : 'sist kjente posisjon'} · hentede kartdata`}{error ? '\nTursjekken må prøves igjen.' : pending ? '\nSjekker lagrede turer …' : ''}</Text>
  </View>;
}

export function NeighborhoodDetails({ results, initialKind, area, pending, error, live, progress, syncError, busy, onSync, onRetry, onMap }: Omit<StatusProps, 'result'> & { results: NeighborhoodResults; initialKind: NeighborhoodKind; progress: Record<string, Progress>; syncError: string | null; busy: boolean; onSync: () => void; onRetry: () => void; onMap: (item: Discovery) => void }) {
  const [kind, setKind] = useState(initialKind);
  const result = results[kind], label = neighborhoodLabels[kind];
  const [filter, setFilter] = useState<'partial' | 'remaining' | 'complete'>('partial');
  const rows = result[filter];
  return <View style={{ gap: 16 }}>
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{(['street', 'steps', 'trail'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Vis ${neighborhoodLabels[value]}`} accessibilityState={{ selected: value === kind }} onPress={() => { setKind(value); setFilter('partial'); }} style={[s.chip, { minHeight: 44, justifyContent: 'center', backgroundColor: value === kind ? colors.ink : colors.pale }]}><Text style={[s.chipText, { color: value === kind ? colors.paper : colors.ink }]}>{neighborhoodLabels[value][0].toUpperCase() + neighborhoodLabels[value].slice(1)}</Text></Pressable>)}</View>
    <Text style={s.heading}>{result.total ? `${result.complete.length} av ${result.total} ${label} gått` : `Ingen kartlagte ${label} i utvalget`}</Text>
    <Text style={s.body}>{area ? `${area.radius / 1000} km rundt ${live ? 'posisjonen din' : 'sist kjente posisjon'}.` : 'Vi trenger en posisjon for å finne nærområdet.'} Telleren gjelder {kind === 'street' ? 'navngitte gater' : label} i kartdataene vi har hentet. Kartgrunnlaget kan være ufullstendig.</Text>
    {pending && <Text accessibilityLiveRegion="polite" style={s.small}>Sjekker lagrede turer: {result.checked} av {result.total} {label} sjekket.</Text>}
    {!!error && <Button secondary title="Prøv tursjekken igjen" onPress={onRetry} />}
    {!!syncError && <Text style={s.small}>Noen kartdata kunne ikke hentes. Telleren kan endre seg når flere kartdata kommer til.</Text>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{([{ id: 'partial', label: 'Delvis gått' }, { id: 'remaining', label: 'Å utforske' }, { id: 'complete', label: 'Fullført' }] as const).map(option => <Pressable key={option.id} accessibilityRole="button" accessibilityState={{ selected: filter === option.id }} onPress={() => setFilter(option.id)} style={[s.chip, { minHeight: 44, justifyContent: 'center', backgroundColor: filter === option.id ? colors.ink : colors.pale }]}><Text style={[s.chipText, { color: filter === option.id ? colors.paper : colors.ink }]}>{option.label} · {result[option.id].length}</Text></Pressable>)}</View>
    {!rows.length && <Text style={s.small}>{pending ? 'Listen oppdateres mens turene sjekkes.' : `Ingen ${label} i dette utvalget.`}</Text>}
    <DiscoveryRows key={`${kind}:${filter}`} rows={rows} renderItem={row => <Pressable accessibilityRole="button" accessibilityLabel={`Vis ${row.item.name} i kartet`} onPress={() => onMap(row.item)} style={[s.card, s.between]}><View style={{ flex: 1 }}><Text style={s.subheading}>{row.item.name}</Text><Text style={s.small}>{rowProgressLabel(row, progress)} · Vis i kartet</Text></View><Icon name="arrow" /></Pressable>} />
    <Text style={s.small}>{kind === 'trail' ? 'En sti fullføres med minst 85 % dekning av hver kartlagt del. Dekningen kan samles over flere lagrede turer.' : `En ${kind === 'steps' ? 'trapp' : 'gatetrase'} fullføres med minst 95 % dekning og besøk ved endene på én lagret tur. Alle kartdeler må være fullført.`} Deler utenfor radiusen teller også i kravet. Pågående tur teller etter lagring.</Text>
    <Text style={s.small}>Sammenhengende kartdeler med samme navn telles samlet innen hver kategori. {kind !== 'street' && 'Deler uten navn kobles sammen der traseen fortsetter uten forgrening. '}Kartgrunnlaget kan være ufullstendig. Endret radius eller posisjon gir et nytt utvalg.</Text>
    <Button secondary title={busy ? 'Kartdata oppdateres …' : 'Oppdater kartgrunnlag'} onPress={onSync} disabled={busy} />
  </View>;
}
