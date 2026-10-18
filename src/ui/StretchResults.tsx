import { useState } from 'react';
import { Button } from './components';
import { Text, View } from 'react-native';
import type { StretchResult } from '../domain/stretchRuns';
import { stretchDelta } from '../domain/stretchRuns';
import { durationLabel } from '../domain/metrics';
import { styles as s } from './theme';
export function StretchResults({ results, live = false }: { results: StretchResult[]; live?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const shown = live ? [...results].reverse().slice(0, expanded ? results.length : 1) : results;
  return <View style={s.card}><Text style={s.subheading}>Fullførte strekk · {results.length}</Text>
    {!results.length ? <Text style={s.small}>{live ? 'Her vises lagrede strekk når du har gått dem fra start til slutt.' : 'Ingen lagrede strekk ble gjenkjent fra start til slutt på denne turen.'}</Text> : <>
      {shown.map(r => <View key={`${r.trailId}:${r.startedAt}`} accessibilityLiveRegion={live ? 'polite' : undefined} style={{ gap: 5 }}>
        <Text style={s.body}>✓ {r.name}</Text><Text style={s.subheading}>{durationLabel(r.seconds * 1000)}</Text>
        {r.previousSeconds !== null ? <Text style={s.small}>Mot sist: {stretchDelta(r.seconds, r.previousSeconds)}</Text> : <Text style={s.small}>Første registrerte tid</Text>}
        {r.bestSeconds !== null && <Text style={s.small}>Mot tidligere beste: {stretchDelta(r.seconds, r.bestSeconds)}{r.bestSeconds - r.seconds >= 5 ? ' · Ny beste tid!' : ''}</Text>}
        {r.ghostSeconds !== null && <Text style={s.small}>Mot skyggen: {stretchDelta(r.seconds, r.ghostSeconds)}</Text>}
      </View>)}
      {live && results.length > 1 && <Button secondary title={expanded ? 'Vis bare siste strekk' : `Vis alle ${results.length} fullførte strekk`} onPress={() => setExpanded(v => !v)} />}
      <Text style={s.small}>Omtrentlige GPS-tider, inkludert pauser. Målepunktene ligger opptil 8 m innenfor endene, likt for alle forsøk. Forskjeller under 5 sek regnes som jevnt.</Text>
    </>}
  </View>;
}
