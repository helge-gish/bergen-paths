import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Location from 'expo-location';
import type { Fix, Trail } from '../domain/types';
import { bearing, nearestOnTrail, relativeBearing } from '../domain/geo';
import { shortDistance } from '../domain/metrics';
import { toFix } from '../services/tracking';
import { colors, styles as s } from './theme';
import { Empty, Icon } from './components';
export function Compass({ trails, onOpen }: { trails: Trail[]; onOpen: (trail: Trail) => void }) {
  const [position, setPosition] = useState<Fix | null>(null), [heading, setHeading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true, gps: Location.LocationSubscription | undefined, compass: Location.LocationSubscription | undefined;
    (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Tillat posisjon for å finne stiene rundt deg.');
      gps = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 2 }, p => { if (mounted) setPosition(toFix(p)); });
      if (!mounted) { gps.remove(); return; }
      compass = await Location.watchHeadingAsync(h => { if (mounted) setHeading(h.accuracy > 0 ? (h.trueHeading >= 0 ? h.trueHeading : null) : null); });
      if (!mounted) compass.remove();
    })().catch(e => { if (mounted) setError(e.message); });
    return () => { mounted = false; gps?.remove(); compass?.remove(); };
  }, []);
  const nearby = position && position.accuracy <= 35 ? trails.map(t => ({ trail: t, nearest: nearestOnTrail(position, t.points) })).filter(t => t.nearest && t.nearest.distance <= 10_000).sort((a, b) => a.nearest!.distance - b.nearest!.distance).slice(0, 8) : [];
  return <View style={{ gap: 20 }}><Text style={s.body}>Hold mobilen flatt og pek mot en sti. Pilene viser retning til nærmeste punkt på dine navngitte stier.</Text>
    <View style={{ alignSelf: 'center', width: 210, height: 210, borderRadius: 110, backgroundColor: colors.pale, borderWidth: 1, borderColor: '#B6C7AC', alignItems: 'center', justifyContent: 'center' }}><Text style={[s.eyebrow, { position: 'absolute', top: 14 }]}>FORAN DEG</Text><Text style={{ fontSize: 60, color: colors.ink }}>↑</Text><Text style={s.small}>{heading === null ? 'Venter på kompass' : `${Math.round(heading)}°`}</Text></View>
    {error && <Text style={s.body}>{error}</Text>}
    {!position && !error && <Text style={s.body}>Finner posisjonen din …</Text>}
    {position && position.accuracy > 35 && <Text style={s.body}>GPS-posisjonen er for usikker. Prøv under åpen himmel.</Text>}
    {heading === null && <Text style={s.small}>Kompassretningen er usikker. Beveg mobilen rolig i et åttetall, unna metall.</Text>}
    {nearby.map(({ trail, nearest }) => <Pressable key={trail.id} accessibilityRole="button" accessibilityLabel={`Åpne sti: ${trail.name}`} onPress={() => onOpen(trail)} style={[s.card, s.row]}><Text style={{ fontSize: 32, color: colors.ink, transform: [{ rotate: `${heading !== null ? relativeBearing(bearing(position!, nearest!.coordinate), heading) : 0}deg` }] }}>{heading === null ? '·' : '↑'}</Text><View style={{ flex: 1 }}><Text style={s.subheading}>{trail.name}</Text><Text style={s.small}>{shortDistance(nearest!.distance)} i luftlinje</Text><Text style={s.small}>Åpne sti og velg skygge →</Text></View></Pressable>)}
    {position && !nearby.length && <Empty title="Ingen navngitte stier i nærheten" icon="compass">Lagre en sti fra turloggen. Egne stier innen 10 km dukker opp her.</Empty>}
    {trails.length > 0 && <><Text style={s.heading}>Alle lagrede stier</Text>{trails.map(trail => <Pressable key={trail.id} accessibilityRole="button" accessibilityLabel={`Åpne sti: ${trail.name}`} onPress={() => onOpen(trail)} style={[s.card, s.between]}><View style={{ flex: 1 }}><Text style={s.subheading}>{trail.name}</Text><Text style={s.small}>Se hele stien og gå med skygge</Text></View><Icon name="arrow" /></Pressable>)}</>}
    <Text style={s.small}>Retning og luftlinjeavstand er ikke veivisning langs terrenget. Dette er kompassvisning, ikke kamera-AR.</Text>
  </View>;
}
