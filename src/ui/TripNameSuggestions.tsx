import { Pressable, Text, View } from 'react-native';
import { colors, styles as s } from './theme';

export function TripNameSuggestions({ names, selected, pending = false, onChoose }: { names: string[]; selected: string; pending?: boolean; onChoose: (name: string) => void }) {
  return <View style={{ gap: 8 }}>
    <Text style={s.small}>Forslag til turnavn</Text>
    {pending && <Text accessibilityLiveRegion="polite" style={s.small}>Finner navn fra kartet …</Text>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{names.map(name => <Pressable key={name} accessibilityRole="button" accessibilityLabel={`Bruk turnavn: ${name}`} accessibilityState={{ selected: selected === name }} onPress={() => onChoose(name)} style={{ maxWidth: '100%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: selected === name ? colors.ink : colors.pale }}><Text style={{ fontSize: 15, color: selected === name ? colors.paper : colors.ink }}>{name}</Text></Pressable>)}</View>
  </View>;
}
