import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { Achievement } from '../domain/achievements';
import { colors, styles as s } from './theme';

export function Medal({ kind }: { kind: string }) {
  const ribbon = kind === 'distance' ? colors.ink : kind === 'ascent' ? colors.blue : colors.coral;
  const symbol = kind === 'ascent'
    ? 'M20 43 29 27l7 11 5-7 8 12H20Z M25 34l4 3 4-3'
    : kind === 'distance'
      ? 'M25 24c-4 0-6 6-5 11l7 2c3-4 4-11 0-13Z M21 39l6 2-1 5-6-2Z M41 27c4 0 6 6 5 11l-7 2c-3-4-4-11 0-13Z M45 42l-6 2 1 5 6-2Z'
      : 'M34 23 38 31 47 32 40 39 42 48 34 43 26 48 28 39 21 32 30 31Z';
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Svg width={68} height={82} viewBox="0 0 68 82" accessible={false}>
      <Path d="M18 47 10 78l14-7 8 10 6-30Z M36 51l6 30 8-10 14 7-8-31Z" fill={ribbon} />
      <Circle cx={34} cy={35} r={28} fill={colors.yellow} stroke="#9C7436" strokeWidth={2} />
      <Circle cx={34} cy={35} r={23} fill="#F8E9B7" stroke="#C69A4E" strokeWidth={1} />
      <Path d={symbol} fill={kind === 'distance' ? colors.ink : 'none'} stroke={colors.ink} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  </View>;
}

export function MilestoneMedals({ milestones, xp, levelBefore, levelAfter }: { milestones: Achievement[]; xp: number; levelBefore: number; levelAfter: number }) {
  if (!milestones.length) return null;
  return <View style={{ gap: 12 }}>
    <Text style={s.subheading}>Medaljer fra turen</Text>
    {milestones.map(m => {
      const kind = m.id.split('-')[0];
      const label = kind === 'distance' ? 'Til fots totalt' : kind === 'ascent' ? 'Høydemeter opp totalt' : 'Funn i samlingen';
      const amount = `${m.target.toLocaleString('nb-NO')} ${kind === 'discoveries' ? 'funn' : m.unit}`;
      return <View key={m.id} accessible accessibilityLabel={`Medalje: ${label}, ${amount}. Oppnådd på denne turen. ${m.xp} XP.`} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 18, backgroundColor: '#FBF3DF', borderWidth: 1, borderColor: '#E7D4A9' }}>
        <Medal kind={kind} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text style={s.small}>{label}</Text>
          <Text style={s.subheading}>{amount}</Text>
          <Text style={{ color: colors.ink, fontSize: 14, fontWeight: '700' }}>+{m.xp} XP</Text>
        </View>
      </View>;
    })}
    <Text style={s.small}>Milepælene gjelder det du har samlet totalt. Disse nådde du på denne turen.</Text>
    <Text style={s.subheading}>+{xp} XP fra turen{levelAfter > levelBefore ? ` · Nådde nivå ${levelAfter}!` : ''}</Text>
  </View>;
}
