import { Pressable, Text, View } from 'react-native';
import { mapInk, mapTrailKind } from '../domain/mapPresentation';
import { trailFacts } from '../domain/trailFacts';
import { shortDistance } from '../domain/metrics';
import { needsDiscoveryName } from '../domain/discoveryGroups';
import type { Discovery } from '../domain/discoveries';
import { colors, styles as s } from './theme';
import { useMemo } from 'react';

function KeyLine({ color, dashed = false, label }: { color: string; dashed?: boolean; label: string }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 24, borderTopWidth: 3, borderColor: color, borderStyle: dashed ? 'dashed' : 'solid' }} /><Text style={s.small}>{label}</Text></View>;
}
export function MapKey({ track, history, reference, expanded, onToggle }: { track: boolean; history: boolean; reference: boolean; expanded: boolean; onToggle: () => void }) {
  return <View style={{ paddingHorizontal: 10, paddingVertical: 6, gap: 8 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
      {track && <KeyLine color={mapInk.track} label="Ditt spor" />}
      {history && <KeyLine color={mapInk.history} label="Tidligere turer" />}
      <KeyLine color={mapInk.path} dashed label="Sti" />
      <Pressable accessibilityRole="button" accessibilityLabel="Tegnforklaring for kartet" accessibilityState={{ expanded }} onPress={onToggle} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={s.chipText}>{expanded ? 'Skjul forklaring ↑' : 'Tegnforklaring ⓘ'}</Text></Pressable>
    </View>
    {expanded && <View style={{ gap: 7 }}>
      <Text style={s.small}>Blått med hvit kant er sporet som vises nå. Lilla viser tidligere turer. Den blå MEG-markøren viser posisjonen din. Pilen viser retningen mobilen peker når kompasset er tilgjengelig; SIST betyr sist kjente posisjon.</Text>
      <KeyLine color={mapInk.path} dashed label="Sti / småsti · stiplet" />
      <KeyLine color={mapInk.footway} label="Gangvei · heltrukket" />
      <Text style={s.small}>Korte, tette streker viser trapper. Stitypen sier ikke hvor lett eller godt vedlikeholdt stien er. Trykk på en fremhevet sti for informasjon.</Text>
      {reference && <KeyLine color={mapInk.selected} dashed label="Skyggens rute" />}
      <Text style={s.small}>Korall fremhever valgt sti. Bakgrunnskartets tynne brune høydekurver viser terreng; tett mellom kurvene betyr brattere. Blå flater er vann. Kartverkets merkede fotruter ligger også i kartet.</Text>
      <Text style={s.small}>Noen stier finnes bare i kartbildet. De kan ikke trykkes på før vi har egne stidata for området.</Text>
    </View>}
  </View>;
}
export function MapTrailCard({ item, onClose, onStart }: { item: Discovery; onClose: () => void; onStart?: () => void }) {
  const facts = useMemo(() => trailFacts([item]), [item]);
  const kind = mapTrailKind(item);
  const label = kind === 'steps' ? 'Trapp' : kind === 'footway' ? 'Gangvei' : 'Sti / småsti';
  return <View accessibilityLiveRegion="polite" style={{ padding: 14, gap: 6, backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.line }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={{ flex: 1 }}><Text style={s.subheading}>{needsDiscoveryName(item) ? label : item.name}</Text><Text style={s.small}>{label} · {shortDistance(facts.length)} kartlagt del</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Lukk stiinfo" onPress={onClose} style={{ padding: 12, minHeight: 44 }}><Text style={s.subheading}>×</Text></Pressable></View>
    <Text style={s.small}>Vanskelighetsgrad: {facts.grade ?? 'Ikke registrert'}{facts.grade ? ' (SAC)' : ''} · Høydemeter: ikke registrert</Text>
    {onStart && <Pressable accessibilityRole="button" accessibilityLabel="Finn start med AR" onPress={onStart} style={{ minHeight: 48, padding: 12, borderRadius: 12, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.paper, fontWeight: '700' }}>Finn start med AR →</Text></Pressable>}
    <Text style={s.small}>Lengden gjelder den markerte stidelen, ikke en komplett tur. Kartdata: OpenStreetMap.</Text>
  </View>;
}
