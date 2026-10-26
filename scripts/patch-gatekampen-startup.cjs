// Applied after Expo prebuild; Gatekampen only. Keep diagnostics before native initialization.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),app=path.join(root,'apps/gatekampen/android/app');
const java=path.join(app,'src/main/java/no/gatekampen/app');
// Expo's standard config mods expect the generated MainActivity name. Restore
// it for prebuild, then install the alias again afterwards. Native files only.
if(process.argv.includes('--prepare-prebuild')){
 const activity=path.join(java,'MainActivity.kt'),manifest=path.join(app,'src/main/AndroidManifest.xml');
 if(fs.existsSync(activity))fs.writeFileSync(activity,fs.readFileSync(activity,'utf8').replace('class GatekampenAppActivity : ReactActivity()', 'class MainActivity : ReactActivity()'));
 if(fs.existsSync(manifest)){
  let xml=fs.readFileSync(manifest,'utf8');
  const alias=xml.match(/    <activity-alias android:name="\.MainActivity"[^>]*>([\s\S]*?)<\/activity-alias>/);
  if(alias){
   xml=xml.replace(alias[0],'').replace('<activity android:name=".GatekampenAppActivity"','<activity android:name=".MainActivity"');
   xml=xml.replace(/(<activity android:name="\.MainActivity"[^>]*>)/,(_,opening)=>opening+alias[1]);
   fs.writeFileSync(manifest,xml);
  }
 }
 process.exit(0);
}
const application=path.join(java,'MainApplication.kt');let source=fs.readFileSync(application,'utf8');
const hook=`    // Gatekampen local crash capture and recovery, before Expo restores tasks.
    if (GatekampenDiagnostics.isRecoveryProcess(this)) return
    GatekampenDiagnostics.install(this)
    GatekampenDiagnostics.retireLegacyTask(this)
`;
if(!source.includes(hook)){
 if(source.includes('GatekampenDiagnostics.')||!source.includes('    loadReactNative(this)'))throw Error('Review Gatekampen Application recovery hook');
 source=source.replace('    DefaultNewArchitectureEntryPoint.releaseLevel = try {',hook+'    DefaultNewArchitectureEntryPoint.releaseLevel = try {');
 if(!source.includes(hook))throw Error('MainApplication initialization changed');
 fs.writeFileSync(application,source);
}
source=fs.readFileSync(application,'utf8');
source=source.replace('    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)', '    if (!GatekampenDiagnostics.isRecoveryProcess(this)) ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)');
fs.writeFileSync(application,source);
fs.copyFileSync(path.join(root,'apps/gatekampen/native/GatekampenDiagnostics.kt'),path.join(java,'GatekampenDiagnostics.kt'));
// Retain the original launcher component as an alias: pinned home-screen icons
// must enter diagnostics too, rather than bypassing it through the old Activity.
const mainActivity=path.join(java,'MainActivity.kt');source=fs.readFileSync(mainActivity,'utf8');
if(!source.includes('class GatekampenAppActivity : ReactActivity()')){
 if(!source.includes('class MainActivity : ReactActivity()'))throw Error('Gatekampen React Activity changed');
 source=source.replace('class MainActivity : ReactActivity()', 'class GatekampenAppActivity : ReactActivity()');
 fs.writeFileSync(mainActivity,source);
}
const manifest=path.join(app,'src/main/AndroidManifest.xml');source=fs.readFileSync(manifest,'utf8');
const launcher=`      <intent-filter>
        <action android:name="android.intent.action.MAIN"/>
        <category android:name="android.intent.category.LAUNCHER"/>
      </intent-filter>`;
if(!source.includes('<activity-alias android:name=".MainActivity"')){
 if(!source.includes(launcher))throw Error('Gatekampen launcher manifest changed');
 source=source.replace(launcher,'');
 source=source.replace('<activity android:name=".MainActivity"','<activity android:name=".GatekampenAppActivity"');
 if(!source.includes('android:name=".GatekampenRecoveryActivity"'))source=source.replace('  </application>',`    <activity android:name=".GatekampenRecoveryActivity" android:exported="false" android:process=":diagnostics" android:theme="@android:style/Theme.Material.Light.NoActionBar" android:screenOrientation="portrait"/>
  </application>`);
 source=source.replace('<activity android:name=".GatekampenRecoveryActivity" android:exported="true"','<activity android:name=".GatekampenRecoveryActivity" android:exported="false"');
 source=source.replace('  </application>',`    <activity-alias android:name=".MainActivity" android:targetActivity=".GatekampenRecoveryActivity" android:exported="true">
${launcher}
    </activity-alias>
  </application>`);
 fs.writeFileSync(manifest,source);
}
const gradle=path.join(app,'build.gradle');source=fs.readFileSync(gradle,'utf8');
if(!source.includes('// Gatekampen startup recovery tests')){
 source+=`\n// Gatekampen startup recovery tests\nandroid {\n sourceSets.test.java.srcDir '${path.join(root,'scripts/android-gatekampen-test')}'\n testOptions { unitTests.includeAndroidResources = true; unitTests.all {\n systemProperty 'user.home', '/workspace/work/robolectric-home'\n systemProperty 'robolectric.dependency.repo.url', 'https://repo.maven.apache.org/maven2'\n } }\n}\ndependencies { testImplementation 'junit:junit:4.13.2'; testImplementation 'org.robolectric:robolectric:4.14.1' }\n`;
 fs.writeFileSync(gradle,source);
}
