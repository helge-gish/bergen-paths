#!/usr/bin/env python3
"""Synthetic final-APK check: results, start gate, live completion, deviation,
explicit free walking, save confirmation, undo and collapsed name editing.
No user GPS exports are used or uploaded.
"""
import json
import os
import re
import runpy
import sqlite3
import subprocess
import tempfile
import time
from pathlib import Path
os.environ['TRAKK_SMOKE_HELPERS_ONLY'] = '1'
c = runpy.run_path(str(Path(__file__).with_name('android-smoke.py')))
adb, tap, find, launch, screen = (c[n] for n in ['adb','tap','find','launch','screen'])
PACKAGE = c['PACKAGE']

def top():
    for _ in range(5): adb('shell','input','swipe','8','400','8','1900','90')

def shot(name):
    with open('/tmp/'+name,'wb') as output: subprocess.run(['adb','exec-out','screencap','-p'],stdout=output,check=True,timeout=30)

def gps(lat, lon=5.3): adb('emu','geo','fix',str(lon),str(lat))

def wait_fix(lat, lon=5.3, seconds=6):
    for _ in range(seconds//2): gps(lat,lon);time.sleep(2)

def tap_contains(text):
    x,y=find(text,contains=True);adb('shell','input','tap',str(x),str(y))

try:
    c['install_hierarchy_helper']()
    adb('install','-r','android/app/build/outputs/apk/release/app-release.apk')
    for permission in ['ACCESS_COARSE_LOCATION','ACCESS_FINE_LOCATION','ACCESS_BACKGROUND_LOCATION','POST_NOTIFICATIONS']:
        adb('shell','pm','grant',PACKAGE,'android.permission.'+permission)
    gps(60.01);launch();adb('shell','am','force-stop',PACKAGE);adb('root');adb('wait-for-device')
    with tempfile.TemporaryDirectory() as temp:
        folder=Path(temp);path=adb('shell','find','/data/user/0/'+PACKAGE,'-name','trakk.db').strip().splitlines()[0]
        assert path.startswith('/data/user/0/'+PACKAGE+'/') and ' ' not in path
        for suffix in ['', '-wal','-shm']:adb('pull',path+suffix,str(folder/('trakk.db'+suffix)),check=suffix=='')
        db=sqlite3.connect(folder/'trakk.db');now=int(time.time()*1000);start=now-4000000
        points=[dict(latitude=60+i*.0001,longitude=5.3,timestamp=start+i*10000,accuracy=3,speed=1.1,altitude=100+i,altitudeAccuracy=2) for i in range(21)]
        for id,name,offset,pace in [('source','Referanserunden',0,1),('repeat','Runden igjen',2000000,.7)]:
            ps=[dict(p,timestamp=start+offset+int((p['timestamp']-start)*pace)) for p in points]
            db.execute('INSERT INTO trips VALUES (?, ?, ?, ?, NULL, 0, 0)',(id,name,ps[0]['timestamp'],ps[-1]['timestamp']))
            db.executemany('INSERT INTO points VALUES (?, ?, ?)',[(id,p['timestamp'],json.dumps(p)) for p in ps])
        for i,label in enumerate(['Testbakken','Testtrappen']):
            db.execute('INSERT INTO trails VALUES (?, ?, ?, ?, ?)',('stretch-'+str(i),'source',label,start+200000,json.dumps(points[i*8:i*8+8])))
        def setting(k,v):db.execute('INSERT OR REPLACE INTO settings VALUES (?, ?)',(k,json.dumps(v)))
        setting('homeArea',dict(name='Testområdet',latitude=60,longitude=5.3,radius=3000))
        cache=dict(points={},regions={},streets={'1':now})
        for p in points:
            key=f"{min(8999,int((p['latitude']+90)//.02))}:{min(8999,int((p['longitude']+180)//.04))}"
            cache['points'][key]=now;cache['regions'][key]=dict(id=1,name='Fixture')
        setting('surveyCache',cache)
        db.commit();db.execute('PRAGMA wal_checkpoint(TRUNCATE)');db.close()
        adb('shell','rm','-f',path+'-wal',path+'-shm');adb('push',str(folder/'trakk.db'),'/data/local/tmp/trakk-test.db');adb('shell','cat /data/local/tmp/trakk-test.db > '+path)
    launch();tap('Turlogg');tap('Runden igjen');find('Fullførte strekk · 2');find('✓ Testbakken');find('Mot tidligere beste:',contains=True);shot('trakk-rewards.png')
    print('PASS: historical walk shows both completed stretches and previous/best comparison',flush=True)
    tap('Bruk denne turen som skygge');wait_fix(60.01)
    find('Gå til startpunktet først')
    node=next(n for n in screen().iter('node') if n.get('content-desc')=='Gå til startpunktet først')
    assert node.get('enabled')=='false', 'Ghost start must stay disabled away from start'
    top();find('Først: finn startpunktet');shot('trakk-names.png')
    wait_fix(60);tap('Start turen min');time.sleep(4)
    for i in range(1,9):gps(60+i*.0001);time.sleep(3)
    find('Fullførte strekk · 1');find('✓ Testbakken');find('Mot skyggen:',contains=True)
    assert 'Lagre strekk hit' not in Path('/tmp/trakk-ui.xml').read_text()
    print('PASS: away start blocked, nearby start works, live stretch completion compares ghost without clipping controls',flush=True)
    top();shot('trakk-map.png')
    for i in range(1,20):gps(60.0008,5.3+i*.00015);time.sleep(3)
    top();find('Du har gått av ruten')
    print('PASS: sustained deviation produces visible guidance while recording continues',flush=True)
    tap('Fortsett uten skygge');tap('Fortsett uten skygge');time.sleep(2)
    for i in range(1,5):gps(60.0008+i*.0001,5.30285);time.sleep(3)
    tap('Lagre strekk hit');find('✓ Strekket er lagret. Neste strekk starter her.')
    assert 'Navn på strekket' not in Path('/tmp/trakk-ui.xml').read_text()
    tap_contains('Angre ·');find('Angret. GPS-sporet er beholdt.')
    tap('Sett start her');find('✓ Startpunkt satt her. Hele turen lagres fortsatt.');tap_contains('Angre ·');find('Angret. GPS-sporet er beholdt.')
    print('PASS: explicit free walking, save and set-start confirmations with undo, no stuck edit field',flush=True)
    tap('Avslutt og lagre tur');tap('Avslutt og lagre');time.sleep(3)
    adb('shell','am','force-stop',PACKAGE);launch();tap('Turlogg');tap('Runden igjen');find('Fullførte strekk · 2')
    print('PASS: completed stretch results survive restart',flush=True)
finally:
    Path('/tmp/trakk-crash.log').write_text(adb('logcat','-b','crash','-d',check=False))
    Path('/tmp/trakk-js.log').write_text(adb('logcat','-d','-s','ReactNativeJS:V','AndroidRuntime:E',check=False))
