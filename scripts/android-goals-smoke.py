#!/usr/bin/env python3
"""Disposable emulator: inherited lifecycle plus area goals, avatar, automatic awards and start flow."""
import json
import runpy
import sqlite3
import subprocess
import tempfile
import time
from pathlib import Path

prior = runpy.run_path(str(Path(__file__).with_name('android-trip-details-smoke.py')))
adb, tap, find, alive, launch = (prior[n] for n in ['adb', 'tap', 'find', 'alive', 'launch'])
context, PACKAGE, pull_database = prior['context'], prior['PACKAGE'], prior['pull_database']
try:
    tap('Utforsk')
    xml = context['screen']()
    assert not any('Ta med din egen skygge' in (n.get('text', '') + n.get('content-desc', '')) for n in xml.iter('node'))
    tap('Start en tur')
    tap('Ta med en skygge (valgfritt)')
    tap('Gå uten skygge')
    find('Start turen min')
    tap('Lukk')
    print('PASS: optional ghost selection is inside start dialog and returns to start', flush=True)

    adb('shell', 'am', 'force-stop', PACKAGE)
    with tempfile.TemporaryDirectory() as temp:
        folder = Path(temp)
        path = pull_database(folder)
        db = sqlite3.connect(folder / 'trakk.db')
        now = int(time.time() * 1000)
        start = now - 2000000
        points = [dict(latitude=60.63 + i * .0001, longitude=6.42, timestamp=start + i * 10000, accuracy=3, altitude=10+i*2, altitudeAccuracy=2, speed=1) for i in range(121)]
        db.execute('INSERT INTO trips VALUES (?, ?, ?, ?, NULL, 0, 0)', ('avatar-fixture', 'Milepaeltest', start, points[-1]['timestamp']))
        db.executemany('INSERT INTO points VALUES (?, ?, ?)', [('avatar-fixture', p['timestamp'], json.dumps(p)) for p in points])
        target = dict(id='node/99900001', name='Testutsikt', kind='viewpoint', latitude=60.63, longitude=6.42, geometry=[], sourceUrl='https://www.openstreetmap.org/node/99900001', fetchedAt=now)
        goal = dict(id='fixture-goal-v1', title='Utsiktspunkter · Voss', description='Ett testpunkt i Voss. Testdata kun i emulatoren.', targets=[target], createdAt=now)
        def setting(key, value):
            db.execute('INSERT OR REPLACE INTO settings VALUES (?, ?)', (key, json.dumps(value)))
        setting('homeArea', dict(name='Voss', latitude=60.63, longitude=6.42, radius=3000))
        streets=[]
        for id, name, a, b in [('north','Testgate nord',0,60),('south','Testgate sør',60,120)]:
            geometry=[dict(latitude=points[i]['latitude'],longitude=points[i]['longitude']) for i in [a,b]]
            streets.append(dict(id='street/fixture/'+id,name=name,kind='street',**geometry[0],geometry=geometry,streetPaths=[geometry],streetEnds=geometry,sourceUrl='',fetchedAt=now))
        geometry=[dict(latitude=points[i]['latitude'],longitude=points[i]['longitude']) for i in [0,20]]
        anonymous=[dict(id='way/99900101',name='Sti uten navn',kind='trail',**geometry[0],geometry=geometry,sourceUrl='',fetchedAt=now),
                   dict(id='way/99900102',name='Trapp',kind='steps',**geometry[0],geometry=geometry,streetPaths=[geometry],streetEnds=geometry,sourceUrl='',fetchedAt=now)]
        setting('osmDiscoveries', [target]+streets+anonymous)
        setting('goalCatalog', [goal])
        setting('goals', [])
        # Prevent a fixture test from depending on live OSM. Real network checks are separate.
        cache = dict(points={}, regions={}, streets={'1': now})
        for raw, in db.execute('SELECT data FROM points'):
            p = json.loads(raw)
            key = f"{min(8999, int((p['latitude'] + 90) // .02))}:{min(8999, int((p['longitude'] + 180) // .04))}"
            cache['points'][key] = now
            cache['regions'][key] = dict(id=1, name='Fixture')
        setting('surveyCache', cache)
        db.commit(); db.execute('PRAGMA wal_checkpoint(TRUNCATE)'); db.close()
        adb('shell', 'rm', '-f', path+'-wal', path+'-shm')
        adb('push', str(folder/'trakk.db'), '/data/local/tmp/trakk-test.db')
        adb('shell', 'cat /data/local/tmp/trakk-test.db > '+path)
    launch()
    tap('Deg'); tap('Åpne mine mål')
    find('Målbibliotek')
    tap('Aktiver som mitt mål')
    # Activation can place the status just above the viewport; reset scroll before asserting.
    tap('Lukk'); tap('Åpne mine mål')
    find('MÅL OPPNÅDD')
    tap('Lukk')
    find('Nivå 2')
    with open('/tmp/trakk-avatar.png', 'wb') as output:
        subprocess.run(['adb', 'exec-out', 'screencap', '-p'], stdout=output, check=True, timeout=30)
    tap('Avatarfarge: Blå')
    find('Ditt hjemmeområde · valgfritt')
    find('Navn på hjemmeområdet')
    tap('Lagre hjemmeområde')
    find('Hjemmeområdet er lagret. Finn mål under Deg.')
    adb('shell', 'am', 'force-stop', PACKAGE)
    with tempfile.TemporaryDirectory() as temp:
        pull_database(Path(temp)); db=sqlite3.connect(Path(temp)/'trakk.db')
        def setting(key): return json.loads(db.execute('SELECT value FROM settings WHERE key=?', (key,)).fetchone()[0])
        assert setting('goals')[0]['id'] == 'fixture-goal-v1'
        assert setting('homeArea')['name'] == 'Voss'
        assert setting('avatarColor') == '#8595BD'
        assert 'node/99900001' in setting('osmAwards')
        db.close()
    launch()
    tap('Deg'); tap('Åpne mine mål')
    find('MÅL OPPNÅDD')
    tap('Deaktiver mål')
    tap('Lukk')
    find('Nivå 2')
    print('PASS: automatic retrospective awards outside Bergen, goals, home area and avatar persist; deactivation retains achievements', flush=True)
    tap('Turlogg')
    tap('Milepaeltest')
    find('Dette fikk du på turen')
    find('✓ Testgate nord'); find('✓ Testgate sør')
    find('Nye milepæler')
    with open('/tmp/trakk-rewards.png','wb') as output:
        subprocess.run(['adb','exec-out','screencap','-p'],stdout=output,check=True,timeout=30)
    tap('Lukk'); tap('Deg'); tap('Åpne samlingen min')
    find('Dine funn · 3'); find('✓ Testgate nord'); find('✓ Testgate sør')
    find('Stier og trapper uten navn · 2')
    tap('Åpne stier og trapper uten navn')
    tap('Gi et Tråkk-navn')
    tap('Tråkk-navn'); adb('shell','input','text','Naerstien'); adb('shell','input','keyevent','4')
    tap('Lagre Tråkk-navn')
    tap('Lukk'); tap('Åpne samlingen min')
    find('Dine funn · 4'); find('✓ Naerstien')
    with open('/tmp/trakk-names.png','wb') as output:
        subprocess.run(['adb','exec-out','screencap','-p'],stdout=output,check=True,timeout=30)
    tap('Vis Naerstien på kartet')
    find('Naerstien · markert i korall · Lukk ×')
    adb('shell','am','force-stop',PACKAGE)
    launch(); tap('Deg'); tap('Åpne samlingen min')
    find('Dine funn · 4'); find('✓ Naerstien')
    tap('Lukk'); tap('Turlogg'); tap('Milepaeltest')
    find('Nye funn · 4'); find('✓ Naerstien')
    print('PASS: unnamed paths/stairs group separately; naming promotes one find, persists and opens its map',flush=True)
    print('PASS: per-trip named street awards and milestones; collection under Deg defaults to earned finds',flush=True)
    tap('Slett tur'); tap('Slett tur')
    tap('Deg')
    find('Nivå 1')
    print('PASS: deleting evidence recalculates avatar level and achievements', flush=True)
finally:
    Path('/tmp/trakk-crash.log').write_text(adb('logcat', '-b', 'crash', '-d', check=False))
    Path('/tmp/trakk-js.log').write_text(adb('logcat', '-d', '-s', 'ReactNativeJS:V', 'AndroidRuntime:E', check=False))
