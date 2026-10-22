import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { component } from './support/component';
const flatten = (value: any): any => Array.isArray(value) ? Object.assign({}, ...value.map(flatten)) : value ?? {};
function harness(initial: unknown = 1) {
  let stored = initial;
  const writes: unknown[] = [];
  const native = { View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', StyleSheet: { flatten, create: (s: any) => s }, PanResponder: { create: (handlers: any) => ({ panHandlers: handlers }) } };
  const theme = { colors: { ink: '#123', paper: '#fff' }, styles: {} };
  const components = component('src/ui/components.tsx', { 'react-native': native, 'react-native-svg': { default: 'Svg', Circle: 'Circle', Path: 'Path', Polyline: 'Polyline' }, './theme': theme });
  const reading = component('src/ui/ReadingPanel.tsx', { 'react-native': native, './components': components, './theme': theme, '../data/native': { getStore: () => ({ setting: () => stored, setSetting: (_: string, value: unknown) => { stored = value; writes.push(value); } }) } });
  return { ...reading, writes };
}
const touch = (distance: number, count = 2) => ({ nativeEvent: { touches: [{ pageX: 0, pageY: 0 }, { pageX: distance, pageY: 0 }].slice(0, count) } });

test('reader reflows name and buttons together, persists size, keeps actions and permits reset', async t => {
  const h = harness(); let actions = 0, tree!: ReactTestRenderer;
  const content = () => React.createElement(h.ReadingPanel, null,
    React.createElement(h.ReadingText, { testID: 'name', style: [{ fontSize: 22 }, { lineHeight: 28 }] }, 'Absalon Beyers gate'),
    React.createElement(h.ReadingButton, { title: 'Velg gate og start tur', accessibilityLabel: 'Start', onPress: () => actions++ }));
  await act(() => { tree = create(content()); });
  t.after(async () => act(() => tree.unmount()));
  const button = (label: string) => tree.root.findAllByType('Pressable' as any).find(n => n.props.accessibilityLabel === label)!;
  const nameStyle = () => flatten(tree.root.findAllByType('Text' as any).find(n => n.props.testID === 'name')!.props.style);
  assert.equal(nameStyle().fontSize, 22);
  assert.equal(button('Mindre tekst').props.disabled, true);
  for (let i = 0; i < 5; i++) await act(() => button('Større tekst').props.onPress());
  assert.equal(nameStyle().fontSize, 44); assert.equal(nameStyle().lineHeight, 56);
  assert.equal(button('Større tekst').props.disabled, true);
  const actionText = button('Start').findByType('Text' as any);
  assert.equal(actionText.props.style.fontSize, 30);
  assert.equal(actionText.props.style.flexShrink, 1);
  assert.equal(actionText.props.numberOfLines, undefined);
  await act(() => button('Start').props.onPress()); assert.equal(actions, 1);
  assert.equal(h.writes.at(-1), 2);
  await act(() => tree.unmount());
  await act(() => { tree = create(content()); });
  assert.equal(nameStyle().fontSize, 44);
  await act(() => button('Tekststørrelse 200 prosent. Tilbakestill').props.onPress());
  assert.equal(nameStyle().fontSize, 22); assert.equal(h.writes.at(-1), 1);
});

test('pinch claims only two fingers, saves on release/cancel and leaves single-finger scrolling available', async t => {
  const h = harness('bad'); let tree!: ReactTestRenderer;
  await act(() => { tree = create(React.createElement(h.ReadingPanel, null, React.createElement(h.ReadingText, { style: { fontSize: 20 } }, 'Stien'))); });
  t.after(async () => act(() => tree.unmount()));
  const gesture = () => tree.root.findByProps({ testID: 'reading-pinch' }).props;
  const scroll = () => tree.root.findByType('ScrollView' as any).props.scrollEnabled;
  const text = () => tree.root.findAllByType('Text' as any).find(n => n.props.children === 'Stien')!;
  assert.equal(gesture().onStartShouldSetPanResponderCapture(touch(100, 1)), false);
  assert.equal(gesture().onMoveShouldSetPanResponderCapture(touch(100)), true);
  assert.equal(gesture().onMoveShouldSetPanResponderCapture(touch(NaN)), false);
  await act(() => gesture().onPanResponderGrant(touch(100)));
  assert.equal(scroll(), false);
  await act(() => gesture().onPanResponderMove(touch(150)));
  assert.equal(flatten(text().props.style).fontSize, 30); assert.equal(h.writes.length, 0);
  await act(() => gesture().onPanResponderRelease());
  assert.equal(scroll(), true); assert.equal(h.writes.at(-1), 1.5);
  await act(() => gesture().onPanResponderGrant(touch(100)));
  await act(() => gesture().onPanResponderMove(touch(1000)));
  assert.equal(flatten(text().props.style).fontSize, 40);
  await act(() => gesture().onPanResponderTerminate());
  assert.equal(scroll(), true); assert.equal(h.writes.at(-1), 2);
});
