import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { component } from './support/component';
import { createAutomaticRecorder, type RecordingPreference } from '../src/domain/automaticRecording';
import * as natureArea from '../src/domain/natureArea';
import * as natureTiming from '../src/domain/natureTiming';
import * as metrics from '../src/domain/metrics';
import * as peg from '../src/domain/activePeg';
import * as workout from '../src/domain/workout';
import * as finder from '../src/domain/trailFinder';
test('Tråkk setup activates once, pause survives reopening, nature-only map retains the logo and old log', async t => {
  let preference: RecordingPreference = 'unconfigured', active: any = null, starts = 0, denyPermission = true, nearbyCalls = 0, appState: (s: string) => void = () => {};
  const items = [{ id: 'wood', name: 'Skogsti', kind: 'trail', osmHighway: 'path', surface: 'ground', latitude: 60, longitude: 5, geometry: [{ latitude: 60, longitude: 5 }, { latitude: 60.001, longitude: 5 }], sourceUrl: '', fetchedAt: 1 }, { id: 'city', name: 'Gangvei', kind: 'trail', osmHighway: 'footway', surface: 'asphalt', latitude: 60, longitude: 5, geometry: [{ latitude: 60, longitude: 5 }, { latitude: 60.001, longitude: 5 }], sourceUrl: '', fetchedAt: 1 }];
  const trips: any[] = [], trails: any[] = [];
  const settings: Record<string, unknown> = {};
  const far = { ...items[0], id: 'far', longitude: 10, geometry: items[0].geometry.map(p => ({ ...p, longitude: 10 })) }; items.push(far);
  const store = { active: () => active, trips: () => trips, trails: () => trails, setting: (key: string, fallback: unknown) => key === 'automaticRecording' ? preference : key === 'natureDiscoveries' ? items : key === 'natureMapFetched' ? { '12000:1000:5000': Date.now() } : settings[key] ?? fallback, setSetting: (key: string, value: unknown) => { settings[key] = value; }, segmentWindow: () => ({ from: 1 }), startWorkout: (_: string, kind: workout.WorkoutKind) => { active = { ...active, workout: { ...workout.createWorkout(Date.now(), true, kind), id: 'training' } }; return active; } };
  const recorder = createAutomaticRecorder({ preference: () => preference, setPreference: p => { preference = p; }, active: () => !!active, running: async () => !!active, start: async () => { if (denyPermission) throw new Error('Gi posisjonstilgang'); starts++; active = { id: 'auto', startedAt: Date.now(), endedAt: null, points: [], name: '', ghostId: null, audioEnabled: false, lastCueAt: 0 }; }, resume: async () => {}, finish: async () => { active = null; } });
  const native = { ActivityIndicator: 'ActivityIndicator', Alert: {}, AppState: { currentState: 'active', addEventListener: (_: string, cb: typeof appState) => { appState = cb; return { remove() {} }; } }, Image: 'Image', Linking: {}, Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View' };
  const { Trakk } = component('App.tsx', {
    'react-native': native, 'react-native-safe-area-context': { SafeAreaProvider: 'SafeAreaProvider', SafeAreaView: 'SafeAreaView' }, 'expo-status-bar': { StatusBar: 'StatusBar' }, './assets/trakk-icon.png': 1,
    './src/data/native': { getStore: () => store }, './src/services/automaticRecording': { automaticRecorder: recorder }, './src/services/natureMap': { fetchNatureMap: async () => { throw new Error('Cached map should be used'); } },
    './src/services/areaConsent': { stageAreaConsent: () => false, approveAreaHere: async () => { settings.pendingNatureArea = null; settings.activeNatureArea = natureArea.natureArea(null, { latitude: 60, longitude: 5 }); } }, './src/ui/useNatureProgress': { useNatureProgress: () => ({ progress: {}, pending: false, error: null }) }, './src/ui/ProfileSettings': { ProfileSettings: 'ProfileSettings' }, './src/services/tripStatus': { syncTripStatus: async () => {} }, './src/domain/natureArea': natureArea, './src/domain/natureTiming': natureTiming, './src/domain/metrics': metrics, './src/domain/activePeg': peg, './src/domain/trailFinder': finder,
    './src/ui/useNearbyArea': { useNearbyArea: () => { nearbyCalls++; return { area: { latitude: 60, longitude: 5 }, radius: 5000, live: true, lastSeen: Date.now() }; } }, './src/ui/useNatureTiming': { useNatureTiming: () => ({ results: [], pending: false }) },
    './src/ui/TrailMap': { TrailMap: 'TrailMap' }, './src/ui/TrailFinder': { TrailFinder: 'TrailFinder' }, './src/ui/ExploreSurface': { ExploreSurface: (p: any) => React.createElement('ExploreSurface', p, p.trailing, p.map) }, './src/ui/StretchResults': { StretchResults: 'StretchResults' }, './src/ui/Workout': { WorkoutCard: 'WorkoutCard' }, './src/domain/workout': workout, './src/services/workoutCoach': { workoutAvailable: true, syncWorkoutCoach: async () => {} },
    './src/ui/components': { Button: 'Button', Icon: 'Icon', Metric: 'Metric' }, './src/ui/Goals': { RadiusPicker: 'RadiusPicker' }, './src/services/export': {}, './src/ui/theme': { colors: {}, styles: {} },
  });
  const initial = () => ({ active, trips, trails, items, preference, error: null, limited: false, pendingArea: settings.pendingNatureArea ?? null });
  let tree!: ReactTestRenderer;
  await act(() => { tree = create(React.createElement(Trakk, { initial: initial() })); });
  t.after(async () => act(() => tree.unmount()));
  assert.equal(starts, 0); assert.equal(nearbyCalls, 0);
  assert.equal(tree.root.findAllByType('Image' as any).length, 1);
  assert.equal(tree.root.findAllByType('TrailMap' as any).length, 0);
  assert.equal(tree.root.findAllByProps({ accessibilityRole: 'tab' }).length, 0);
  assert.deepEqual(tree.root.findAllByType('Button' as any).map(n => n.props.title), ['Start']);
  // Denied consent stays on the gate and cannot start location watchers or map fetches.
  await act(() => tree.root.findByProps({ title: 'Start' }).props.onPress());
  assert.equal(preference, 'unconfigured'); assert.equal(starts, 0); assert.equal(nearbyCalls, 0);
  await act(() => appState('active')); assert.equal(starts, 0);
  denyPermission = false;
  await act(() => tree.root.findByProps({ title: 'Start' }).props.onPress());
  assert.equal(starts, 1); assert.equal(preference, 'enabled');
  assert.deepEqual(tree.root.findByType('TrailMap' as any).props.discoveries.map((i: any) => i.id), ['wood']);
  assert.equal(tree.root.findByType('ExploreSurface' as any).props.camera.props.items.length, 1);
  const allText = () => tree.root.findAllByType('Text' as any).map(n => n.children.join('')).join(' ');
  assert.equal(tree.root.findAllByProps({ accessibilityRole: 'tab' }).length, 2);
  await act(() => tree.root.findAllByProps({ accessibilityRole: 'tab' })[1].props.onPress());
  assert.match(allText(), /0 av 1 stier gått/);
  await act(() => tree.root.findAllByProps({ accessibilityRole: 'tab' })[0].props.onPress());
  assert.equal(tree.root.findAllByType('RadiusPicker' as any).length, 0);
  await act(() => appState('active')); assert.equal(starts, 1);
  await act(() => tree.root.findByProps({ accessibilityLabel: 'Innstillinger' }).props.onPress());
  await act(() => tree.root.findByProps({ title: 'Endre område' }).props.onPress());
  const beforePin = settings.activeNatureArea;
  await act(() => tree.root.findAllByType('TrailMap' as any).find(n => n.props.onChooseArea)!.props.onChooseArea({ latitude: 60.0001, longitude: 5 }));
  assert.equal(settings.activeNatureArea, beforePin);
  await act(() => tree.root.findByProps({ title: 'Utforsk dette området' }).props.onPress());
  assert.equal((settings.activeNatureArea as any).latitude, 60.0001);
  await act(() => tree.root.findByProps({ accessibilityLabel: 'Velg treningsmodus' }).props.onPress());
  assert.equal(starts, 1);
  await act(() => tree.root.findByProps({ title: 'Japansk intervallgange · skru på' }).props.onPress());
  assert.equal(starts, 1); assert.equal(active.workout.kind, 'interval-walk');
  assert.equal(tree.root.findAllByType('Modal' as any).length, 0);
  await act(() => tree.root.findByProps({ title: 'Pause' }).props.onPress());
  assert.equal(preference, 'paused'); assert.equal(active, null);
  assert.equal(tree.root.findAllByType('TrailMap' as any).length, 0);
  assert.equal(tree.root.findAllByProps({ accessibilityRole: 'tab' }).length, 0);
  assert.deepEqual(tree.root.findAllByType('Button' as any).map(n => n.props.title), ['Start']);
  const callsAtPause = nearbyCalls;
  await act(() => appState('active')); assert.equal(starts, 1); assert.equal(nearbyCalls, callsAtPause);
  await act(() => tree.unmount());
  await act(() => { tree = create(React.createElement(Trakk, { initial: initial() })); });
  assert.equal(starts, 1); assert.equal(nearbyCalls, callsAtPause);
  await act(() => tree.root.findByProps({ title: 'Start' }).props.onPress());
  assert.equal(starts, 2); assert.equal((active as any).workout, undefined);
  await act(() => tree.root.findByProps({ title: 'Pause' }).props.onPress());
  settings.pendingNatureArea = natureArea.natureArea(null, { latitude: 4.7, longitude: -74.1 });
  await act(() => tree.unmount());
  await act(() => { tree = create(React.createElement(Trakk, { initial: initial() })); });
  assert.equal(tree.root.findAllByType('TrailMap' as any).length, 0);
  assert.equal(starts, 2);
  await act(() => tree.root.findByProps({ title: 'Utforsk her' }).props.onPress());
  assert.equal(starts, 3); assert.equal(settings.pendingNatureArea, null);
  assert.equal(tree.root.findAllByProps({ accessibilityRole: 'tab' }).length, 2);
  await act(() => tree.root.findAllByProps({ accessibilityRole: 'tab' })[1].props.onPress());
  assert.match(allText(), /0 av 1 stier gått/);
  await act(() => tree.root.findAllByProps({ accessibilityRole: 'tab' })[0].props.onPress());
});
