import { useEffect, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { CameraView } from 'expo-camera';
import { requireNativeView, requireOptionalNativeModule } from 'expo';
import type { GroundGuide, GroundState } from '../domain/groundAr';

type Support = 'ready' | 'install' | 'unsupported' | 'checking';
const native = requireOptionalNativeModule<{ availability(): Promise<Support>; install(): Promise<boolean> }>('TrakkGroundAr');
const NativeGround = native ? requireNativeView<{ style: StyleProp<ViewStyle>; active: boolean; guide: GroundGuide | null; onState: (event: { nativeEvent: GroundState }) => void }>('TrakkGroundAr') : null;
export async function installGroundAr() { try { return await native?.install() ?? false; } catch { return false; } }

export function GroundCamera({ active, guide, style, onReady, onError, onGroundState }: {
  active: boolean; guide: GroundGuide | null; style: StyleProp<ViewStyle>; onReady: () => void; onError: () => void; onGroundState: (state: GroundState) => void;
}) {
  const [support, setSupport] = useState<Support>(native ? 'checking' : 'unsupported');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!active || !native) return;
    let cancelled = false, timer: ReturnType<typeof setTimeout> | undefined;
    async function check(attempt = 0) {
      let next: Support;
      try { next = await native!.availability(); } catch { next = 'unsupported'; }
      if (cancelled) return;
      if (next === 'checking' && attempt < 5) { timer = setTimeout(() => void check(attempt + 1), 500); return; }
      setSupport(next === 'checking' ? 'unsupported' : next);
      if (next !== 'ready') onGroundState({ state: next === 'install' ? 'install' : 'unavailable', ready: false,
        reason: next === 'install' ? 'Bakkeankre trenger Google Play-tjenester for AR.' : 'Bakkeankre er ikke tilgjengelige. Viser retning med GPS og kompass.' });
    }
    void check();
    return () => { cancelled = true; clearTimeout(timer); };
    // Callbacks only report state; changes must not recheck/reopen the camera.
  }, [active]);
  if (!active || support === 'checking') return null;
  if (support === 'ready' && !failed && NativeGround) return <NativeGround style={style} active={active} guide={guide} onState={({ nativeEvent: value }) => {
    if (value.state === 'unavailable') setFailed(true); // Native releases camera before emitting this.
    else if (value.ready) onReady();
    onGroundState(value);
  }} />;
  return <CameraView style={style} facing="back" mode="picture" mute onCameraReady={onReady} onMountError={onError} />;
}
