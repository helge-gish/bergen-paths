import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Image, Pressable, Text, View } from 'react-native';
import { achievements } from '../domain/achievements';
import type { Trip } from '../domain/types';
import { getStore } from '../data/native';
import { colors, styles as s } from './theme';
import { companionRanks, companionVariant } from '../domain/companion';
import { CompanionGear } from './CompanionGear';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { Icon } from './components';

const art = require('../../assets/trakk-friends.png');
const ranks = companionRanks;
export function Avatar({ trips, collected }: { trips: Trip[]; collected: number }) {
  const progress = useMemo(() => achievements(trips, collected), [trips, collected]);
  const [variant, setVariant] = useState<'male' | 'female'>(() => companionVariant(getStore().setting('avatarVariant', 'female')));
  const [showAll, setShowAll] = useState(false), [width, setWidth] = useState(300);
  const [reduceMotion, setReduceMotion] = useState(true), [active, setActive] = useState(AppState.currentState === 'active');
  const step = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduceMotion(value); });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const state = AppState.addEventListener('change', value => setActive(value === 'active'));
    return () => { mounted = false; motion.remove(); state.remove(); };
  }, []);
  useEffect(() => {
    if (reduceMotion || !active) { step.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(step, { toValue: 1, duration: 2600, useNativeDriver: true, isInteraction: false }),
      Animated.timing(step, { toValue: 0, duration: 3300, useNativeDriver: true, isInteraction: false }),
    ]));
    loop.start(); return () => loop.stop();
  }, [reduceMotion, active, step]);
  const { level, xp, nextXp } = progress;
  const floor = (level - 1) ** 2 * 100, fraction = Math.max(0, Math.min(1, (xp - floor) / (nextXp - floor)));
  const rank = [...ranks].reverse().find(r => r.level <= level)!, nextRank = ranks.find(r => r.level > level);
  const earned = progress.milestones.filter(m => m.earned);
  const next = ['distance', 'ascent', 'discoveries'].flatMap(id => progress.milestones.find(m => m.id.startsWith(id) && !m.earned) ?? []);
  return <View style={[s.card, { padding: 0, overflow: 'hidden', borderColor: colors.line }]}>
    <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ width: '100%', height: width, overflow: 'hidden', backgroundColor: '#EAF0E3' }}>
      <Svg width="100%" height="100%" viewBox="0 0 300 300" style={{ position: 'absolute' }}><Ellipse cx={150} cy={152} rx={116} ry={127} fill="#F7F5EE" /><Path d="M-20 257Q52 220 115 247T320 234M-20 275Q70 244 140 271T320 255" stroke="#C9D7BD" strokeWidth={2} fill="none" /><Ellipse cx={150} cy={285} rx={55} ry={7} fill="#D0DAC7" /></Svg>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', width, height: width, transform: [{ translateY: step.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }, { rotate: step.interpolate({ inputRange: [0, 1], outputRange: ['-.5deg', '.5deg'] }) }] }}>
        <Image source={art} accessibilityLabel={`${variant === 'male' ? 'Mannlig' : 'Kvinnelig'} tråkkvenn med regnjakke og tursko`} style={{ position: 'absolute', width: width * 2, height: width, left: variant === 'female' ? -width * .87 : -width * .12 }} resizeMode="stretch" />
      </Animated.View>
      <View style={{ position: 'absolute', top: 14, left: 14, backgroundColor: colors.ink, padding: 10, borderRadius: 12 }}><Text style={{ color: colors.paper, fontWeight: '800' }}>NIVÅ {level}</Text></View>
    </View>
    <View style={{ padding: 20, gap: 14 }}>
      <Text style={s.eyebrow}>DIN TRÅKKVENN</Text><Text style={s.heading}>{rank.name}</Text><Text style={s.body}>Små skritt. Nye steder. En turkamerat som vokser med turene dine.</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>{(['male', 'female'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: variant === value }} onPress={() => { getStore().setSetting('avatarVariant', value); setVariant(value); }} style={[s.chip, { minHeight: 44, flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: value === variant ? colors.ink : colors.pale }]}><Text style={[s.chipText, { color: value === variant ? colors.paper : colors.ink }]}>{value === 'male' ? 'Mann' : 'Dame'}</Text></Pressable>)}</View>
      <View style={{ gap: 7 }}><Text style={s.subheading}>Nivå {level} · {xp.toLocaleString('nb-NO')} XP</Text>
        <View accessibilityRole="progressbar" accessibilityLabel={`Fremgang mot nivå ${level + 1}`} accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100) }} style={{ height: 9, borderRadius: 6, backgroundColor: '#E4E1D2', overflow: 'hidden' }}><View style={{ height: '100%', width: `${fraction * 100}%`, backgroundColor: colors.ink }} /></View>
        <Text style={s.small}>{nextXp - xp} XP til nivå {level + 1}{nextRank ? ` · ${nextRank.name} ved nivå ${nextRank.level}` : ''}</Text>
      </View>
      <View style={{ gap: 9 }}><Text style={s.subheading}>Utstyrssamlingen din</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{progress.equipment.map(item => <View key={item.id} accessibilityLabel={`${item.name}, ${level >= item.level ? 'oppnådd' : `låses opp ved nivå ${item.level}`}`} style={{ width: 82, paddingVertical: 10, alignItems: 'center', gap: 4, borderRadius: 14, backgroundColor: level >= item.level ? colors.pale : '#F2F2ED' }}><CompanionGear id={item.id} unlocked={level >= item.level} /><Text style={s.chipText}>{item.name}</Text><Text style={s.small}>{level >= item.level ? '✓ Oppnådd' : `Nivå ${item.level}`}</Text></View>)}</View>{progress.nextEquipment && <Text style={s.small}>Neste: {progress.nextEquipment.name.toLocaleLowerCase('nb-NO')} ved nivå {progress.nextEquipment.level}.</Text>}</View>
      <Text style={s.subheading}>Neste prestasjoner</Text>
      {next.map(m => <View key={m.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><View style={{ padding: 12, borderRadius: 24, backgroundColor: colors.pale }}><Icon name={m.id.startsWith('ascent') ? 'mountain' : m.id.startsWith('discoveries') ? 'compass' : 'map'} size={22} /></View><View style={{ flex: 1 }}><Text style={s.chipText}>{m.title}</Text><Text style={s.small}>{Math.min(m.target, m.value).toLocaleString('nb-NO', { maximumFractionDigits: 1 })} / {m.target} {m.unit} · +{m.xp} XP</Text></View></View>)}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showAll }} onPress={() => setShowAll(!showAll)} style={{ paddingVertical: 10 }}><Text style={s.chipText}>{showAll ? 'Skjul' : 'Vis'} prestasjoner · {earned.length} oppnådd</Text></Pressable>
      {showAll && <View style={{ gap: 9 }}>{earned.length ? earned.map(m => <View key={m.id} style={{ flexDirection: 'row', gap: 12, padding: 12, borderRadius: 14, backgroundColor: '#F0E9D5' }}><Text style={{ color: '#896A27', fontSize: 24 }}>✦</Text><View style={{ flex: 1 }}><Text style={s.chipText}>{m.title}</Text><Text style={s.small}>Oppnådd · {m.xp} XP</Text></View></View>) : <Text style={s.small}>Din første tur er starten på samlingen.</Text>}</View>}
      <Text style={s.small}>XP kommer fra turene og funnene dine. Hver milepæl teller én gang. Slettes en tur, beregnes fremgangen på nytt.</Text>
    </View>
  </View>;
}
