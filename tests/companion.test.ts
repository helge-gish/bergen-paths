import { test } from 'node:test';
import assert from 'node:assert/strict';
import { achievements } from '../src/domain/achievements';
import { companionEquipment, companionVariant } from '../src/domain/companion';
test('existing avatar choice survives; equipment unlocks follow recalculated evidence', () => {
  assert.equal(companionVariant('male'),'male');assert.equal(companionVariant('female'),'female');assert.equal(companionVariant(null),'female');
  assert.equal(new Set(companionEquipment.map(item=>item.id)).size,5);
  const start=achievements([],0), higher=achievements([],50);
  assert.deepEqual(start.equipment.filter(item=>item.level<=start.level).map(item=>item.id),['walking-boots']);
  assert.ok(higher.equipment.some(item=>item.id==='daypack'&&item.level<=higher.level));
  assert.equal(achievements([],0).level,1);
});
