import { Image, View } from 'react-native';
import { companionOutfit } from '../domain/companion';

const base = require('../../assets/trakk-friends.png');
const equipped = require('../../assets/trakk-friends-equipped.png');
// Pixel frames of the untouched original artwork. Cropping in the view keeps
// adjacent sprites hidden; height and baseline stay consistent across outfits.
const frames = {
  male: [[356, 14, 403, 853], [180, 4, 228, 446], [559, 4, 226, 446], [985, 4, 242, 446], [1392, 4, 242, 446]],
  female: [[1006, 50, 391, 817], [167, 454, 240, 427], [548, 454, 239, 427], [979, 454, 249, 427], [1395, 454, 244, 427]],
} as const;

export function CompanionPortrait({ variant, level, size }: { variant: 'male' | 'female'; level: number; size: number }) {
  const outfit = companionOutfit(level);
  const [x, y, w, h] = frames[variant][outfit.stage];
  const scale = size * .88 / h;
  return <View accessible accessibilityRole="image" accessibilityLabel={`${variant === 'male' ? 'Mannlig' : 'Kvinnelig'} tråkkvenn med ${outfit.equipment.map(item => item.name.toLocaleLowerCase('nb-NO')).join(', ')}`} style={{ position: 'absolute', left: (size - w * scale) / 2, top: size * .07, width: w * scale, height: h * scale, overflow: 'hidden' }}>
    <Image accessible={false} source={outfit.stage ? equipped : base} style={{ position: 'absolute', width: 1774 * scale, height: 887 * scale, left: -x * scale, top: -y * scale }} resizeMode="stretch" />
  </View>;
}
