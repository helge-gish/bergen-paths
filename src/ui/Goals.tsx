import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { HomeArea } from '../domain/areas';
import type { Trip } from '../domain/types';
import { goalProgress, type Goal } from '../domain/goals';
import { searchPlaces, type Place } from '../services/osm';
import { Button } from './components';
import { TrailMap } from './TrailMap';
import { colors, styles as s } from './theme';

export function AreaPicker({ area, onSave, onHere }: { area: HomeArea | null; onSave: (area: HomeArea) => void; onHere: () => Promise<HomeArea> }) {
  const [query, setQuery] = useState(area?.name ?? ''), [name, setName] = useState(area?.name ?? '');
  const [selected, setSelected] = useState<HomeArea | null>(area), [places, setPlaces] = useState<Place[]>([]);
  const [radius, setRadius] = useState(area?.radius ?? 3000), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const run = async (fn: () => Promise<void>) => { setBusy(true); setMessage(''); try { await fn(); } catch (e) { setMessage(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); } };
  return <View style={s.card}>
    <Text style={s.subheading}>Ditt hjemmeområde · valgfritt</Text>
    <Text style={s.body}>Brukes til målforslag og kartstart. Alle turer teller også utenfor området.</Text>
    <TextInput accessibilityLabel="Søk etter by eller bygd" placeholder="By, bygd eller bydel" value={query} onChangeText={setQuery} maxLength={80} style={s.input} />
    <Button secondary title={busy ? 'Søker …' : 'Finn sted'} disabled={busy} onPress={() => void run(async () => { const results = await searchPlaces(query); setPlaces(results); if (!results.length) setMessage('Ingen treff. Bruk det lokale stedsnavnet eller din posisjon.'); })} />
    {places.map(p => <Pressable accessibilityRole="button" accessibilityLabel={`Velg område: ${p.label}`} key={p.id} onPress={() => { setSelected({ ...p, radius }); setName(p.name); setPlaces([]); }} style={{ paddingVertical: 10 }}><Text style={s.body}>{p.label}</Text></Pressable>)}
    <Button secondary title="Bruk min posisjon" disabled={busy} onPress={() => void run(async () => { const p = await onHere(); setSelected(p); setName(p.name); })} />
    {selected && <>
      <TrailMap focus={selected} position={selected} height={180} />
      <TextInput accessibilityLabel="Navn på hjemmeområdet" placeholder="Navn på området" value={name} onChangeText={setName} maxLength={60} style={s.input} />
      <Text style={s.small}>Området måles fra {selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)}. Navnet endrer ikke avgrensningen.</Text>
      <View style={s.row}>{[1000, 3000, 5000].map(r => <Pressable accessibilityRole="button" accessibilityState={{ selected: radius === r }} key={r} onPress={() => setRadius(r)} style={[s.chip, { backgroundColor: radius === r ? colors.ink : colors.pale }]}><Text style={{ color: radius === r ? colors.paper : colors.ink }}>{r / 1000} km radius</Text></Pressable>)}</View>
      <Button title="Lagre hjemmeområde" disabled={!name.trim() || busy} onPress={() => { onSave({ latitude: selected.latitude, longitude: selected.longitude, name: name.trim(), radius }); setMessage('Hjemmeområdet er lagret. Finn mål i Turpass.'); }} />
    </>}
    {!!message && <Text style={s.small}>{message}</Text>}
  </View>;
}
export function Goals({ goals, catalog, trips, busy, onToggle, onLoad, onBergen, onArea }: { goals: Goal[]; catalog: Goal[]; trips: Trip[]; busy: boolean; onToggle: (goal: Goal) => void; onLoad: () => void; onBergen: () => void; onArea: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const entries = useMemo(() => [...goals, ...catalog.filter(g => !goals.some(a => a.id === g.id))].map(g => ({ goal: g, progress: goalProgress(g, trips), active: goals.some(a => a.id === g.id) })), [goals, catalog, trips]);
  return <View style={{ gap: 16 }}>
    <Text style={s.heading}>Målbibliotek</Text>
    <Text style={s.body}>Velg personlige mål. Alle turer samler stempler uansett hvilke mål du har aktivert. Tidligere turer teller også.</Text>
    <Button secondary title="Velg hjemmeområde" onPress={onArea} />
    <Button secondary title={busy ? 'Henter mål …' : 'Lag målforslag for hjemmeområdet'} disabled={busy} onPress={onLoad} />
    <Button secondary title="Hent målet: De syv byfjellene i Bergen" disabled={busy} onPress={onBergen} />
    {entries.map(({ goal, progress, active }) => <View key={goal.id} style={s.card}>
      <Text style={s.eyebrow}>{active ? progress.complete ? 'MÅL OPPNÅDD' : 'DITT MÅL' : 'FORSLAG'}</Text>
      <Text style={s.subheading}>{goal.title}</Text>
      <Text style={s.heading}>{progress.collected} / {progress.total}</Text>
      <Text style={s.body}>{goal.description}</Text>
      <Button secondary title={active ? 'Deaktiver mål' : 'Aktiver som mitt mål'} onPress={() => onToggle(goal)} />
      <Pressable accessibilityRole="button" onPress={() => setExpanded(expanded === goal.id ? null : goal.id)}><Text style={s.small}>{expanded === goal.id ? 'Skjul innhold' : 'Se hva målet inneholder'}</Text></Pressable>
      {expanded === goal.id && <Text style={s.small}>{goal.targets.map(t => t.name).join(' · ')}</Text>}
    </View>)}
    <Text style={s.small}>Aktive mål beholder kartutvalget de startet med. OSM kan mangle steder og gater. Dette er personlige mål på mobilen; vennelister og rangering er ikke koblet til ennå.</Text>
  </View>;
}
