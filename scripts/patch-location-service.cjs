// Expo Location 55.1.14: foreground promotion is asynchronous and can throw on
// the main looper after JS's start promise resolved. See expo/expo#49424, #24834,
// and #51389. This patch is applied by the Gatekampen build, from source.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function replace(source,before,after){if(source.includes(after))return source;if(!source.includes(before))throw Error('expo-location source changed; review foreground service patch');return source.replace(before,after);}
function patchConsumer(source){
 if(source.includes('private fun foregroundStartFailed')){
  if(!source.includes(fs.readFileSync(path.join(__dirname,'android-location-test/foreground-service.txt'),'utf8'))||!source.includes('if (task.isSuccessful) task.result'))throw Error('Installed location patch differs; reinstall expo-location before applying');
  return source;
 }
 source=replace(source,'  private var mService: LocationTaskService? = null','  private var mService: LocationTaskService? = null\n  private var mServiceConnection: ServiceConnection? = null\n  private var mServiceIntent: Intent? = null');
 const a=source.indexOf('  private fun maybeStartForegroundService() {'),b=source.indexOf('\n  /**\n   * Reports locations',a);
 if(a<0||b<0)throw Error('expo-location foreground service boundaries changed');
 source=source.slice(0,a)+fs.readFileSync(path.join(__dirname,'android-location-test/foreground-service.txt'),'utf8')+source.slice(b);
 return replace(source,'          task.result?.let { handleLocationUpdate(listOf(it)) }','          if (task.isSuccessful) task.result?.let { handleLocationUpdate(listOf(it)) }\n          else Log.w(TAG, "Last location request failed", task.exception)');
}
function patchService(source){
 source=replace(source,'private var mChannelId: String? = null','private var mChannelId: String? = "expo-location"');
 source=replace(source,'private lateinit var mParentContext: Context','private var mParentContext: Context? = null');
 source=replace(source,'override fun onStartCommand(intent: Intent, flags: Int, startId: Int): Int {\n    val extras = intent.extras','override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {\n    val extras = intent?.extras');
 source=replace(source,'    return START_REDELIVER_INTENT','    return START_NOT_STICKY');
 source=replace(source,'    prepareChannel(mChannelId)','    val mParentContext = this.mParentContext ?: applicationContext\n    prepareChannel(mChannelId)');return source;
}
module.exports={patchConsumer,patchService};
if(require.main===module){
 const base=path.join(root,'node_modules/expo-location/android');
 if(require(path.join(base,'../package.json')).version!=='55.1.14')throw Error('Review location patch for the installed version');
 if(!require(path.join(root,'apps/gatekampen/package.json')).expo.autolinking.android.buildFromSource.includes('expo-location'))throw Error('Gatekampen must build expo-location from source');
 for(const [file,patch] of [['taskConsumers/LocationTaskConsumer.kt',patchConsumer],['services/LocationTaskService.kt',patchService]]){
  const target=path.join(base,'src/main/java/expo/modules/location',file);fs.writeFileSync(target,patch(fs.readFileSync(target,'utf8')));
 }
 const gradle=path.join(base,'build.gradle');let source=fs.readFileSync(gradle,'utf8');
 if(!source.includes('// Gatekampen native regression tests')){
  source+=`\n// Gatekampen native regression tests\nandroid {\n sourceSets.test.java.srcDir '${path.join(__dirname,'android-location-test')}'\n testOptions { unitTests.includeAndroidResources = true; unitTests.all {\n systemProperty 'user.home', '/workspace/work/robolectric-home'\n systemProperty 'robolectric.dependency.repo.url', 'https://repo.maven.apache.org/maven2'\n } }\n}\ndependencies { testImplementation 'junit:junit:4.13.2'; testImplementation 'org.robolectric:robolectric:4.14.1' }\n`;
  fs.writeFileSync(gradle,source);
 }
}
