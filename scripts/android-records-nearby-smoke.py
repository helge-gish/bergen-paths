#!/usr/bin/env python3
"""Synthetic final-APK check: historical record medals and live nearby radius.
No private GPS data is used.
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
    width,height=map(int,re.findall(r'(\d+)x(\d+)',adb('shell','wm','size'))[-1])
    for _ in range(6): adb('shell','input','swipe','8',str(height//3),'8',str(height*4//5),'120')

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
    adb('shell','pm','clear',PACKAGE)
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
        db.execute("UPDATE trips SET ghostId='source' WHERE id='repeat'")
        for i,label in enumerate(['Testbakken','Testtrappen']):
            db.execute('INSERT INTO trails VALUES (?, ?, ?, ?, ?)',('stretch-'+str(i),'source',label,start+200000,json.dumps(points[i*8:i*8+8])))
        def setting(k,v):db.execute('INSERT OR REPLACE INTO settings VALUES (?, ?)',(k,json.dumps(v)))
        setting('homeArea',dict(name='Gammelt hjemmeområde',latitude=0,longitude=0,radius=5000))
        db.execute("DELETE FROM settings WHERE key='nearbyRadius'")
        setting('goals',[dict(id='fixed-goal',title='Mitt faste mål',description='Test',targets=[],createdAt=start)])
        cache=dict(points={},regions={},streets={'1':now})
        for p in points:
            key=f"{min(8999,int((p['latitude']+90)//.02))}:{min(8999,int((p['longitude']+180)//.04))}"
            cache['points'][key]=now;cache['regions'][key]=dict(id=1,name='Fixture')
        setting('surveyCache',cache)
        db.commit();db.execute('PRAGMA wal_checkpoint(TRUNCATE)');db.close()
        adb('shell','rm','-f',path+'-wal',path+'-shm');adb('push',str(folder/'trakk.db'),'/data/local/tmp/trakk-test.db');adb('shell','cat /data/local/tmp/trakk-test.db > '+path)
    launch();tap('Turlogg');tap('Runden igjen')
    find('Personlige rekorder · 3')
    find('Rekordmedalje: Hele ruten, Referanserunden.',contains=True)
    find('Rekordmedalje: Strekk, Testbakken.',contains=True)
    shot('trakk-rewards.png')
    find('Rekordmedalje: Strekk, Testtrappen.',contains=True)
    find('Fullførte strekk · 2')
    find('Sammenlignet med skyggen');find('Du fullførte samme rute.',contains=True)
    print('PASS: full-route and both stretch record medals, plus clear final ghost comparison',flush=True)
    tap('Lukk');tap('Referanserunden');find('Fullførte strekk · 2')
    assert 'Rekordmedalje:' not in Path('/tmp/trakk-ui.xml').read_text()
    print('PASS: first traversal has no beaten-record medal',flush=True)
    tap('Lukk');tap('Deg');find('Området rundt deg')
    find('Tillat posisjon for å finne området rundt deg.')
    find('Valgt radius: 5 km',contains=True)
    top();find('Området rundt deg');tap('Radius 1 km');find('Valgt radius: 1 km',contains=True)
    top();find('Området rundt deg');tap('Radius 3 km');find('Valgt radius: 3 km',contains=True)
    assert 'Lagre hjemmeområde' not in Path('/tmp/trakk-ui.xml').read_text()
    shot('trakk-names.png')
    print('PASS: old home radius migrated, no fixed-place form, radius usable without GPS',flush=True)
    adb('shell','am','force-stop',PACKAGE)
    for permission in ['ACCESS_COARSE_LOCATION','ACCESS_FINE_LOCATION']:
        adb('shell','pm','grant',PACKAGE,'android.permission.'+permission)
    gps(59.91,10.75);launch();tap('Finn min posisjon');time.sleep(2)
    if any(n.get('text')=='Turn on' for n in screen().iter('node')):tap('Turn on')
    wait_fix(59.91,10.75,20)
    tap('Deg');find('Området rundt deg');find('Området følger posisjonen din.')
    find('Valgt radius: 3 km',contains=True);shot('trakk-map.png')
    print('PASS: fresh GPS replaces old home and selected radius survives relaunch',flush=True)
    top();tap('Åpne mine mål');find('3 km rundt der du er nå');find('Mitt faste mål')
    tap('Lukk');tap('Turlogg');tap('Runden igjen');find('Personlige rekorder · 3')
    print('PASS: active goal and historical medals survive location change and relaunch',flush=True)
    adb('shell','am','force-stop',PACKAGE)
    with tempfile.TemporaryDirectory() as temp:
        for suffix in ['', '-wal','-shm']:adb('pull',path+suffix,str(Path(temp)/('trakk.db'+suffix)),check=suffix=='')
        db=sqlite3.connect(Path(temp)/'trakk.db')
        settings={key:json.loads(value) for key,value in db.execute('SELECT key,value FROM settings')}
        assert settings['homeArea'] is None
        assert settings['nearbyRadius']==3000
        assert settings['goals'][0]['id']=='fixed-goal'
        db.close()
    print('PASS: only radius retained, obsolete home coordinate cleared, active goal untouched',flush=True)
finally:
    Path('/tmp/trakk-crash.log').write_text(adb('logcat','-b','crash','-d',check=False))
    Path('/tmp/trakk-js.log').write_text(adb('logcat','-d','-s','ReactNativeJS:V','AndroidRuntime:E',check=False))
