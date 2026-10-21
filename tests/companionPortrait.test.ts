import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { component } from './support/component';
import * as companion from '../src/domain/companion';

const { CompanionPortrait } = component('src/ui/CompanionPortrait.tsx', {
  'react-native': { View: 'View', Image: 'Image' },
  '../domain/companion': companion,
  '../../assets/trakk-friends.png': 'base-art',
  '../../assets/trakk-friends-equipped.png': 'equipped-art',
});

test('portrait switches male/female and all earned outfits without losing clipping or accessibility', async t => {
  let tree!: ReactTestRenderer;
  await act(() => { tree = create(React.createElement(CompanionPortrait, { variant: 'male', level: 1, size: 300 })); });
  t.after(async () => act(() => tree.unmount()));
  const distinctFrames = new Set<string>();
  for (const variant of ['male', 'female']) {
    for (const level of [1, 2, 3, 5, 8, 1]) {
      await act(() => tree.update(React.createElement(CompanionPortrait, { variant, level, size: 300 })));
      const frame = tree.root.findByType('View' as any), art = tree.root.findByType('Image' as any);
      assert.equal(art.props.source, level === 1 ? 'base-art' : 'equipped-art');
      assert.equal(frame.props.style.overflow, 'hidden');
      assert.ok(frame.props.style.left >= 0 && frame.props.style.left + frame.props.style.width <= 300);
      assert.ok(frame.props.style.top >= 0 && frame.props.style.top + frame.props.style.height <= 300);
      assert.equal(frame.props.accessibilityRole, 'image');
      assert.equal(frame.props.accessibilityLabel.includes('gullmerke'), level >= 8);
      assert.equal(frame.props.accessibilityLabel.includes('caps'), level >= 2);
      distinctFrames.add(`${art.props.source}/${art.props.style.left}/${art.props.style.top}`);
    }
  }
  assert.equal(distinctFrames.size, 10);
});
