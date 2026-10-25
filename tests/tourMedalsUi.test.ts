import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { component } from './support/component';
import * as domain from '../src/domain/tourMedals';
import * as metrics from '../src/domain/metrics';

test('tour summary exposes five totals, readable medal colors, first result and personal best improvement', async () => {
  const { TourMedals, MedalCount } = component('src/ui/TourMedals.tsx', {
    'react-native': { Text: 'Text', View: 'View' },
    'react-native-svg': { __esModule: true, default: 'Svg', Circle: 'Circle', Path: 'Path' },
    '../domain/tourMedals': domain, '../domain/metrics': metrics, './theme': { colors: {}, styles: {} },
  });
  const result: domain.TourResult = { version: 1, tripId: 'walk', endedAt: 10000000, totals: { trails: 4, stretches: 2, meters: 5200, ascent: 230, moving: 3600000, elapsed: 3900000, hasElevation: true }, passages: [], medals: [
    { id: 'trail', color: 'gold', category: 'trail-time', name: 'Skogsti', value: 90, first: false, previousBest: 120 },
    { id: 'meters', color: 'silver', category: 'meters', value: 5200, first: false, previousBest: 6000 },
    { id: 'ascent', color: 'bronze', category: 'ascent', value: 230, first: false, previousBest: 400 },
    { id: 'stretch', color: 'gold', category: 'stretch-time', name: 'Min bakke · motsatt vei', value: 130, first: true, previousBest: null },
  ] };
  let tree: ReturnType<typeof create>;
  await act(() => { tree = create(React.createElement(TourMedals, { result })); });
  const texts = tree!.root.findAllByType('Text' as any).map(n => n.children.join('')).join(' ');
  for (const label of ['4 stier · 2 strekk', '5,2 km', '230 høydemeter opp', '01:00:00 i bevegelse', '01:05:00 totalt', 'Gull · Skogsti', '00:00:30 raskere', 'Ny personlig rekord', 'Sølv · Distanse', 'Bronse · Høydemeter opp', 'Første resultat', 'Min bakke · motsatt vei']) assert.ok(texts.includes(label), label);
  assert.equal(tree!.root.findAllByProps({ accessibilityLabel: '2 gull' }).length, 1);
  await act(() => tree!.update(React.createElement(MedalCount, { medals: [] })));
  assert.equal(tree!.toJSON(), null);
  await act(() => tree!.unmount());
});
