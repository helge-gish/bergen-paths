import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { HomeArea } from '../domain/areas';
import type { Discovery } from '../domain/discoveries';
const NO_TARGETS: Discovery[] = [];
import type { Trip } from '../domain/types';
import { type Goal } from '../domain/goals';
import { useCollectionProgress } from './useCollectionProgress';
import { nearbyRadii } from './useNearbyArea';
import { Button } from './components';
import { TrailMap } from './TrailMap';
import { colors, styles as s } from './theme';

export function AreaPicker({ area, radius, pending, status, onRadius, onLocate }: { area: HomeArea | null; radius: number; pending: boolean; status: string; onRadius: (radius: number) => void; onLocate: () => void }) {
  return <View style={s.card}>
    <Text style={s.subheading}>Området rundt deg</Text>
    <Text style={s.body}>Du velger radius. Sentrum følger posisjonen din, også når du reiser et nytt sted.</Text>
    {area && <TrailMap focus={area} position={area} height={180} />}
    <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>{pending && <ActivityIndicator color={colors.ink} />}<Text style={[s.small, { flex: 1 }]}>{status}</Text></View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{nearbyRadii.map(r => <Pressable accessibilityRole="button" accessibilityLabel={`Radius ${r / 1000} km`} accessibilityState={{ selected: radius === r }} key={r} onPress={() => onRadius(r)} style={[s.chip, { minWidth: 56, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: radius === r ? colors.ink : colors.pale }]}><Text style={{ color: radius === r ? colors.paper : colors.ink }}>{r / 1000} km radius</Text></Pressable>)}</View>
    <Text style={s.small}>Valgt radius: {radius / 1000} km · lagres automatisk. Brukes til kartdata og nye målforslag. Aktive mål beholder området sitt.</Text>
    {!area && <Button secondary title={pending ? 'Finner posisjon …' : 'Finn min posisjon'} disabled={pending} onPress={onLocate} />}
  </View>;
}
export function Goals({ homeArea, radius, goals, catalog, trips, busy, onToggle, onLoad, onBergen, onArea }: { homeArea: HomeArea | null; radius: number; goals: Goal[]; catalog: Goal[]; trips: Trip[]; busy: boolean; onToggle: (goal: Goal) => void; onLoad: () => void; onBergen: () => void; onArea: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const entries = useMemo(() => [...goals, ...catalog.filter(g => !goals.some(a => a.id === g.id))].map(g => ({ goal: g, active: goals.some(a => a.id === g.id) })), [goals, catalog, trips]);
  return <View style={{ gap: 16 }}>
    <Text style={s.heading}>Målbibliotek</Text>
    <Text style={s.body}>Velg personlige mål. Du samler funn på alle turer, uansett hvilke mål du har aktivert. Tidligere turer teller også.</Text>
    <View style={s.card}><Text style={s.eyebrow}>OMRÅDET RUNDT DEG</Text><Text style={s.subheading}>{radius / 1000} km rundt der du er nå</Text><Text style={s.body}>{homeArea ? 'Sentrum følger posisjonen din. Turene dine teller også utenfor området.' : 'Vi trenger en fersk posisjon for å hente lokale målforslag.'}</Text><Button secondary title="Endre radius" onPress={onArea} /></View>
    <Button secondary title={busy ? 'Henter mål …' : 'Finn mål rundt meg'} disabled={busy} onPress={onLoad} />
    <Button secondary title="Hent målet: De syv byfjellene i Bergen" disabled={busy} onPress={onBergen} />
    {entries.map(({ goal, active }) => <GoalCard key={goal.id} goal={goal} active={active} trips={trips} expanded={expanded === goal.id} onToggle={() => onToggle(goal)} onExpand={() => setExpanded(expanded === goal.id ? null : goal.id)} />)}
    <Text style={s.small}>Aktive mål beholder kartutvalget de startet med. OSM kan mangle steder og gater. Dette er personlige mål på mobilen; vennelister og rangering er ikke koblet til ennå.</Text>
  </View>;
}

function GoalCard({ goal, active, trips, expanded, onToggle, onExpand }: { goal: Goal; active: boolean; trips: Trip[]; expanded: boolean; onToggle: () => void; onExpand: () => void }) {
  const check = useCollectionProgress(goal.needsRefresh ? NO_TARGETS : goal.targets, trips);
  const collected = goal.targets.filter(t => check.progress[t.id]?.collected).length;
  return <View style={s.card}>
    <Text style={s.eyebrow}>{active ? !check.pending && !check.error && !goal.needsRefresh && goal.targets.length > 0 && collected === goal.targets.length ? 'MÅL OPPNÅDD' : 'DITT MÅL' : 'FORSLAG'}</Text>
    <Text style={s.subheading}>{goal.title}</Text>
    <Text style={s.heading}>{goal.needsRefresh ? 'Kartgrunnlaget er endret' : `${collected} / ${goal.targets.length}`}</Text>
    {check.pending && <Text style={s.small}>Sjekker mål: {check.processed} av {check.total} …</Text>}
    {check.error && <Button secondary title="Prøv målsjekken igjen" onPress={check.retry} />}
    <Text style={s.body}>{goal.needsRefresh ? 'Dette målet brukte den gamle inndelingen av stier og gater. Hent nye målforslag og aktiver en oppdatert utgave. Turene dine er beholdt.' : goal.description}</Text>
    <Button secondary title={active ? 'Deaktiver mål' : 'Aktiver som mitt mål'} onPress={onToggle} />
    <Pressable accessibilityRole="button" onPress={onExpand}><Text style={s.small}>{expanded ? 'Skjul innhold' : 'Se hva målet inneholder'}</Text></Pressable>
    {expanded && <Text style={s.small}>{goal.targets.map(t => t.name).join(' · ')}</Text>}
  </View>;
}
