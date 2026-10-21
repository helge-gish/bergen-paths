import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors, styles as s } from './theme';

export type ExploreMode = 'map' | 'camera';

// Keep the map mounted so panning, inspection and recorded tracks survive a
// camera visit. The scanner is mounted only while it is actually being used.
export function ExploreSurface({ mode, onMode, enabled, map, camera }: {
  mode: ExploreMode; onMode: (mode: ExploreMode) => void; enabled: boolean;
  map: ReactNode; camera: ReactNode;
}) {
  return <View style={{ gap: 9 }}>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {(['map', 'camera'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: mode === value }} onPress={() => onMode(value)} style={[s.chip, { backgroundColor: mode === value ? colors.ink : colors.pale }]}><Text style={[s.chipText, { color: mode === value ? colors.paper : colors.ink }]}>{value === 'map' ? 'Kart' : 'Kamera · AR'}</Text></Pressable>)}
    </View>
    <View style={{ display: mode === 'map' ? 'flex' : 'none' }} accessibilityElementsHidden={mode !== 'map'} importantForAccessibility={mode === 'map' ? 'auto' : 'no-hide-descendants'}>{map}</View>
    {mode === 'camera' && enabled && camera}
  </View>;
}
