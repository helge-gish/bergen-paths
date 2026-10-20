// Expo Camera 55 defaults to CameraX PERFORMANCE (SurfaceView). Our camera is
// inside a clipped, scrolling RN Modal with AR sibling overlays. TextureView
// participates in the same accelerated view composition as those overlays.
const fs = require('node:fs');
const path = require('node:path');
function patchCameraPreview(source) {
  const before = 'private var previewView = PreviewView(context).apply {\n    elevation = 0f';
  const after = 'private var previewView = PreviewView(context).apply {\n    implementationMode = PreviewView.ImplementationMode.COMPATIBLE\n    elevation = 0f';
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error('Expo Camera preview changed; review Android camera compatibility before building.');
  return source.replace(before, after);
}
module.exports = { patchCameraPreview };
if (require.main === module) {
  const config = require('../package.json');
  if (!config.expo?.autolinking?.android?.buildFromSource?.includes('expo-camera')) {
    throw new Error('Build expo-camera from source; the prebuilt AAR bypasses the preview patch.');
  }
  const file = path.join(__dirname, '../node_modules/expo-camera/android/src/main/java/expo/modules/camera/ExpoCameraView.kt');
  const source = fs.readFileSync(file, 'utf8');
  const patched = patchCameraPreview(source);
  if (source !== patched) fs.writeFileSync(file, patched);
}
