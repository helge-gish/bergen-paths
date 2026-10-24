import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { component } from './support/component';
import { createAutomaticRecorder, type RecordingPreference } from '../src/domain/automaticRecording';
import * as nature from '../src/domain/nature';
import * as natureTiming from '../src/domain/natureTiming';
import * as metrics from '../src/domain/metrics';
import * as peg from '../src/domain/activePeg';
import * as finder from '../src/domain/trailFinder';
test('Tråkk setup activates once, pause survives reopening, nature-only map retains the logo and old log', async t => {
  let preference: RecordingPreference = 'unconfigured', active: any = null, starts = 0, appState: (s: string) => void = () => {};
  const items = [{ id: 'wood', name: 'Skogsti', kind: 'trail', osmHighway: 'path', surface: 'ground', latitude: 60, longitude: 5, geometry: [{ latitude: 60, longitude: 5 }, { latitude: 60.001, longitude: 5 }], sourceUrl: '', fetchedAt: 1 }, { id: 'city', name: 'Gangvei', kind: 'trail', osmHighway: 'footway', surface: 'asphalt', latitude: 60, longitude: 5, geometry: [{ latitude: 60, longitude: 5 }, { latitude: 60.001, longitude: 5 }], sourceUrl: '', fetchedAt: 1 }];
  const trips: any[] = [], trails: any[] = [];
  const store = { active: () => active, trips: () => trips, trails: () => trails, setting: (key: string, fallback: unknown) => key === 'automaticRecording' ? preference : key === 'natureDiscoveries' ? items : key === 'natureMapFetched' ? { '12000:1000:3000': Date.now() } : fallback, segmentWindow: () => ({ from: 1 }) };
  const recorder = createAutomaticRecorder({ preference: () => preference, setPreference: p => { preference = p; }, active: () => !!active, running: async () => !!active, start: async () => { starts++; active = { id: 'auto', startedAt: Date.now(), endedAt: null, points: [], name: '', ghostId: null, audioEnabled: false, lastCueAt: 0 }; }, resume: async () => {}, finish: async () => { active = null; } });
  const native = { ActivityIndicator: 'ActivityIndicator', Alert: {}, AppState: { currentState: 'active', addEventListener: (_: string, cb: typeof appState) => { appState = cb; return { remove() {} }; } }, Image: 'Image', Linking: {}, Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View' };
  const { Trakk } = component('App.tsx', {
    'react-native': native, 'react-native-safe-area-context': { SafeAreaProvider: 'SafeAreaProvider', SafeAreaView: 'SafeAreaView' }, 'expo-status-bar': { StatusBar: 'StatusBar' }, './assets/trakk-icon.png': 1,
    './src/data/native': { getStore: () => store }, './src/services/automaticRecording': { automaticRecorder: recorder }, './src/services/natureMap': { fetchNatureMap: async () => { throw new Error('Cached map should be used'); } },
    './src/domain/nature': nature, './src/domain/natureTiming': natureTiming, './src/domain/metrics': metrics, './src/domain/activePeg': peg, './src/domain/trailFinder': finder,
    './src/ui/useNearbyArea': { useNearbyArea: () => ({ area: { latitude: 60, longitude: 5 }, radius: 3000, live: true, lastSeen: Date.now(), setRadius() {} }) }, './src/ui/useNatureTiming': { useNatureTiming: () => ({ results: [], pending: false }) },
    './src/ui/TrailMap': { TrailMap: 'TrailMap' }, './src/ui/TrailFinder': { TrailFinder: 'TrailFinder' }, './src/ui/ExploreSurface': { ExploreSurface: (p: any) => React.createElement('ExploreSurface', p, p.map) }, './src/ui/StretchResults': { StretchResults: 'StretchResults' }, './src/ui/Workout': { WorkoutCard: 'WorkoutCard' }, './src/domain/workout': {}, './src/services/workoutCoach': {},
    './src/ui/components': { Button: 'Button', Icon: 'Icon', Metric: 'Metric' }, './src/ui/Goals': { RadiusPicker: 'RadiusPicker' }, './src/services/export': {}, './src/ui/theme': { colors: {}, styles: {} },
  });
  const initial = () => ({ active, trips, trails, items, preference, error: null, limited: false });
  let tree!: ReactTestRenderer;
  await act(() => { tree = create(React.createElement(Trakk, { initial: initial() })); });
  t.after(async () => act(() => tree.unmount()));
  assert.equal(starts, 0);
  assert.equal(tree.root.findAllByType('Image' as any).length, 1);
  assert.deepEqual(tree.root.findByType('TrailMap' as any).props.discoveries.map((i: any) => i.id), ['wood']);
  assert.doesNotMatch(tree.root.findAllByType('Button' as any).map(n => n.props.title).join(' '), /Start en tur|Gatekampen|avatar/);
  await act(() => tree.root.findByProps({ title: 'Tillat automatisk registrering' }).props.onPress());
  assert.equal(starts, 1); assert.equal(preference, 'enabled');
  await act(() => appState('active')); assert.equal(starts, 1);
  await act(() => tree.root.findByProps({ title: 'Pause' }).props.onPress());
  assert.equal(preference, 'paused'); assert.equal(active, null);
  await act(() => appState('active')); assert.equal(starts, 1);
  assert.equal(tree.root.findAllByProps({ title: 'Fortsett' }).length, 1);
});
