#!/usr/bin/env python3
"""Emulator-only regression: wide recorded route, cancel deletion, delete and reopen."""
import json
import math
import runpy
import sqlite3
import subprocess
import tempfile
import time
from pathlib import Path

context = runpy.run_path(str(Path(__file__).with_name('android-smoke.py')))
adb, tap, find, alive, launch = (context[n] for n in ['adb', 'tap', 'find', 'alive', 'launch'])
PACKAGE = context['PACKAGE']

def pull_database(folder):
    path = adb('shell', 'find', '/data/user/0/' + PACKAGE, '-name', 'trakk.db').strip().splitlines()[0]
    assert path.startswith('/data/user/0/' + PACKAGE + '/') and ' ' not in path
    for suffix in ['', '-wal', '-shm']:
        adb('pull', path + suffix, str(folder / ('trakk.db' + suffix)), check=suffix == '')
    return path

try:
    # Only the disposable emulator is seeded. No test endpoints or seed code ship in the app.
    adb('shell', 'am', 'force-stop', PACKAGE)
    adb('root')
    adb('wait-for-device')
    with tempfile.TemporaryDirectory() as temp:
        folder = Path(temp)
        path = pull_database(folder)
        db = sqlite3.connect(folder / 'trakk.db')
        db.execute('PRAGMA foreign_keys = ON')
        start = int(time.time() * 1000) - 3600000
        points = [dict(latitude=60.39 + .003 * math.sin(math.pi * i / 80), longitude=5.32 + .0007 * i,
                       timestamp=start + i * 30000, accuracy=5, speed=1.5, altitude=100, altitudeAccuracy=3) for i in range(81)]
        db.execute('INSERT INTO trips VALUES (?, ?, ?, ?, NULL, 0, 0)', ('map-delete-fixture', 'Karttest 3 km', start, start + 2400000))
        db.executemany('INSERT INTO points VALUES (?, ?, ?)', [('map-delete-fixture', p['timestamp'], json.dumps(p)) for p in points])
        db.execute('INSERT INTO trails VALUES (?, ?, ?, ?, ?)', ('map-test-trail', 'map-delete-fixture', 'Teststi', start, json.dumps(points)))
        db.execute('INSERT INTO trips VALUES (?, ?, ?, ?, ?, 0, 0)', ('ghost-test-fixture', 'Annen tur beholdes', start - 3600000, start - 3000000, 'map-delete-fixture'))
        count = db.execute('SELECT COUNT(*) FROM trips').fetchone()[0]
        db.commit()
        db.execute('PRAGMA wal_checkpoint(TRUNCATE)')
        db.close()
        adb('shell', 'rm', '-f', path + '-wal', path + '-shm')
        adb('push', str(folder / 'trakk.db'), '/data/local/tmp/trakk-test.db')
        adb('shell', 'cat /data/local/tmp/trakk-test.db > ' + path)
    launch()
    tap('Turlogg')
    tap('Karttest 3 km')
    time.sleep(6)
    with open('/tmp/trakk-map.png', 'wb') as output:
        subprocess.run(['adb', 'exec-out', 'screencap', '-p'], stdout=output, check=True, timeout=30)
    tap('Slett tur')
    tap('Avbryt')
    tap('Lukk')
    tap('Karttest 3 km')
    print('PASS: cancelling deletion retains the saved trip', flush=True)
    tap('Slett tur')
    tap('Slett tur')
    time.sleep(2)
    alive()
    find('Sporene dine.')
    adb('shell', 'am', 'force-stop', PACKAGE)
    with tempfile.TemporaryDirectory() as temp:
        pull_database(Path(temp))
        db = sqlite3.connect(Path(temp) / 'trakk.db')
        assert db.execute("SELECT COUNT(*) FROM trips WHERE id='map-delete-fixture'").fetchone()[0] == 0
        assert db.execute("SELECT COUNT(*) FROM points WHERE tripId='map-delete-fixture'").fetchone()[0] == 0
        assert db.execute("SELECT COUNT(*) FROM trails WHERE tripId='map-delete-fixture'").fetchone()[0] == 0
        assert db.execute("SELECT ghostId FROM trips WHERE id='ghost-test-fixture'").fetchone()[0] is None
        assert db.execute('SELECT COUNT(*) FROM trips').fetchone()[0] == count - 1
        db.close()
    launch()
    tap('Turlogg')
    find('Annen tur beholdes')
    print('PASS: deletion persists after relaunch; dependent data removed; other trips retained', flush=True)
finally:
    Path('/tmp/trakk-crash.log').write_text(adb('logcat', '-b', 'crash', '-d', check=False))
    Path('/tmp/trakk-js.log').write_text(adb('logcat', '-d', '-s', 'ReactNativeJS:V', 'AndroidRuntime:E', check=False))
