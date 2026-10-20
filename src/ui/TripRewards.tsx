import { MilestoneMedals } from './MilestoneMedals';
import { RouteNameEditor } from './RouteNameEditor';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { type Discovery, type Progress } from '../domain/discoveries';
import type { Goal } from '../domain/goals';
import { tripRewards } from '../domain/tripRewards';
import type { Trip } from '../domain/types';
import { useCollectionProgress } from './useCollectionProgress';
import { DiscoveryRows } from './DiscoveryRows';
import { needsDiscoveryName } from '../domain/discoveryGroups';
import { colors, styles as s } from './theme';
import { discoveryRows, rowKinds, rowProgress, rowProgressLabel, tripDiscoveryRows } from '../domain/discoveryRows';

export function TripRewards({ trip, trips, items, progress, visited, pending, syncPending, error, goals, onMap, onRename }: { trip: Trip; trips: Trip[]; items: Discovery[]; progress: Record<string, Progress>; visited: ReturnType<typeof useCollectionProgress>; pending: boolean; syncPending: boolean; error: string | null; goals: Goal[]; onMap: (item: Discovery) => void; onRename: (item: Discovery, name: string) => void }) {
  const rewards = useMemo(() => tripRewards(trip, trips, items, progress), [trip, trips, items, progress]);
  const rows = useMemo(() => discoveryRows(items), [items]);
  const { fresh, other } = useMemo(() => tripDiscoveryRows(rows, trip.id, progress, visited.progress), [rows, trip.id, progress, visited.progress]);
  return <View style={[s.card, { borderColor: colors.ink }]}>
    <Text style={s.heading}>Dette fikk du på turen</Text>
    {(pending || visited.pending) && <Text accessibilityLiveRegion="polite" style={s.small}>Sjekker turens funn … {visited.processed} av {visited.total}. Funnene vises underveis.</Text>}
    {syncPending && <Text style={s.small}>Noen kartdata mangler ennå. Funn kan komme til senere; turen er lagret.</Text>}
    {(error || visited.error) && <Text style={s.small}>Funnene er ikke ferdig sjekket. Se status og prøv igjen i Deg → Samlingen min.</Text>}
    <MilestoneMedals milestones={rewards.milestones} xp={rewards.xp} levelBefore={rewards.levelBefore} levelAfter={rewards.levelAfter} />
    <Text style={s.subheading}>Nye funn · {fresh.length}</Text>
    <DiscoveryRows rows={fresh} renderItem={row => <View key={row.id}><Pressable accessibilityRole="button" onPress={() => onMap(row.item)} style={{ paddingVertical: 6 }}><Text style={s.subheading}>{rowProgress(row, progress).complete ? '✓ ' : ''}{row.item.name}</Text><Text style={s.small}>{rowKinds(row)} · {row.members.length > 1 ? rowProgressLabel(row, progress) : 'Ny i samlingen'}</Text><Text style={s.small}>Vis på kartet →</Text></Pressable>{row.members.length === 1 && <RouteNameEditor item={row.item} onRename={onRename} />}</View>} />
    {!fresh.length && !pending && !error && <Text style={s.body}>{syncPending ? 'Ingen nye funn bekreftet ennå.' : 'Ingen nye samleobjekter på denne turen. Distanse og høydemeter teller fortsatt.'}</Text>}
    {goals.filter(g => !g.needsRefresh).map(goal => <TripGoal key={goal.id} goal={goal} trip={trip} trips={trips} />)}
    {other.length > 0 && <><Text style={s.subheading}>Også på denne turen</Text><DiscoveryRows rows={other} renderItem={row => <View key={row.id}><Pressable accessibilityRole="button" onPress={() => onMap(row.item)} style={{ paddingVertical: 6 }}><Text style={s.body}>{row.item.name}</Text><Text style={s.small}>{row.members.length === 1 && rowProgress(row, visited.progress).complete ? needsDiscoveryName(row.item) ? 'Registrert på turen' : 'Gått / besøkt igjen' : rowProgressLabel(row, visited.progress)}</Text><Text style={s.small}>Vis på kartet →</Text></Pressable>{row.members.length === 1 && <RouteNameEditor item={row.item} onRename={onRename} />}</View>} /></>}
  </View>;
}
function TripGoal({ goal, trip, trips }: { goal: Goal; trip: Trip; trips: Trip[] }) {
  const check = useCollectionProgress(goal.targets, trips);
  const rewards = useMemo(() => tripRewards(trip, trips, goal.targets, check.progress), [trip, trips, goal.targets, check.progress]);
  if (!rewards.newFinds.length) return null;
  const count = goal.targets.filter(i => check.progress[i.id]?.collected && rewards.throughIds.has(check.progress[i.id].earnedTripId ?? '')).length;
  return <Text style={s.body}>{goal.title}: +{rewards.newFinds.length} · {count}/{goal.targets.length}{!check.pending && count === goal.targets.length ? ' · Mål oppnådd!' : ''}</Text>;
}
