#!/usr/bin/env python3
"""Load the exact APK's native coach in a separate test-only process with a silent TTS sink.
No test hooks, shortened schedules or fake speech engine are shipped in Tråkk.
"""
import os,subprocess,tempfile,json
from pathlib import Path
from zipfile import ZipFile

def run(args,**kwargs):return subprocess.run([str(x) for x in args],check=True,timeout=60,**kwargs)
sdk=Path(os.environ['ANDROID_HOME']);java=Path(os.environ['JAVA_HOME'])/'bin';bt=sdk/'build-tools/36.0.0';jar=sdk/'platforms/android-36/android.jar'
source=Path(__file__).parent/'android-coach-test'
with tempfile.TemporaryDirectory() as temp:
 out=Path(temp);(out/'classes').mkdir();(out/'dex').mkdir()
 run([java/'javac','-source','8','-target','8','-cp',jar,'-d',out/'classes',*source.glob('*.java')])
 run([bt/'d8','--lib',jar,'--min-api','24','--output',out/'dex',*out.glob('classes/**/*.class')])
 apk=out/'test.apk';run([bt/'aapt','package','-f','-M',source/'AndroidManifest.xml','-I',jar,'-F',apk])
 with ZipFile(apk,'a') as z:z.write(out/'dex/classes.dex','classes.dex')
 run([java/'keytool','-genkeypair','-keystore',out/'test.jks','-storepass','android','-keypass','android','-alias','test','-dname','CN=TrakkCoachTest','-keyalg','RSA','-keysize','2048','-validity','1','-noprompt'])
 run([bt/'apksigner','sign','--ks',out/'test.jks','--ks-pass','pass:android',apk])
 subprocess.run(['adb','uninstall','no.trakk.coachtest'],capture_output=True)
 run(['adb','install',apk])
 run(['adb','push',source/'plan.json','/sdcard/trakk-coach-plan.json'])
 old=subprocess.check_output(['adb','shell','settings','get','secure','tts_default_synth'],text=True).strip()
 try:
  run(['adb','shell','settings','put','secure','tts_default_synth','no.trakk.coachtest'])
  result=subprocess.check_output(['adb','shell','am','instrument','-w','no.trakk.coachtest/no.trakk.coachtest.Check'],text=True,timeout=60)
  print(result,flush=True)
  assert 'PASS: final APK native clock' in result
 finally:
  run(['adb','shell','settings','put','secure','tts_default_synth',old])
  run(['adb','shell','input','keyevent','224'])
  run(['adb','shell','input','keyevent','82'])
