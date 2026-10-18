#!/usr/bin/env python3
"""Final APK: automatic finish names, selectable suggestions and custom-name persistence.

Only synthetic tracks are seeded, on a disposable rooted emulator.
"""
import json
import os
import runpy
import sqlite3
import subprocess
import tempfile
import time
from pathlib import Path
os.environ['TRAKK_SMOKE_HELPERS_ONLY'] = '1'
context = runpy.run_path(str(Path(__file__).with_name('android-smoke.py')))
adb, tap, find, launch = (context[n] for n in ['adb', 'tap', 'find', 'launch'])
PACKAGE = context['PACKAGE']

def pull(folder):
    path = adb('shell', 'find', '/data/user/0/' + PACKAGE, '-name', 'trakk.db').strip().splitlines()[0]
    assert path.startswith('/data/user/0/' + PACKAGE + '/') and ' ' not in path
    for suffix in ['', '-wal', '-shm']:
        adb('pull', path + suffix, str(folder / ('trakk.db' + suffix)), check=suffix == '')
    return path

def screenshot(name):
    with open('/tmp/' + name, 'wb') as output:
        subprocess.run(['adb', 'exec-out', 'screencap', '-p'], stdout=output, check=True, timeout=30)

try:
    context['install_hierarchy_helper']()
    adb('install', '-r', 'android/app/build/outputs/apk/release/app-release.apk')
    for permission in ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'ACCESS_BACKGROUND_LOCATION', 'POST_NOTIFICATIONS']:
        adb('shell', 'pm', 'grant', PACKAGE, 'android.permission.' + permission)
    adb('logcat', '-c')
    adb('emu', 'geo', 'fix', '6.42', '60.63')
    launch()
    adb('shell', 'am', 'force-stop', PACKAGE); adb('root'); adb('wait-for-device')
    with tempfile.TemporaryDirectory() as temp:
        folder = Path(temp); path = pull(folder)
        db = sqlite3.connect(folder / 'trakk.db'); now = int(time.time() * 1000); start = now - 400000
        def point(i):
            return dict(latitude=60.63 + i * .0001, longitude=6.42, timestamp=start + i * 10000, accuracy=3, speed=1, altitude=None, altitudeAccuracy=None)
        points = [point(i) for i in range(21)]
        db.execute('INSERT INTO trips VALUES (?, ?, ?, NULL, NULL, 0, 0)', ('name-fixture', 'Forelopig turnavn', start))
        db.executemany('INSERT INTO points VALUES (?, ?, ?)', [('name-fixture', p['timestamp'], json.dumps(p)) for p in points])
        items = [dict(id='street/test', name='Testgaten', kind='street', **point(0), geometry=[point(0), point(20)], streetPaths=[[point(0), point(20)]], streetEnds=[point(0), point(20)], sourceUrl='', fetchedAt=now),
                 dict(id='node/peak', name='Testtoppen', kind='peak', **point(10), geometry=[], sourceUrl='', fetchedAt=now),
                 dict(id='node/unnamed', name='Utsiktspunkt', kind='viewpoint', **point(10), geometry=[], sourceUrl='', fetchedAt=now)]
        def setting(k, v): db.execute('INSERT OR REPLACE INTO settings VALUES (?, ?)', (k, json.dumps(v)))
        setting('osmDiscoveries', items); setting('automaticName:name-fixture', True)
        setting('homeArea', dict(name='Testomraadet', radius=3000, latitude=60.63, longitude=6.42))
        cache = dict(points={}, regions={}, streets={'1': now})
        for p in points:
            key = f"{min(8999,int((p['latitude']+90)//.02))}:{min(8999,int((p['longitude']+180)//.04))}"
            cache['points'][key] = now; cache['regions'][key] = dict(id=1, name='Fixture')
        setting('surveyCache', cache)
        db.commit(); db.execute('PRAGMA wal_checkpoint(TRUNCATE)'); db.close()
        adb('shell', 'rm', '-f', path + '-wal', path + '-shm'); adb('push', str(folder / 'trakk.db'), '/data/local/tmp/trakk-test.db'); adb('shell', 'cat /data/local/tmp/trakk-test.db > ' + path)
    launch(); tap('Avslutt og lagre tur'); tap('Avslutt og lagre')
    find('Tur til Testtoppen'); find('Forslag til turnavn')
    tap('Bruk turnavn: Testtoppen og Testgaten'); time.sleep(1)
    screenshot('trakk-names.png')
    tap('Lukk'); tap('Utforsk'); tap('Start en tur')
    find('Forslag til turnavn'); tap('Navn på den nye turen')
    adb('shell', 'input', 'text', 'Familieturen'); adb('shell', 'input', 'keyevent', '4')
    screenshot('trakk-rewards.png')
    tap('Ta med en skygge (valgfritt)'); tap('Gå uten skygge'); find('Familieturen')
    tap('Start turen min')
    for i in range(3):
        adb('emu', 'geo', 'fix', '6.42', str(60.63 + i * .00005)); time.sleep(3)
    tap('Avslutt og lagre tur'); tap('Avslutt og lagre'); find('Familieturen')
    adb('shell', 'am', 'force-stop', PACKAGE)
    with tempfile.TemporaryDirectory() as temp:
        folder = Path(temp); pull(folder); db = sqlite3.connect(folder / 'trakk.db')
        assert db.execute("SELECT name FROM trips WHERE id='name-fixture'").fetchone()[0] == 'Testtoppen og Testgaten'
        assert db.execute("SELECT COUNT(*) FROM trips WHERE name='Familieturen' AND endedAt IS NOT NULL").fetchone()[0] == 1
        db.close()
    launch(); tap('Turlogg'); find('Familieturen'); tap('Testtoppen og Testgaten'); find('Forslag til turnavn')
    print('PASS: automatic finish name uses actual visited places; suggestion selection survives restart', flush=True)
    print('PASS: custom start name survives ghost picker, GPS recording, finish and restart', flush=True)
finally:
    Path('/tmp/trakk-crash.log').write_text(adb('logcat', '-b', 'crash', '-d', check=False))
    Path('/tmp/trakk-js.log').write_text(adb('logcat', '-d', '-s', 'ReactNativeJS:V', 'AndroidRuntime:E', check=False))
