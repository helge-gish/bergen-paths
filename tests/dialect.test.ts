import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localDialect, localizeSpeech } from '../src/domain/dialect';
test('local wording follows known Bergen coordinates, with neutral fallback for unknown regions', () => {
  assert.equal(localDialect({ latitude: 60.39, longitude: 5.34 }), 'bergen');
  assert.equal(localDialect({ latitude: 59.91, longitude: 10.75 }), 'neutral');
  assert.equal(localDialect(null), 'neutral');
  assert.equal(localDialect({ latitude: NaN, longitude: 5.3 }), 'neutral');
});
test('regional speech is idempotent and never alters measured numbers or place names', () => {
  const text = 'Jeg er på Fløyen. Nå er 4,1 kilometer registrert.';
  const bergensk = localizeSpeech(text, 'bergen');
  assert.equal(bergensk, 'Eg e på Fløyen. No e 4,1 kilometer registrert.');
  assert.equal(localizeSpeech(bergensk, 'bergen'), bergensk);
  assert.equal(localizeSpeech(bergensk, 'neutral'), text);
});
