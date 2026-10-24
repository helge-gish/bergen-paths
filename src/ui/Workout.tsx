import React from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';
import type { Trip } from '../domain/types';
import { countdown, workoutStatus } from '../domain/workout';
import { colors, styles as s } from './theme';
import { Button, Icon } from './components';
import { getStore } from '../data/native';
import { syncWorkoutCoach, workoutAvailable, workoutVoiceError } from '../services/workoutCoach';
export function WorkoutPicker({ value, onChange }: { value: 'free' | '4x4'; onChange: (value: 'free' | '4x4') => void }) {
  return <View style={s.card}><Text style={s.subheading}>Hvordan vil du gå?</Text>
    {(['free', '4x4'] as const).map(mode => <Pressable key={mode} accessibilityRole="radio" accessibilityState={{ checked: value === mode, disabled: mode === '4x4' && !workoutAvailable }} accessibilityLabel={mode === 'free' ? 'Fritt tempo' : '4×4-trener · beta'} disabled={mode === '4x4' && !workoutAvailable} onPress={() => onChange(mode)} style={{ padding: 14, borderRadius: 12, borderWidth: 2, borderColor: value === mode ? colors.ink : colors.line, backgroundColor: value === mode ? colors.pale : colors.white }}><Text style={s.subheading}>{value === mode ? '● ' : '○ '}{mode === 'free' ? 'Fritt tempo' : '4×4-trener · beta'}</Text><Text style={s.small}>{mode === 'free' ? 'Gå som vanlig, i ditt eget tempo.' : '35 minutter med vekslende rask og rolig gange.'}</Text></Pressable>)}
    {value === '4x4' && <Text style={s.small}>35 min · 5 min oppvarming, 4 × 4 min rask gange med rolige pauser, 5 min nedtrapping. Vibrasjon ved faseskifte, også med talelyden av.</Text>}
    {!workoutAvailable && <Text style={s.small}>4×4-betaen er tilgjengelig i Android-appen.</Text>}
  </View>;
}
export function WorkoutCard({ trip, now, onChange }: { trip: Trip; now: number; onChange?: () => void }) {
  const w = trip.workout;
  if (!w) return null;
  const status = workoutStatus(w, now), finished = trip.endedAt !== null || w.endedAt !== null || status.complete;
  const change = async (action: 'pause' | 'resume' | 'stop' | 'mute' | 'unmute') => {
    getStore().updateWorkout(trip.id, action);
    try { await syncWorkoutCoach(getStore().active()); }
    catch { Alert.alert('Taletreneren kunne ikke oppdateres', 'Åpne appen igjen. Turen og treningsklokken er lagret.'); }
    onChange?.();
  };
  const error = workoutVoiceError();
  return <View style={[s.card, { backgroundColor: status.current?.kind === 'fast' && !finished ? '#F5E9CF' : colors.pale }]}>
    <Text style={s.eyebrow}>4×4-TRENER · BETA</Text>
    {finished ? <><View style={s.row}><Icon name={status.complete ? 'check' : 'clock'} /><Text style={[s.heading, { flex: 1 }]}>{status.complete ? '4×4-økt fullført!' : '4×4-økten ble avsluttet tidlig'}</Text></View><Text style={s.body}>{status.rounds} av 4 raske drag fullført · {countdown(Math.floor(status.elapsed / 1000))} treningstid.</Text><Text style={s.small}>{status.complete ? 'Du fulgte hele tidsprogrammet. Innsats og puls er ikke målt.' : 'Fremgangen er lagret sammen med turen.'}{trip.endedAt === null ? ' Turen registreres videre i fritt tempo.' : ''}</Text></> : <>
      <Text accessibilityLiveRegion="polite" style={s.heading}>{status.paused ? 'Treningen er satt på pause' : status.current?.label}</Text>
      <Text accessibilityLabel={`${countdown(status.remaining)} igjen i fasen`} style={{ fontSize: 44, fontWeight: '700', color: colors.ink, fontVariant: ['tabular-nums'] }}>{countdown(status.remaining)}</Text>
      <Text style={s.body}>{status.paused ? 'Treningsklokken står stille. Tid og GPS for hele turen fortsetter.' : `Neste: ${status.next?.label ?? 'Fritt tempo · økten er ferdig'}`}</Text>
      <Text style={s.small}>{status.rounds} av 4 raske drag fullført · {countdown(Math.ceil((35 * 60_000 - status.elapsed) / 1000))} igjen av økten</Text>
      <View style={s.between}><Text style={[s.body, { flex: 1 }]}>Taletrener og påminnelser</Text><Switch accessibilityLabel="Lyd fra 4×4-treneren" value={w.audioEnabled} onValueChange={value => void change(value ? 'unmute' : 'mute')} /></View>
      {error && <Text style={s.small}>{error}</Text>}
      <Button secondary title={status.paused ? 'Fortsett 4×4' : 'Pause 4×4'} onPress={() => void change(status.paused ? 'resume' : 'pause')} />
      <Button secondary title="Fritt tempo · avslutt 4×4" onPress={() => void change('stop')} />
    </>}
  </View>;
}
