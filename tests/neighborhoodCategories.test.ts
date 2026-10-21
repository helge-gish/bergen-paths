import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { component } from './support/component';
import * as neighborhood from '../src/domain/neighborhood';
import * as rows from '../src/domain/discoveryRows';
import type { Discovery } from '../src/domain/discoveries';
const { NeighborhoodCard, NeighborhoodDetails } = component('src/ui/Neighborhood.tsx', {
  'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable' }, '../domain/neighborhood': neighborhood, '../domain/discoveryRows': rows,
  './DiscoveryRows': { DiscoveryRows: ({ rows, renderItem }: any) => React.createElement('View', {}, rows.map((row: any) => React.createElement(React.Fragment, { key: row.id }, renderItem(row)))) },
  './components': { Icon: 'Icon', Button: 'Button' }, './theme': { colors: {}, styles: {} },
});
test('three compact metrics open the requested category and details keep its progress and map target', async t => {
  const area = { latitude: 60, longitude: 5, radius: 1000, name: 'Her' };
  const item = (kind: Discovery['kind']): Discovery => ({ ...area, id: kind, name: kind, kind, geometry: [area, { ...area, latitude: 60.001 }], fetchedAt: 0, sourceUrl: '' });
  const progress = { steps: { fraction: 1, collected: true, firstVisit: 1 }, trail: { fraction: .4, collected: false, firstVisit: 1 } };
  const results = Object.fromEntries(['street', 'steps', 'trail'].map(kind => [kind, neighborhood.neighborhoodStreets(rows.discoveryRows([item(kind as Discovery['kind'])]), area, progress)]));
  let selected = '', mapped: Discovery | null = null, card!: ReactTestRenderer, detail!: ReactTestRenderer;
  const shared = { results, area, pending: false, error: null, live: true };
  await act(() => { card = create(React.createElement(NeighborhoodCard, { ...shared, onPress: (kind: string) => { selected = kind; } })); });
  t.after(async () => act(() => { card.unmount(); detail?.unmount(); }));
  assert.equal(card.root.findByProps({ accessibilityLabel: 'Andel trapper gått' }).props.accessibilityValue.now, 1);
  assert.equal(card.root.findByProps({ accessibilityLabel: 'Andel stier gått' }).props.accessibilityValue.now, 0);
  const stairButton = card.root.findAllByType('Pressable' as any).find(n => n.props.accessibilityLabel.startsWith('1 av 1 trapper gått'))!;
  await act(() => stairButton.props.onPress()); assert.equal(selected, 'steps');
  await act(() => { detail = create(React.createElement(NeighborhoodDetails, { ...shared, initialKind: selected, progress, onMap: (value: Discovery) => { mapped = value; }, onSync() {}, onRetry() {}, busy: false, syncError: null })); });
  assert.equal(detail.root.findByProps({ accessibilityLabel: 'Vis trapper' }).props.accessibilityState.selected, true);
  const complete = detail.root.findAllByType('Pressable' as any).find(n => n.findAllByType('Text' as any).some(text => Array.isArray(text.props.children) && text.props.children[0] === 'Fullført'))!;
  await act(() => complete.props.onPress());
  await act(() => detail.root.findByProps({ accessibilityLabel: 'Vis steps i kartet' }).props.onPress()); assert.equal(mapped!.id, 'steps');
  await act(() => detail.root.findByProps({ accessibilityLabel: 'Vis stier' }).props.onPress());
  assert.ok(detail.root.findByProps({ accessibilityLabel: 'Vis trail i kartet' }));
  assert.match(JSON.stringify(detail.toJSON()), /85 %/);
  await act(() => card.update(React.createElement(NeighborhoodCard, { ...shared, area: null, onPress() {} })));
  assert.equal(card.root.findAllByProps({ accessibilityRole: 'progressbar' }).length, 0);
});
