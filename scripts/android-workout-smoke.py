#!/usr/bin/env python3
"""Final APK UI + persisted trainer check on a disposable emulator, synthetic data only."""
import os,re,runpy,time,tempfile,sqlite3,json,subprocess
from pathlib import Path
os.environ['TRAKK_SMOKE_HELPERS_ONLY']='1'
c=runpy.run_path(str(Path(__file__).with_name('android-smoke.py')))
adb,tap,find,launch,screen=(c[n] for n in ['adb','tap','find','launch','screen'])
PACKAGE=c['PACKAGE']
def top():
 width,height=map(int,re.findall(r'(\d+)x(\d+)',adb('shell','wm','size'))[-1])
 for _ in range(6):adb('shell','input','swipe','8',str(height//3),'8',str(height*4//5),'120')
def contains(label):
 x,y=find(label,contains=True);adb('shell','input','tap',str(x),str(y))
try:
 c['install_hierarchy_helper']();adb('install','-r','android/app/build/outputs/apk/release/app-release.apk');adb('shell','pm','clear',PACKAGE)
 for permission in ['ACCESS_COARSE_LOCATION','ACCESS_FINE_LOCATION','ACCESS_BACKGROUND_LOCATION','POST_NOTIFICATIONS']:adb('shell','pm','grant',PACKAGE,'android.permission.'+permission)
 adb('emu','geo','fix','5.3','60.0');launch();tap('Start en tur');tap('4×4-trener · beta');find('35 minutter totalt.',contains=True)
 tap('Start turen min');time.sleep(3)
 if any(n.get('text')=='Turn on' for n in screen().iter('node')):tap('Turn on');time.sleep(4)
 top();find('4×4-TRENER · BETA');find('Oppvarming · rolig gange');tap('Pause 4×4');top();find('Treningen er satt på pause')
 with open('/tmp/trakk-workout.png','wb') as out:subprocess.run(['adb','exec-out','screencap','-p'],stdout=out,check=True,timeout=30)
 adb('shell','am','force-stop',PACKAGE);launch();find('Treningen er satt på pause');tap('Fortsett 4×4');top();find('Oppvarming · rolig gange')
 tap('Avslutt 4×4 · gå videre fritt');tap('Avslutt 4×4');top();find('4×4-økten ble avsluttet tidlig')
 tap('Avslutt og lagre tur');tap('Avslutt og lagre');find('4×4-økten ble avsluttet tidlig');tap('Lukk')
 adb('shell','am','force-stop',PACKAGE);adb('root');adb('wait-for-device')
 with tempfile.TemporaryDirectory() as tmp:
  path=adb('shell','find','/data/user/0/'+PACKAGE,'-name','trakk.db').strip().splitlines()[0]
  for suffix in ['', '-wal','-shm']:adb('pull',path+suffix,str(Path(tmp)/('trakk.db'+suffix)),check=suffix=='')
  db=sqlite3.connect(Path(tmp)/'trakk.db');trip=db.execute('SELECT id,endedAt FROM trips').fetchone();assert trip[1] is not None
  w=json.loads(db.execute('SELECT value FROM settings WHERE key=?',('workout:'+trip[0],)).fetchone()[0]);assert w['kind']=='4x4' and w['runningSince'] is None and w['endedAt'] is not None
  assert 0<w['elapsedMs']<300000
  now=int(time.time()*1000)
  points=[dict(latitude=60+i*.0001,longitude=5.3,timestamp=now-100000+i*10000,accuracy=3,altitude=10,altitudeAccuracy=2,speed=1) for i in range(5)]
  db.execute('INSERT INTO trails VALUES (?, ?, ?, ?, ?)',('test-stretch',trip[0],'Teststrekket',now,json.dumps(points)))
  db.commit();db.execute('PRAGMA wal_checkpoint(TRUNCATE)');db.close()
  adb('shell','rm','-f',path+'-wal',path+'-shm');adb('push',str(Path(tmp)/'trakk.db'),'/data/local/tmp/trakk-test.db');adb('shell','cat /data/local/tmp/trakk-test.db > '+path)
 print('PASS: real start, pause survives process restart, resume, early trainer stop preserves active GPS trip, summary and durable state',flush=True)
 launch();tap('Utforsk');tap('Åpne strekk: Teststrekket');tap('Gå denne igjen med skygge');top();tap('4×4-trener · beta');tap('Fritt tempo')
 top();assert any(n.get('content-desc')=='Fritt tempo' and n.get('checked')=='true' for n in screen().iter('node'))
 print('PASS: saved stretch + ghost uses same free/4x4 picker',flush=True)
finally:
 Path('/tmp/trakk-crash.log').write_text(adb('logcat','-b','crash','-d',check=False))
 Path('/tmp/trakk-js.log').write_text(adb('logcat','-d','-s','ReactNativeJS:V','AndroidRuntime:E','TrakkCoach:I',check=False))
