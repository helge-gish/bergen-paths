import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { companionEquipment } from '../domain/companion';
export function CompanionGear({ id, unlocked }: { id: typeof companionEquipment[number]['id']; unlocked: boolean }) {
  const ink = unlocked ? '#173D32' : '#8A9186', fill = unlocked ? '#DAA16D' : '#E0E3D8';
  return <Svg width={36} height={36} viewBox="0 0 40 40" fill="none">
    {id === 'walking-boots' && <><Path d="M8 8h13v13l11 4q5 2 3 9H6V22Z" fill={fill} stroke={ink} strokeWidth={2} strokeLinejoin="round" /><Path d="M6 30h29M15 14h7M14 19h8M21 23l-3 5" stroke={ink} strokeWidth={2} /></>}
    {id === 'trail-cap' && <><Path d="M7 25V20a13 13 0 0 1 26 0v5Z" fill={fill} stroke={ink} strokeWidth={2} /><Path d="M8 25q15-7 28 2q1 6-16 4Z" fill={fill} stroke={ink} strokeWidth={2} /><Path d="M20 8q-5 6-3 16" stroke={ink} /></>}
    {id === 'daypack' && <><Path d="M15 9V6h10v3M8 17 5 32m27-15 3 15" stroke={ink} strokeWidth={2} /><Rect x={9} y={9} width={22} height={27} rx={7} fill={fill} stroke={ink} strokeWidth={2} /><Path d="M10 17h20M13 24h14v8H13Z" stroke={ink} strokeWidth={2} /></>}
    {id === 'walking-stick' && <><Path d="m13 36 12-30q4-3 6 1" stroke={ink} strokeWidth={4} strokeLinecap="round" /><Path d="m14 27 6 2M24 11l4 2" stroke={fill} strokeWidth={3} strokeLinecap="round" /></>}
    {id === 'gold-pin' && <><Circle cx={20} cy={19} r={12} fill={unlocked ? '#E7BE63' : fill} stroke={ink} strokeWidth={2} /><Path d="m12 30-2 7 10-4 10 4-2-7M13 22l6-10 3 5 2-2 4 7Z" stroke={ink} strokeWidth={1.5} strokeLinejoin="round" /></>}
  </Svg>;
}
