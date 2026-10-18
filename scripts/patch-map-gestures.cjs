// MapLibre 11.5.0 leaves scrollEnabled null when Fabric uses the default
// dragPan=true. The map pans, but fails to prevent its parent ScrollView from
// intercepting vertical gestures. Treat null as the documented enabled default.
const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '../node_modules/@maplibre/maplibre-react-native/android/src/main/java/org/maplibre/reactnative/components/mapview/MLRNMapView.kt');
const before = 'if (result && scrollEnabled == true) {';
const after = 'if (result && scrollEnabled != false) {';
const source = fs.readFileSync(file, 'utf8');
if (source.includes(before)) fs.writeFileSync(file, source.replace(before, after));
else if (!source.includes(after)) throw new Error('MapLibre touch handler changed; review gesture fix before building.');
