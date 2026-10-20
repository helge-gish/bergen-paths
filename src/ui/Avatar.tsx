import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Image, Pressable, Text, View } from 'react-native';
import { achievements } from '../domain/achievements';
import type { Trip } from '../domain/types';
import { getStore } from '../data/native';
import { colors, styles as s } from './theme';
import { Icon } from './components';

const art = require('../../assets/trakk-rangers.png');
const ranks = [{ level: 1, name: 'Stivandrer', rune: '◇' }, { level: 2, name: 'Skogsvandrer', rune: '✧' }, { level: 3, name: 'Stivokter', rune: '❖' }, { level: 5, name: 'Fjellvokter', rune: '✦' }, { level: 8, name: 'Runemester', rune: '✺' }];
export function Avatar({ trips, collected }: { trips: Trip[]; collected: number }) {
  const progress = useMemo(() => achievements(trips, collected), [trips, collected]);
  const [variant, setVariant] = useState<'male' | 'female'>(() => getStore().setting<string>('avatarVariant', 'female') === 'male' ? 'male' : 'female');
  const [showAll, setShowAll] = useState(false), [width, setWidth] = useState(300);
  const [reduceMotion, setReduceMotion] = useState(true), [active, setActive] = useState(AppState.currentState === 'active');
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduceMotion(value); });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const state = AppState.addEventListener('change', value => setActive(value === 'active'));
    return () => { mounted = false; motion.remove(); state.remove(); };
  }, []);
  useEffect(() => {
    if (reduceMotion || !active) { glow.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 2600, useNativeDriver: true, isInteraction: false }),
      Animated.timing(glow, { toValue: 0, duration: 3300, useNativeDriver: true, isInteraction: false }),
    ]));
    loop.start(); return () => loop.stop();
  }, [reduceMotion, active, glow]);
  const { level, xp, nextXp } = progress;
  const floor = (level - 1) ** 2 * 100, fraction = Math.max(0, Math.min(1, (xp - floor) / (nextXp - floor)));
  const rank = [...ranks].reverse().find(r => r.level <= level)!, nextRank = ranks.find(r => r.level > level);
  const earned = progress.milestones.filter(m => m.earned);
  const next = ['distance', 'ascent', 'discoveries'].flatMap(id => progress.milestones.find(m => m.id.startsWith(id) && !m.earned) ?? []);
  return <View style={[s.card, { padding: 0, overflow: 'hidden', borderColor: '#C7B788' }]}>
    <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ width: '100%', height: width, overflow: 'hidden', backgroundColor: colors.ink }}>
      <Image source={art} accessibilityLabel={`${variant === 'male' ? 'Mannlig' : 'Kvinnelig'} skogsvandrer med lykt i en eventyrskog`} style={{ position: 'absolute', width: width * 2, height: width, left: variant === 'female' ? -width : 0 }} resizeMode="stretch" />
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: '14%', top: '73%', width: width * .2, height: width * .2, borderRadius: width, backgroundColor: '#FFD36C', opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [.03, .18] }), transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [.8, 1.35] }) }] }} />
      {[{ x: '12%', y: '25%' }, { x: '83%', y: '58%' }, { x: '74%', y: '15%' }].map((p, i) => <Animated.View key={i} pointerEvents="none" style={{ position: 'absolute', left: p.x as `${number}%`, top: p.y as `${number}%`, width: 5, height: 5, borderRadius: 4, backgroundColor: '#FFE4A0', opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [.2, .9] }), transform: [{ translateY: glow.interpolate({ inputRange: [0, 1], outputRange: [0, -8 - i * 3] }) }] }} />)}
      <View style={{ position: 'absolute', top: 14, left: 14, backgroundColor: '#142F29DB', padding: 10, borderRadius: 12 }}><Text style={{ color: '#F4D796', fontWeight: '800' }}>{rank.rune} NIVÅ {level}</Text></View>
    </View>
    <View style={{ padding: 20, gap: 14 }}>
      <Text style={s.eyebrow}>TURKAMERATEN DIN</Text><Text style={s.heading}>{rank.name}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>{(['male', 'female'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: variant === value }} onPress={() => { getStore().setSetting('avatarVariant', value); setVariant(value); }} style={[s.chip, { minHeight: 44, flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: value === variant ? colors.ink : colors.pale }]}><Text style={[s.chipText, { color: value === variant ? colors.paper : colors.ink }]}>{value === 'male' ? 'Mann' : 'Dame'}</Text></Pressable>)}</View>
      <View style={{ gap: 7 }}><Text style={s.subheading}>Nivå {level} · {xp.toLocaleString('nb-NO')} XP</Text>
        <View accessibilityRole="progressbar" accessibilityLabel={`Fremgang mot nivå ${level + 1}`} accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100) }} style={{ height: 9, borderRadius: 6, backgroundColor: '#E4E1D2', overflow: 'hidden' }}><View style={{ height: '100%', width: `${fraction * 100}%`, backgroundColor: colors.ink }} /></View>
        <Text style={s.small}>{nextXp - xp} XP til nivå {level + 1}{nextRank ? ` · ${nextRank.name} ved nivå ${nextRank.level}` : ''}</Text>
      </View>
      <Text style={s.subheading}>Neste prestasjoner</Text>
      {next.map(m => <View key={m.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><View style={{ padding: 12, borderRadius: 24, backgroundColor: colors.pale }}><Icon name={m.id.startsWith('ascent') ? 'mountain' : m.id.startsWith('discoveries') ? 'compass' : 'map'} size={22} /></View><View style={{ flex: 1 }}><Text style={s.chipText}>{m.title}</Text><Text style={s.small}>{Math.min(m.target, m.value).toLocaleString('nb-NO', { maximumFractionDigits: 1 })} / {m.target} {m.unit} · +{m.xp} XP</Text></View></View>)}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showAll }} onPress={() => setShowAll(!showAll)} style={{ paddingVertical: 10 }}><Text style={s.chipText}>{showAll ? 'Skjul' : 'Vis'} prestasjoner · {earned.length} oppnådd</Text></Pressable>
      {showAll && <View style={{ gap: 9 }}>{earned.length ? earned.map(m => <View key={m.id} style={{ flexDirection: 'row', gap: 12, padding: 12, borderRadius: 14, backgroundColor: '#F0E9D5' }}><Text style={{ color: '#896A27', fontSize: 24 }}>✦</Text><View style={{ flex: 1 }}><Text style={s.chipText}>{m.title}</Text><Text style={s.small}>Oppnådd · {m.xp} XP</Text></View></View>) : <Text style={s.small}>Din første tur er starten på samlingen.</Text>}</View>}
      <Text style={s.small}>XP kommer fra turene og funnene dine. Hver milepæl teller én gang. Slettes en tur, beregnes fremgangen på nytt.</Text>
    </View>
  </View>;
}
