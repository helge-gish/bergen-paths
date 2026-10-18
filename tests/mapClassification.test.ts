import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Store } from '../src/data/store';
import { refreshMapClassification } from '../src/services/mapClassification';

test('classification upgrade retires derived fragment awards without editing personal tracks or saved trails', () => {
  const legacy = { id: 'way/1', kind: 'trail', name: 'Gutenbergsveien' };
  const oldStreet = { id: 'street/old', kind: 'street', name: 'Old street without pedestrian parts' };
  const peak = { id: 'node/2', kind: 'peak', name: 'Toppen' };
  const goal = { id: 'old', targets: [legacy] };
  const settings = new Map<string, unknown>([
    ['osmDiscoveries',[legacy,oldStreet,peak]], ['osmAwards',{'way/1':10,'street/old':15,'node/2':20}],
    ['goals',[goal]], ['goalCatalog',[goal]], ['surveyCache',{points:{tile:123}}],
  ]);
  const store = { setting: (key: string, fallback: unknown) => settings.get(key) ?? fallback, setSetting: (key: string, value: unknown) => settings.set(key,value) } as unknown as Store;
  refreshMapClassification(store);
  assert.deepEqual(settings.get('osmDiscoveries'),[peak]);
  assert.deepEqual(settings.get('osmAwards'),{'node/2':20});
  assert.deepEqual(settings.get('goals'),[{...goal,needsRefresh:true}]);
  assert.deepEqual(settings.get('surveyCache'),{points:{},regions:{},streets:{}});
  // A second launch must not retire newly fetched data or retry it endlessly.
  settings.set('osmDiscoveries',[{...legacy,osmHighway:'path'}]);
  refreshMapClassification(store);
  assert.deepEqual(settings.get('osmDiscoveries'),[{...legacy,osmHighway:'path'}]);
});
