import type { ReactNode } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';
import { colors, styles as s } from './theme';
export type IconName = 'mountain' | 'map' | 'compass' | 'book' | 'user' | 'arrow' | 'sound' | 'close' | 'check' | 'ghost' | 'location' | 'clock' | 'settings';
export function Icon({ name, size = 24, color = colors.ink }: { name: IconName; size?: number; color?: string }) {
  const paths: Record<IconName, string> = {
    mountain: 'M2 20 9 6l4 7 3-5 6 12H2Z M6.5 11l2.5 2 2.5-2',
    map: 'M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2V5Z M9 3v16 M15 5v16',
    compass: 'M16 8l-3 5-5 3 3-5 5-3Z M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20',
    book: 'M4 4h7c2 0 3 1 3 3v14c0-2-1-3-3-3H4V4Z M14 7c0-2 1-3 3-3h4v14h-4c-2 0-3 1-3 3',
    user: 'M12 3a4 4 0 1 0 0 8 4 4 0 1 0 0-8 M4 21v-2a8 6 0 0 1 16 0v2',
    arrow: 'M5 12h14 M13 6l6 6-6 6',
    sound: 'M3 9h4l5-5v16l-5-5H3V9Z M16 8a6 6 0 0 1 0 8 M19 5a10 10 0 0 1 0 14',
    close: 'M6 6l12 12 M18 6 6 18',
    check: 'M5 12l4 4L19 6',
    ghost: 'M5 21V10a7 7 0 0 1 14 0v11l-4-3-3 3-3-3-4 3Z M9 10v2 M15 10v2',
    location: 'M12 22S4 14 4 9a8 8 0 0 1 16 0c0 5-8 13-8 13Z M12 6a3 3 0 1 0 0 6 3 3 0 1 0 0-6',
    settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M10 2h4l1 3 3 1 3-1 2 4-2 2v3l2 2-2 4-3-1-3 1-1 3h-4l-1-3-3-1-3 1-2-4 2-2v-3L1 9l2-4 3 1 3-1 1-3Z',
    clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20 M12 6v6l4 2',
  };
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d={paths[name]} stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}
export function Button({ title, onPress, secondary = false, disabled = false, icon, accessibilityLabel, textScale = 1 }: { textScale?: number; accessibilityLabel?: string; title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; icon?: IconName }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled }} onPress={onPress} disabled={disabled} style={({ pressed }) => [{ backgroundColor: secondary ? colors.pale : colors.ink, minHeight: 54, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 13, flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.45 : pressed ? 0.75 : 1 }]}>
    {icon && <Icon name={icon} color={secondary ? colors.ink : colors.paper} size={20} />}<Text style={{ color: secondary ? colors.ink : colors.paper, fontSize: 15 * textScale, ...(textScale !== 1 ? { lineHeight: 21 * textScale } : {}), fontWeight: '700', flexShrink: 1, textAlign: 'center' }}>{title}</Text>
  </Pressable>;
}
export function Metric({ value, label, light = false }: { value: string; label: string; light?: boolean }) {
  return <View style={{ flex: 1, gap: 5 }}><Text adjustsFontSizeToFit numberOfLines={1} style={{ fontSize: 27, fontWeight: '700', letterSpacing: -0.7, fontVariant: ['tabular-nums'], color: light ? colors.paper : colors.ink }}>{value}</Text><Text style={{ fontSize: 11, color: light ? '#C2D3C3' : colors.muted }}>{label}</Text></View>;
}
export function Empty({ title, children, icon = 'map' }: { title: string; children: ReactNode; icon?: IconName }) {
  return <View style={[s.card, { paddingVertical: 30, alignItems: 'center' }]}><View style={{ padding: 15, backgroundColor: colors.pale, borderRadius: 50 }}><Icon name={icon} size={30} /></View><Text style={s.subheading}>{title}</Text><Text style={[s.body, { textAlign: 'center' }]}>{children}</Text></View>;
}
export function ElevationChart({ values }: { values: (number | null)[] }) {
  const data = values.filter((n): n is number => n !== null && Number.isFinite(n));
  if (data.length < 2) return <Text style={s.small}>Ingen pålitelige høydedata på denne turen.</Text>;
  const min = Math.min(...data), max = Math.max(...data), span = Math.max(10, max - min);
  const sampled = data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 150)) === 0);
  const points = sampled.map((v, i) => `${i / (sampled.length - 1) * 300},${90 - (v - min) / span * 75}`).join(' ');
  return <View style={{ gap: 8 }}><View style={s.between}><Text style={s.eyebrow}>HØYDEPROFIL · GPS</Text><Text style={s.small}>{Math.round(min)}–{Math.round(max)} moh.</Text></View><Svg viewBox="0 0 300 100" width="100%" height={100}><Path d={`M0 100 L${points.replaceAll(' ', ' L')} L300 100 Z`} fill={colors.pale} /><Polyline points={points} fill="none" stroke={colors.ink} strokeWidth={2} /></Svg><Text style={s.small}>Høyde over registrerte GPS-punkter. Stigning glattes for GPS-støy.</Text></View>;
}
export function Stamp({ visited, index, small }: { visited: boolean; index: number; small?: boolean }) {
  return <View style={{ width: small ? 56 : 76, height: small ? 56 : 76, borderRadius: 99, borderWidth: 1.5, borderStyle: visited ? 'solid' : 'dashed', borderColor: visited ? colors.ink : '#B7C2AF', backgroundColor: visited ? colors.pale : 'transparent', alignItems: 'center', justifyContent: 'center', gap: 2 }}><Icon name={visited ? 'check' : 'mountain'} size={small ? 22 : 29} color={visited ? colors.ink : '#98A68C'} /><Text style={{ fontSize: 8, letterSpacing: 1, color: colors.muted }}>{String(index + 1).padStart(2, '0')} / 07</Text></View>;
}
