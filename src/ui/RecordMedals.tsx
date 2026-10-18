import { Text, View } from 'react-native';
import type { RecordMedal } from '../domain/records';
import { durationLabel } from '../domain/metrics';
import { Medal } from './MilestoneMedals';
import { colors, styles as s } from './theme';

export function RecordMedals({ medals }: { medals: RecordMedal[] }) {
  if (!medals.length) return null;
  return <View style={s.card}>
    <Text style={s.subheading}>Personlige rekorder · {medals.length}</Text>
    {medals.map(m => <View key={m.id} accessible accessibilityLabel={`Rekordmedalje: ${m.kind === 'route' ? 'Hele ruten' : 'Strekk'}, ${m.name}. ${durationLabel(m.seconds * 1000)}. ${Math.round(m.previousSeconds - m.seconds)} sekunder raskere enn tidligere beste.`} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 18, backgroundColor: '#FBF3DF', borderWidth: 1, borderColor: '#E7D4A9' }}>
      <Medal kind="record" />
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text style={s.small}>{m.kind === 'route' ? 'Beste tid på hele ruten' : 'Beste tid på strekket'}</Text>
        <Text style={s.subheading}>{m.name}</Text>
        <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 20 }}>{durationLabel(m.seconds * 1000)}</Text>
        <Text style={s.small}>{Math.round(m.previousSeconds - m.seconds)} sek raskere · forrige beste {durationLabel(m.previousSeconds * 1000)}</Text>
      </View>
    </View>)}
    <Text style={s.small}>Rekorder satt på denne turen, med pauser inkludert. GPS-tider er omtrentlige; forbedringer under 5 sekunder regnes som lik tid.</Text>
  </View>;
}
