import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { achievements } from '../domain/achievements';
import type { Trip } from '../domain/types';
import { colors, styles as s } from './theme';
export function Avatar({ trips, collected, color, onColor }: { trips: Trip[]; collected: number; color: string; onColor: (value: string) => void }) {
  const progress = useMemo(() => achievements(trips, collected), [trips, collected]);
  const [showAll, setShowAll] = useState(false);
  const { level } = progress;
  const next = ['distance', 'ascent', 'discoveries'].flatMap(id => progress.milestones.find(m => m.id.startsWith(id) && !m.earned) ?? []);
  return <View style={s.card}>
    <Text style={s.heading}>Turkameraten din</Text>
    <View style={[s.row, { alignItems: 'center' }]}>
      <Svg width={130} height={160} viewBox="0 0 130 160" accessibilityLabel={`Turavatar på nivå ${level}`}>
        <Circle cx="65" cy="80" r="62" fill={colors.pale} />
        {level >= 3 && <Rect x="32" y="65" width="65" height="52" rx="12" fill="#A77843" stroke={colors.ink} strokeWidth="3" />}
        <Path d="M49 110L45 143M78 110L85 143" stroke={colors.ink} strokeWidth="12" strokeLinecap="round" />
        <Path d="M46 143H34M85 143H97" stroke="#795438" strokeWidth="13" strokeLinecap="round" />
        <Path d="M48 72L28 102M81 72L102 96" stroke="#C89771" strokeWidth="10" strokeLinecap="round" />
        <Rect x="44" y="65" width="40" height="52" rx="12" fill={color} stroke={colors.ink} strokeWidth="3" />
        <Circle cx="64" cy="44" r="22" fill="#C89771" stroke={colors.ink} strokeWidth="2" />
        <Circle cx="57" cy="44" r="2" fill={colors.ink} /><Circle cx="72" cy="44" r="2" fill={colors.ink} />
        <Path d="M59 54Q64 59 70 53" stroke={colors.ink} strokeWidth="2" fill="none" />
        {level >= 2 && <Path d="M41 36Q42 12 64 16Q84 17 86 36H41L91 38" fill={color} stroke={colors.ink} strokeWidth="4" strokeLinejoin="round" />}
        {level >= 5 && <Path d="M105 89L99 148" stroke="#795438" strokeWidth="4" strokeLinecap="round" />}
        {level >= 8 && <Circle cx="64" cy="81" r="7" fill={colors.yellow} stroke={colors.ink} strokeWidth="2" />}
      </Svg>
      <View style={{ flex: 1, gap: 8 }}><Text style={s.heading}>Nivå {level}</Text><Text style={s.body}>{progress.xp} XP</Text><Text style={s.small}>{progress.nextXp - progress.xp} XP til neste nivå</Text><Text style={s.small}>{progress.equipment.filter(e => e.level <= level).map(e => e.name).join(' · ')}</Text></View>
    </View>
    <View style={s.row}>{[{ color: '#E8A164', name: 'Aprikos' }, { color: '#799E8A', name: 'Skoggrønn' }, { color: '#8595BD', name: 'Blå' }].map(({ color: c, name }) => <Pressable accessibilityRole="button" accessibilityLabel={`Avatarfarge: ${name}`} accessibilityState={{ selected: c === color }} key={c} onPress={() => onColor(c)} style={{ width: 38, height: 38, borderRadius: 20, backgroundColor: c, borderWidth: c === color ? 3 : 0, borderColor: colors.ink }} />)}</View>
    {progress.nextEquipment && <Text style={s.body}>Neste utstyr: {progress.nextEquipment.name} på nivå {progress.nextEquipment.level}.</Text>}
    <Text style={s.subheading}>Neste milepæler</Text>
    {next.map(m => <Text key={m.id} style={s.body}>{m.title} · {Math.min(m.target, m.value).toLocaleString('nb-NO', { maximumFractionDigits: 1 })} / {m.target} · {m.xp} XP</Text>)}
    <Pressable accessibilityRole="button" onPress={() => setShowAll(!showAll)}><Text style={s.chipText}>{showAll ? 'Skjul' : 'Vis'} oppnådde milepæler ({progress.milestones.filter(m => m.earned).length})</Text></Pressable>
    {showAll && progress.milestones.filter(m => m.earned).map(m => <Text key={m.id} style={s.body}>✓ {m.title} · {m.xp} XP</Text>)}
    <Text style={s.small}>Hver milepæl gir XP én gang. Nivå og utstyr følger de lagrede turene og stemplene dine, og beregnes på nytt ved sletting av turer.</Text>
  </View>;
}
