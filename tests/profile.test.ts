import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profileInput } from '../src/domain/profile';
test('profile fields are optional, support decimal comma and reject invalid values', () => {
  assert.deepEqual(profileInput('', '', null), { weightKg: null, age: null, gender: null });
  assert.deepEqual(profileInput('82,5', '54', 'man'), { weightKg: 82.5, age: 54, gender: 'man' });
  for (const weight of ['-2', 'NaN', 'Infinity', '501']) assert.throws(() => profileInput(weight, '', null));
  for (const age of ['2.5', '121', '-10', 'no']) assert.throws(() => profileInput('', age, null));
});
