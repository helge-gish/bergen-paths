import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { HomeArea } from '../domain/areas';
import type { Discovery } from '../domain/discoveries';
const NO_TARGETS: Discovery[] = [];
import type { Trip } from '../domain/types';
import { type Goal } from '../domain/goals';
import { useCollectionProgress } from './useCollectionProgress';
import { nearbyRadii } from './useNearbyArea';
import { Button } from './components';
import { colors, styles as s } from './theme';

export function RadiusPicker({ radius, onRadius }: { radius: number; onRadius: (radius: number) => void }) {
  return <View accessibilityLabel="Radius rundt posisjonen" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{nearbyRadii.map(r => <Pressable accessibilityRole="button" accessibilityLabel={`Radius ${r / 1000} km`} accessibilityState={{ selected: radius === r }} key={r} onPress={() => onRadius(r)} style={[s.chip, { minWidth: 56, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: radius === r ? colors.ink : colors.pale }]}><Text style={{ color: radius === r ? colors.paper : colors.ink }}>{r / 1000} km</Text></Pressable>)}</View>;
}
export function Goals({ homeArea, radius, goals, catalog, trips, loading, error, onCancel, onToggle, onLoad, onBergen, onArea }: { homeArea: HomeArea | null; radius: number; goals: Goal[]; catalog: Goal[]; trips: Trip[]; loading: 'nearby' | 'bergen' | null; error: string | null; onCancel: () => void; onToggle: (goal: Goal) => void; onLoad: () => void; onBergen: () => void; onArea: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const entries = useMemo(() => [...goals, ...catalog.filter(g => !goals.some(a => a.id === g.id))].map(g => ({ goal: g, active: goals.some(a => a.id === g.id) })), [goals, catalog]);
  return <View style={{ gap: 16 }}>
    <Text style={s.body}>Velg mål du vil følge. Alle lagrede turer teller, også turer fra før du aktiverte målet.</Text>
    {entries.filter(entry => entry.active).map(({ goal }) => <GoalCard key={goal.id} goal={goal} active trips={trips} expanded={expanded === goal.id} onToggle={() => onToggle(goal)} onExpand={() => setExpanded(expanded === goal.id ? null : goal.id)} />)}
    <View style={s.card}><Text style={s.eyebrow}>OMRÅDET RUNDT DEG</Text><Text style={s.subheading}>{radius / 1000} km rundt der du er nå</Text><Text style={s.body}>{homeArea ? 'Sentrum følger posisjonen din. Turene dine teller også utenfor området.' : 'Vi trenger en fersk posisjon for å hente lokale målforslag.'}</Text><Button secondary title="Endre radius" onPress={onArea} /></View>
    <Button secondary title={loading === 'nearby' ? 'Finner mål rundt deg …' : 'Finn mål rundt meg'} disabled={!!loading} onPress={onLoad} />
    {!entries.some(({ goal }) => goal.curated && !goal.needsRefresh) && <Button secondary title={loading === 'bergen' ? 'Henter de syv fjelltoppene …' : 'Se mål: De syv byfjellene'} disabled={!!loading} onPress={onBergen} />}
    {loading && <View accessibilityLiveRegion="polite" style={s.notice}><Text style={s.small}>Bruker lagrede kartdata først. Nye data kan ta opptil 30 sekunder.</Text><Button secondary title="Avbryt søket" onPress={onCancel} /></View>}
    {error && <View accessibilityLiveRegion="polite" style={s.notice}><Text style={s.body}>{error}</Text></View>}
    {entries.filter(entry => !entry.active).map(({ goal }) => <GoalCard key={goal.id} goal={goal} active={false} trips={trips} expanded={expanded === goal.id} onToggle={() => onToggle(goal)} onExpand={() => setExpanded(expanded === goal.id ? null : goal.id)} />)}
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
