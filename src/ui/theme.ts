import { StyleSheet } from 'react-native';
export const colors = { ink: '#173D32', muted: '#6B776D', paper: '#F7F5EE', white: '#FFFFFF', line: '#E2E5D9', pale: '#EAF0E3', yellow: '#E7BE63', coral: '#BF644A', blue: '#447889' };
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 22, paddingBottom: 30, gap: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 36, fontWeight: '800', letterSpacing: -1.6, color: colors.ink },
  heading: { fontSize: 23, fontWeight: '700', letterSpacing: -0.6, color: colors.ink },
  subheading: { fontSize: 17, fontWeight: '700', color: colors.ink },
  body: { fontSize: 15, lineHeight: 23, color: colors.muted },
  small: { fontSize: 12, lineHeight: 18, color: colors.muted },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: colors.muted },
  card: { backgroundColor: colors.white, borderRadius: 22, borderWidth: 1, borderColor: colors.line, padding: 18, gap: 14 },
  chip: { backgroundColor: colors.pale, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 30, alignSelf: 'flex-start' },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.ink },
  input: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, fontSize: 16, color: colors.ink, minHeight: 50 },
  divider: { height: 1, backgroundColor: colors.line },
  notice: { padding: 14, backgroundColor: '#F5E9CF', borderRadius: 14, gap: 6 },
});
