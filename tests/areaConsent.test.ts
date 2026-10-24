import { test } from 'node:test';
import assert from 'node:assert/strict';
import { component } from './support/component';
import * as area from '../src/domain/natureArea';
import * as position from '../src/domain/position';
test('distant fresh GPS stages consent without moving the pinned area; approving uses current location', async () => {
  const original = area.natureArea(null, { latitude: 60.4, longitude: 5.3 })!;
  const settings: Record<string, any> = { activeNatureArea: original, automaticRecording: 'enabled' };
  const current = { latitude: 4.7, longitude: -74.1, timestamp: Date.now(), accuracy: 8 };
  const { stageAreaConsent, approveAreaHere } = component('src/services/areaConsent.ts', {
    'expo-location': { Accuracy: { High: 4 }, getCurrentPositionAsync: async () => ({ timestamp: current.timestamp, coords: current }) },
    '../data/native': { getStore: () => ({ setting: (key: string, fallback: unknown) => settings[key] ?? fallback, setSetting: (key: string, value: unknown) => { settings[key] = value; } }) },
    '../domain/natureArea': area, '../domain/position': position,
  });
  assert.equal(stageAreaConsent({ ...current, accuracy: 900 }), false);
  assert.equal(stageAreaConsent({ ...current, timestamp: 1 }), false);
  assert.equal(settings.automaticRecording, 'enabled');
  assert.equal(stageAreaConsent(current), true);
  assert.equal(settings.automaticRecording, 'paused'); assert.equal(settings.activeNatureArea, original);
  assert.equal(settings.pendingNatureArea.latitude, current.latitude);
  await approveAreaHere();
  assert.equal(settings.pendingNatureArea, null); assert.equal(settings.activeNatureArea.latitude, current.latitude);
  assert.equal(settings.activeNatureArea.radius, 5000); assert.equal(settings.automaticRecording, 'paused'); // Caller explicitly starts after approval.
});
