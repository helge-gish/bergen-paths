import { createContext, useContext, useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View, type GestureResponderEvent, type TextProps } from 'react-native';
import { getStore } from '../data/native';
import { Button } from './components';
import { colors } from './theme';

const ReadingScale = createContext(1);
const setting = 'trailInfoTextScale';
export function readingScale(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(Math.max(1, Math.min(2, value)) * 20) / 20 : 1;
}
export function ReadingText({ style, ...props }: TextProps) {
  const scale = useContext(ReadingScale), base = StyleSheet.flatten(style) ?? {};
  return <Text {...props} style={[style, { fontSize: (base.fontSize ?? 14) * scale, ...(base.lineHeight ? { lineHeight: base.lineHeight * scale } : {}) }]} />;
}
export function ReadingButton(props: ComponentProps<typeof Button>) {
  return <Button {...props} textScale={useContext(ReadingScale)} />;
}
const span = (event: GestureResponderEvent) => {
  const touches = event.nativeEvent.touches;
  if (touches.length !== 2) return null;
  const result = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
  return Number.isFinite(result) && result >= 12 ? result : null;
};

/** Reflow text instead of magnifying a bitmap. Single-finger scrolling and
 * button presses remain native; only a two-finger pinch claims the responder. */
export function ReadingPanel({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(() => readingScale(getStore().setting(setting, 1)));
  const current = useRef(scale), saved = useRef(scale);
  const [pinching, setPinching] = useState(false);
  const start = useRef<{ span: number; scale: number } | null>(null);
  const change = (value: number) => { const next = readingScale(value); current.current = next; setScale(next); };
  const save = () => {
    if (saved.current !== current.current) { getStore().setSetting(setting, current.current); saved.current = current.current; }
  };
  useEffect(() => () => save(), []);
  const gesture = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponderCapture: event => span(event) !== null,
    onMoveShouldSetPanResponderCapture: event => span(event) !== null,
    onPanResponderGrant: event => {
      const distance = span(event);
      start.current = distance === null ? null : { span: distance, scale: current.current };
      setPinching(true);
    },
    onPanResponderMove: event => {
      const distance = span(event);
      if (distance === null) return;
      if (!start.current) start.current = { span: distance, scale: current.current };
      change(start.current.scale * distance / start.current.span);
    },
    onPanResponderRelease: () => { start.current = null; setPinching(false); save(); },
    onPanResponderTerminate: () => { start.current = null; setPinching(false); save(); },
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
  }), []);
  const adjust = (value: number) => { change(value); save(); };
  return <View style={{ flex: 1, minHeight: 0 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingBottom: 8 }}>
      <Text style={{ fontSize: 13, color: colors.muted }}>Tekststørrelse</Text>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <SizeControl label="Mindre tekst" disabled={scale <= 1} onPress={() => adjust(current.current - .2)}>A−</SizeControl>
        <SizeControl label={`Tekststørrelse ${Math.round(scale * 100)} prosent. Tilbakestill`} onPress={() => adjust(1)}>{Math.round(scale * 100)} %</SizeControl>
        <SizeControl label="Større tekst" disabled={scale >= 2} onPress={() => adjust(current.current + .2)}>A+</SizeControl>
      </View>
    </View>
    <View testID="reading-pinch" style={{ flex: 1 }} {...gesture.panHandlers}>
      <ScrollView scrollEnabled={!pinching} nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ padding: 10, paddingBottom: 24, gap: 10 }}>
        <ReadingScale.Provider value={scale}>{children}</ReadingScale.Provider>
      </ScrollView>
    </View>
  </View>;
}
function SizeControl({ label, onPress, disabled = false, children }: { label: string; onPress: () => void; disabled?: boolean; children: ReactNode }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderRadius: 12, backgroundColor: colors.pale, opacity: disabled ? .45 : 1 }}><Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{children}</Text></Pressable>;
}
