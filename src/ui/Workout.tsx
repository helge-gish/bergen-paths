import React from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';
import type { Trip } from '../domain/types';
import { countdown, workoutStatus, workoutPlan, workoutPlans, type WorkoutKind } from '../domain/workout';
import { colors, styles as s } from './theme';
import { Button, Icon } from './components';
import { syncTripStatus } from '../services/tripStatus';
import { getStore } from '../data/native';
import { syncWorkoutCoach, workoutAvailable, workoutVoiceError } from '../services/workoutCoach';
export function WorkoutPicker({ value, onChange }: { value: 'free' | WorkoutKind; onChange: (value: 'free' | WorkoutKind) => void }) {
  const choices = [{ kind: 'free' as const, name: 'Fritt tempo', description: 'Gå som vanlig, i ditt eget tempo.' }, ...workoutPlans];
  return <View style={s.card}><Text style={s.subheading}>Hvordan vil du gå?</Text>
    {choices.map(p => <Pressable key={p.kind} accessibilityRole="radio" accessibilityState={{ checked: value === p.kind, disabled: p.kind !== 'free' && !workoutAvailable }} accessibilityLabel={p.name} disabled={p.kind !== 'free' && !workoutAvailable} onPress={() => onChange(p.kind)} style={{ padding: 14, borderRadius: 12, borderWidth: 2, borderColor: value === p.kind ? colors.ink : colors.line, backgroundColor: value === p.kind ? colors.pale : colors.white }}><Text style={s.subheading}>{value === p.kind ? '● ' : '○ '}{p.name}</Text><Text style={s.small}>{p.description}</Text></Pressable>)}
    {!workoutAvailable && <Text style={s.small}>Treningsmodus er tilgjengelig i Android-appen.</Text>}
  </View>;
}
export function WorkoutCard({ trip, now, onChange }: { trip: Trip; now: number; onChange?: () => void }) {
  const w = trip.workout;
  if (!w) return null;
  const plan = workoutPlan(w.kind);
  const status = workoutStatus(w, now), finished = trip.endedAt !== null || w.endedAt !== null || status.complete;
  const change = async (action: 'pause' | 'resume' | 'stop' | 'mute' | 'unmute') => {
    getStore().updateWorkout(trip.id, action);
    try { await Promise.all([syncWorkoutCoach(getStore().active()), syncTripStatus(getStore().active())]); }
    catch { Alert.alert('Taletreneren kunne ikke oppdateres', 'Åpne appen igjen. Turen og treningsklokken er lagret.'); }
    onChange?.();
  };
  const error = workoutVoiceError();
  return <View style={[s.card, { backgroundColor: status.current?.kind === 'fast' && !finished ? '#F5E9CF' : colors.pale }]}>
    <Text style={s.eyebrow}>{plan.name}</Text>
    {finished ? <><View style={s.row}><Icon name={status.complete ? 'check' : 'clock'} /><Text style={[s.heading, { flex: 1 }]}>{status.complete ? `${plan.name} fullført!` : `${plan.name} avsluttet tidlig`}</Text></View><Text style={s.body}>{status.rounds} av {plan.rounds} drag fullført · {countdown(Math.floor(status.elapsed / 1000))} treningstid.</Text><Text style={s.small}>{status.complete ? 'Du fulgte hele tidsprogrammet. Innsats og puls er ikke målt.' : 'Fremgangen er lagret sammen med turen.'}{trip.endedAt === null ? ' Turen registreres videre i fritt tempo.' : ''}</Text></> : <>
      <Text accessibilityLiveRegion="polite" style={s.heading}>{status.paused ? 'Treningen er satt på pause' : status.current?.label}</Text>
      <Text accessibilityLabel={`${countdown(status.remaining)} igjen i fasen`} style={{ fontSize: 44, fontWeight: '700', color: colors.ink, fontVariant: ['tabular-nums'] }}>{countdown(status.remaining)}</Text>
      <Text style={s.body}>{status.paused ? 'Treningsklokken står stille. Tid og GPS for hele turen fortsetter.' : `Neste: ${status.next?.label ?? 'Fritt tempo · økten er ferdig'}`}</Text>
      <Text style={s.small}>{status.rounds} av {plan.rounds} drag fullført · {countdown(Math.ceil((plan.totalMs - status.elapsed) / 1000))} igjen av økten</Text>
      <View style={s.between}><Text style={[s.body, { flex: 1 }]}>Taletrener og påminnelser</Text><Switch accessibilityLabel={`Lyd fra ${plan.name}`} value={w.audioEnabled} onValueChange={value => void change(value ? 'unmute' : 'mute')} /></View>
      {error && <Text style={s.small}>{error}</Text>}
      <Button secondary title={status.paused ? `Fortsett ${plan.name}` : `Pause ${plan.name}`} onPress={() => void change(status.paused ? 'resume' : 'pause')} />
      <Button secondary title={`Fritt tempo · avslutt ${plan.name}`} onPress={() => void change('stop')} />
    </>}
  </View>;
}
