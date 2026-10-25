import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { categoryNames, medalCounts, medalNames, type MedalColor, type TourMedal, type TourResult } from '../domain/tourMedals';
import { durationLabel, kmLabel } from '../domain/metrics';
import { colors, styles as s } from './theme';

const metal = { gold: ['#D6A526', '#FFF1B2'], silver: ['#8798A6', '#EEF3F7'], bronze: ['#B47448', '#FBE1CB'] };
function MedalIcon({ color, size = 38 }: { color: MedalColor; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 48 52" accessible={false}>
    <Path d="M12 2h9l9 24-9 4z" fill={colors.ink} /><Path d="M27 2h9l-9 28-9-4z" fill={colors.coral} />
    <Circle cx="24" cy="33" r="17" fill={metal[color][0]} /><Circle cx="24" cy="33" r="13" fill={metal[color][1]} stroke={metal[color][0]} strokeWidth="2" />
    <Path d="m24 23 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill={metal[color][0]} />
  </Svg>;
}
export function MedalCount({ medals }: { medals: TourMedal[] }) {
  const counts = medalCounts(medals);
  if (!medals.length) return null;
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
    {(['gold', 'silver', 'bronze'] as const).filter(c => counts[c]).map(color => <View key={color} style={[s.row, { gap: 4 }]} accessible accessibilityLabel={`${counts[color]} ${medalNames[color].toLowerCase()}`}>
      <MedalIcon color={color} size={26} /><Text style={s.chipText}>{counts[color]} {medalNames[color].toLowerCase()}</Text>
    </View>)}
  </View>;
}
export function MedalAward({ medal }: { medal: TourMedal }) {
  const timed = medal.category === 'trail-time' || medal.category === 'stretch-time';
  const title = timed ? medal.name : categoryNames[medal.category as keyof typeof categoryNames];
  const value = timed ? durationLabel(medal.value * 1000) : medal.category === 'moving' ? durationLabel(medal.value) : medal.category === 'meters' ? `${kmLabel(medal.value)} km` : `${medal.value}${medal.category === 'ascent' ? ' m' : ''}`;
  const placement = medal.first ? 'Første resultat' : medal.color === 'gold' ? 'Ny personlig rekord' : medal.color === 'silver' ? 'Ditt nest beste resultat' : 'Ditt tredje beste resultat';
  return <View style={[s.row, { alignItems: 'flex-start', paddingVertical: 6 }]}>
    <MedalIcon color={medal.color} /><View style={{ flex: 1, gap: 3 }}>
      <Text style={s.subheading}>{medalNames[medal.color]} · {title}</Text>
      <Text style={s.body}>{value}{timed && !medal.first && medal.color === 'gold' && medal.previousBest !== null ? ` · ${durationLabel((medal.previousBest - medal.value) * 1000)} raskere` : ''}</Text>
      <Text style={s.small}>{placement}{timed ? ` · ${medal.category === 'trail-time' ? 'Sti' : 'Strekk'}` : ''}</Text>
    </View>
  </View>;
}
export function TourMedals({ result }: { result: TourResult }) {
  const t = result.totals;
  return <>
    <View style={s.card}>
      <Text style={s.heading}>{t.trails} stier · {t.stretches} strekk</Text>
      <Text style={s.body}>{kmLabel(t.meters)} km · {t.hasElevation ? `${t.ascent} høydemeter opp` : 'Høydemeter mangler'}</Text>
      <Text style={s.body}>{durationLabel(t.moving)} i bevegelse</Text>
      <Text style={s.small}>{durationLabel(t.elapsed)} totalt · stier og strekk ende til ende</Text>
    </View>
    <View style={s.card}>
      <Text style={s.heading}>Turens medaljer</Text>
      {result.medals.length ? <><MedalCount medals={result.medals} />{result.medals.map(m => <MedalAward key={m.id} medal={m} />)}</> : <Text style={s.body}>Ingen nye medaljer denne turen.</Text>}
      <Text style={s.small}>Dine tre beste resultater da turen ble avsluttet. Like resultater gir ingen ny medalje. Stitider sammenlignes i samme retning.</Text>
    </View>
  </>;
}
