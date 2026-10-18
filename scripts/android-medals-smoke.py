#!/usr/bin/env python3
"""Final APK: medals on the earning trip, no repeats, and accurate profile wording.
Synthetic tracks only, on a disposable rooted emulator.
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

def screenshot(name):
    with open('/tmp/' + name, 'wb') as output:
        subprocess.run(['adb', 'exec-out', 'screencap', '-p'], stdout=output, check=True, timeout=30)

try:
    context['install_hierarchy_helper']()
    adb('install', '-r', 'android/app/build/outputs/apk/release/app-release.apk')
    launch(); adb('shell', 'am', 'force-stop', PACKAGE); adb('root'); adb('wait-for-device')
    with tempfile.TemporaryDirectory() as temp:
        folder = Path(temp)
        path = adb('shell', 'find', '/data/user/0/' + PACKAGE, '-name', 'trakk.db').strip().splitlines()[0]
        assert path.startswith('/data/user/0/' + PACKAGE + '/') and ' ' not in path
        for suffix in ['', '-wal', '-shm']:
            adb('pull', path + suffix, str(folder / ('trakk.db' + suffix)), check=suffix == '')
        db = sqlite3.connect(folder / 'trakk.db'); now = int(time.time() * 1000); start = now - 4000000
        def point(i):
            return dict(latitude=60.63 + i * .0001, longitude=6.42, timestamp=start + i * 10000, accuracy=3, speed=1.1, altitude=100 + i * 2, altitudeAccuracy=2)
        points = [point(i) for i in range(121)]
        for id, name, offset in [('medal-first', 'Medaljeturen', 0), ('medal-repeat', 'Samme tur igjen', 2000000)]:
            db.execute('INSERT INTO trips VALUES (?, ?, ?, ?, NULL, 0, 0)', (id, name, start + offset, points[-1]['timestamp'] + offset))
            db.executemany('INSERT INTO points VALUES (?, ?, ?)', [(id, p['timestamp'] + offset, json.dumps(dict(p, timestamp=p['timestamp'] + offset))) for p in points])
        for i in range(3):
            db.execute('INSERT INTO trails VALUES (?, ?, ?, ?, ?)', (f'segment-{i}', 'medal-first', f'Testsegment {i+1}', start + i, json.dumps(points[i*20:(i+1)*20+1])))
        items = [dict(id='node/view', name='Testutsikten', kind='viewpoint', **point(10), geometry=[], sourceUrl='', fetchedAt=now)]
        def setting(k, v): db.execute('INSERT OR REPLACE INTO settings VALUES (?, ?)', (k, json.dumps(v)))
        setting('osmDiscoveries', items)
        setting('homeArea', dict(name='Testomraadet', radius=3000, latitude=60.63, longitude=6.42))
        cache = dict(points={}, regions={}, streets={'1': now})
        for p in points:
            key = f"{min(8999,int((p['latitude']+90)//.02))}:{min(8999,int((p['longitude']+180)//.04))}"
            cache['points'][key] = now; cache['regions'][key] = dict(id=1, name='Fixture')
        setting('surveyCache', cache)
        db.commit(); db.execute('PRAGMA wal_checkpoint(TRUNCATE)'); db.close()
        adb('shell', 'rm', '-f', path + '-wal', path + '-shm'); adb('push', str(folder / 'trakk.db'), '/data/local/tmp/trakk-test.db'); adb('shell', 'cat /data/local/tmp/trakk-test.db > ' + path)
    launch(); tap('Turlogg'); tap('Medaljeturen')
    find('Medaljer fra turen')
    find('Medalje: Til fots totalt, 1 km. Oppnådd på denne turen. 100 XP.')
    find('Medalje: Høydemeter opp totalt, 100 hm. Oppnådd på denne turen. 100 XP.')
    find('Medalje: Funn i samlingen, 1 funn. Oppnådd på denne turen. 100 XP.')
    screenshot('trakk-rewards.png')
    find('+300 XP fra turen · Nådde nivå 2!')
    find('Nye funn · 1')
    print('PASS: distance, ascent and collection medals with 300 XP and level increase on the earning trip', flush=True)
    tap('Lukk'); tap('Samme tur igjen'); find('Dette fikk du på turen'); find('Nye funn · 0')
    assert not any('Medalje:' in n.get('content-desc', '') for n in context['screen']().iter('node'))
    print('PASS: repeating the walk does not repeat earned medals', flush=True)
    tap('Lukk'); tap('Deg'); find('lagrede ruter'); find('funn'); find('Samlingen min · 1 funn')
    screenshot('trakk-names.png')
    assert not any('stempler' in (n.get('text', '') + n.get('content-desc', '')) or 'navngitte stier' in n.get('text', '') for n in context['screen']().iter('node'))
    adb('shell', 'am', 'force-stop', PACKAGE); launch(); tap('Turlogg'); tap('Medaljeturen')
    find('Medaljer fra turen'); find('Medalje: Til fots totalt, 1 km. Oppnådd på denne turen. 100 XP.')
    print('PASS: corrected profile labels and trip medals survive relaunch', flush=True)
finally:
    Path('/tmp/trakk-crash.log').write_text(adb('logcat', '-b', 'crash', '-d', check=False))
    Path('/tmp/trakk-js.log').write_text(adb('logcat', '-d', '-s', 'ReactNativeJS:V', 'AndroidRuntime:E', check=False))
