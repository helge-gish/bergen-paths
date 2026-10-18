import { RouteNameEditor } from './RouteNameEditor';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { kindLabels, type Discovery, type Progress } from '../domain/discoveries';
import type { Goal } from '../domain/goals';
import { tripRewards } from '../domain/tripRewards';
import type { Trip } from '../domain/types';
import { useCollectionProgress } from './useCollectionProgress';
import { DiscoveryRows } from './DiscoveryRows';
import { isUnnamedRoute, routeProgressLabel } from '../domain/discoveryGroups';
import { colors, styles as s } from './theme';

export function TripRewards({ trip, trips, items, progress, pending, syncPending, error, goals, onMap, onRename }: { trip: Trip; trips: Trip[]; items: Discovery[]; progress: Record<string, Progress>; pending: boolean; syncPending: boolean; error: string | null; goals: Goal[]; onMap: (item: Discovery) => void; onRename: (item: Discovery, name: string) => void }) {
  const ownTrip = useMemo(() => [trip], [trip]);
  const visited = useCollectionProgress(items, ownTrip);
  const rewards = useMemo(() => tripRewards(trip, trips, items, progress), [trip, trips, items, progress]);
  const other = items.filter(i => !rewards.newFinds.some(n => n.id === i.id) && visited.progress[i.id]?.fraction > 0);
  return <View style={[s.card, { borderColor: colors.ink }]}>
    <Text style={s.heading}>Dette fikk du på turen</Text>
    {(pending || visited.pending) && <Text accessibilityLiveRegion="polite" style={s.small}>Sjekker turens funn … {visited.processed} av {visited.total}. Funnene vises underveis.</Text>}
    {syncPending && <Text style={s.small}>Noen kartdata mangler ennå. Funn kan komme til senere; turen er lagret.</Text>}
    {(error || visited.error) && <Text style={s.small}>Funnene er ikke ferdig sjekket. Se status og prøv igjen i Deg → Samlingen min.</Text>}
    <Text style={s.subheading}>Nye funn · {rewards.newFinds.length}</Text>
    <DiscoveryRows items={rewards.newFinds} renderItem={item => <View key={item.id}><Pressable accessibilityRole="button" onPress={() => onMap(item)} style={{ paddingVertical: 10 }}><Text style={s.subheading}>✓ {item.name}</Text><Text style={s.small}>{kindLabels[item.kind]} · Ny i samlingen · Vis på kartet →</Text></Pressable><RouteNameEditor item={item} onRename={onRename} /></View>} />
    {!rewards.newFinds.length && !pending && !error && <Text style={s.body}>{syncPending ? 'Ingen nye funn bekreftet ennå.' : 'Ingen nye samleobjekter på denne turen. Distanse og høydemeter teller fortsatt.'}</Text>}
    {rewards.milestones.length > 0 && <><Text style={s.subheading}>Nye milepæler</Text>{rewards.milestones.map(m => <Text key={m.id} style={s.body}>★ {m.title} · +{m.xp} XP</Text>)}<Text style={s.body}>+{rewards.xp} XP{rewards.levelAfter > rewards.levelBefore ? ` · Nivå ${rewards.levelAfter}!` : ''}</Text></>}
    {goals.filter(g => !g.needsRefresh).map(goal => <TripGoal key={goal.id} goal={goal} trip={trip} trips={trips} />)}
    {other.length > 0 && <><Text style={s.subheading}>Også på denne turen</Text><DiscoveryRows items={other} renderItem={item => <View key={item.id}><Pressable accessibilityRole="button" onPress={() => onMap(item)} style={{ paddingVertical: 8 }}><Text style={s.body}>{item.name}</Text><Text style={s.small}>{visited.progress[item.id].collected ? isUnnamedRoute(item) ? 'Registrert på turen' : 'Gått / besøkt igjen' : routeProgressLabel(visited.progress[item.id])} · Vis på kartet →</Text></Pressable><RouteNameEditor item={item} onRename={onRename} /></View>} /></>}
  </View>;
}
function TripGoal({ goal, trip, trips }: { goal: Goal; trip: Trip; trips: Trip[] }) {
  const check = useCollectionProgress(goal.targets, trips);
  const rewards = useMemo(() => tripRewards(trip, trips, goal.targets, check.progress), [trip, trips, goal.targets, check.progress]);
  if (!rewards.newFinds.length) return null;
  const count = goal.targets.filter(i => check.progress[i.id]?.collected && rewards.throughIds.has(check.progress[i.id].earnedTripId ?? '')).length;
  return <Text style={s.body}>{goal.title}: +{rewards.newFinds.length} · {count}/{goal.targets.length}{!check.pending && count === goal.targets.length ? ' · Mål oppnådd!' : ''}</Text>;
}
