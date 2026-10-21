import { test } from 'node:test';
import assert from 'node:assert/strict';
import { achievements } from '../src/domain/achievements';
import { companionEquipment, companionVariant, companionOutfit } from '../src/domain/companion';
test('existing avatar choice survives; equipment unlocks follow recalculated evidence', () => {
  assert.equal(companionVariant('male'),'male');assert.equal(companionVariant('female'),'female');assert.equal(companionVariant(null),'female');
  assert.equal(new Set(companionEquipment.map(item=>item.id)).size,5);
  const start=achievements([],0), higher=achievements([],50);
  assert.deepEqual(start.equipment.filter(item=>item.level<=start.level).map(item=>item.id),['walking-boots']);
  assert.ok(higher.equipment.some(item=>item.id==='daypack'&&item.level<=higher.level));
  assert.equal(achievements([],0).level,1);
});

test('worn equipment follows every unlock boundary and falls back after evidence is removed', () => {
  const cases = [[1, 0], [2, 1], [3, 2], [4, 2], [5, 3], [7, 3], [8, 4], [20, 4]];
  for (const [level, stage] of cases) {
    const outfit = companionOutfit(level);
    assert.equal(outfit.stage, stage);
    assert.deepEqual(outfit.equipment.map(item => item.id), companionEquipment.slice(0, stage + 1).map(item => item.id));
  }
  assert.equal(companionOutfit(achievements([], 500).level).stage, 3);
  assert.equal(companionOutfit(achievements([], 0).level).stage, 0);
});
