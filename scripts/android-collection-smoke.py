#!/usr/bin/env python3
"""Final APK check with synthetic corner/junction evidence; no user data."""
import json
import math
import os
import runpy
import sqlite3
import subprocess
import tempfile
import time
from pathlib import Path
os.environ['TRAKK_SMOKE_HELPERS_ONLY'] = '1'
context=runpy.run_path(str(Path(__file__).with_name('android-smoke.py')))
adb,tap,find,launch=(context[n] for n in ['adb','tap','find','launch'])
PACKAGE=context['PACKAGE']
try:
    context['install_hierarchy_helper']()
    adb('install','-r','android/app/build/outputs/apk/release/app-release.apk')
    launch()
    adb('shell','am','force-stop',PACKAGE); adb('root'); adb('wait-for-device')
    with tempfile.TemporaryDirectory() as temp:
        folder=Path(temp)
        path=adb('shell','find','/data/user/0/'+PACKAGE,'-name','trakk.db').strip().splitlines()[0]
        assert path.startswith('/data/user/0/'+PACKAGE+'/') and ' ' not in path
        for suffix in ['', '-wal', '-shm']: adb('pull',path+suffix,str(folder/('trakk.db'+suffix)),check=suffix=='')
        db=sqlite3.connect(folder/'trakk.db'); now=int(time.time()*1000); start=now-1000000
        def coordinate(x,y):return dict(latitude=60.63+y/111195,longitude=6.42+x/(111195*math.cos(math.radians(60.63))))
        def fix(x,y,offset):return dict(**coordinate(x,y),timestamp=start+offset,accuracy=4,speed=1.4,altitude=None,altitudeAccuracy=None)
        points=[fix(8+i*4,5,i*3000) for i in range(9)]+[fix(8+i*5.5,194,150000+i*4000) for i in range(21)]
        db.execute('INSERT INTO trips VALUES (?, ?, ?, ?, NULL, 0, 0)',('junction-fixture','Hjoerner og gateender',start,points[-1]['timestamp']))
        db.executemany('INSERT INTO points VALUES (?, ?, ?)', [('junction-fixture',p['timestamp'],json.dumps(p)) for p in points])
        corner=[coordinate(0,0),coordinate(48,0)]
        trunk=[coordinate(0,200),coordinate(120,200)]
        left=[trunk[-1],coordinate(120,208)]; right=[trunk[-1],coordinate(120,180)]
        def street(id,name,paths,ends):return dict(id=id,name=name,kind='street',**paths[0][0],geometry=paths[0],streetPaths=paths,streetEnds=ends,sourceUrl='',fetchedAt=now)
        items=[street('street/corner','Testgate hjoerne',[corner],corner),street('street/fan','Testgate kryss',[trunk,left,right],[trunk[0],left[-1],right[-1]]),dict(id='way/unnamed',name='Sti uten navn',kind='trail',**corner[0],geometry=corner,sourceUrl='',fetchedAt=now)]
        def setting(k,v): db.execute('INSERT OR REPLACE INTO settings VALUES (?,?)',(k,json.dumps(v)))
        setting('osmDiscoveries',items);setting('homeArea',dict(name='Testomraade',radius=3000,**coordinate(0,0)))
        cache=dict(points={},regions={},streets={'1':now})
        for p in points:
            key=f"{min(8999,int((p['latitude']+90)//.02))}:{min(8999,int((p['longitude']+180)//.04))}"
            cache['points'][key]=now;cache['regions'][key]=dict(id=1,name='Fixture')
        setting('surveyCache',cache)
        db.commit();db.execute('PRAGMA wal_checkpoint(TRUNCATE)');db.close()
        adb('shell','rm','-f',path+'-wal',path+'-shm');adb('push',str(folder/'trakk.db'),'/data/local/tmp/trakk-test.db');adb('shell','cat /data/local/tmp/trakk-test.db > '+path)
    launch();tap('Turlogg');tap('Hjoerner og gateender')
    find('Nye funn · 2');find('✓ Testgate hjoerne');find('✓ Testgate kryss')
    print('PASS: final APK awards short sidewalk corners and a terminal junction fan',flush=True)
    tap('Lukk');tap('Deg');tap('Åpne samlingen min');find('Dine funn · 2')
    find('Stier og trapper uten navn · 1')
    with open('/tmp/trakk-rewards.png','wb') as output:subprocess.run(['adb','exec-out','screencap','-p'],stdout=output,check=True,timeout=30)
    tap('Åpne stier og trapper uten navn');tap('Gi et Tråkk-navn');tap('Tråkk-navn')
    adb('shell','input','text','Nabolagsstien');adb('shell','input','keyevent','4');tap('Lagre Tråkk-navn')
    tap('Lukk');tap('Åpne samlingen min');find('Dine funn · 3');find('✓ Nabolagsstien')
    tap('Vis Nabolagsstien på kartet');find('Nabolagsstien · markert i korall · Lukk ×')
    adb('shell','am','force-stop',PACKAGE);launch();tap('Deg');tap('Åpne samlingen min')
    find('Dine funn · 3');find('✓ Nabolagsstien')
    with open('/tmp/trakk-names.png','wb') as output:subprocess.run(['adb','exec-out','screencap','-p'],stdout=output,check=True,timeout=30)
    print('PASS: final APK groups unnamed routes; local naming, map opening and awards survive restart',flush=True)
finally:
    Path('/tmp/trakk-crash.log').write_text(adb('logcat','-b','crash','-d',check=False))
    Path('/tmp/trakk-js.log').write_text(adb('logcat','-d','-s','ReactNativeJS:V','AndroidRuntime:E',check=False))
