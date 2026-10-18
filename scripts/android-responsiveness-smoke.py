#!/usr/bin/env python3
"""Compare old release and candidate with a large persisted home-area collection."""
import os, runpy, time, re, json, math, sqlite3, tempfile, subprocess
from pathlib import Path
os.environ['TRAKK_SMOKE_HELPERS_ONLY'] = '1'
globals().update(runpy.run_path(str(Path(__file__).with_name('android-smoke.py'))))


def node_bounds(label=None, resource=None):
    for node in screen().iter('node'):
        if (label and label in (node.get('text'), node.get('content-desc'))) or (resource and node.get('resource-id', '').endswith(resource)):
            return tuple(map(int, re.findall(r'\d+', node.get('bounds'))))
    return None


def assert_page(label, timeout=12):
    started=time.monotonic()
    while time.monotonic()-started < timeout:
        if node_bounds(label): return time.monotonic()-started
        time.sleep(.3)
    raise AssertionError('UI did not respond: '+label)


def tab(label):
    x,y=find(label)
    adb('shell','input','tap',str(x),str(y))


def pan_check(required=True):
    title=node_bounds('Hvor går turen?')
    assert title, 'Explore title missing before gesture'
    bounds=node_bounds(resource='trail-map')
    # Old release did not expose a map testID. These coordinates are within its map.
    w,h=map(int,re.findall(r'(\d+)x(\d+)',adb('shell','wm','size'))[-1])
    x=w//2
    y1,y2=(bounds[1]+int((bounds[3]-bounds[1])*.7),bounds[1]+int((bounds[3]-bounds[1])*.3)) if bounds else (h*2//3,h//2)
    def screenshot(path):
        with open(path,'wb') as f: subprocess.run(['adb','exec-out','screencap','-p'],stdout=f,check=True,timeout=30)
    time.sleep(2)
    screenshot('/tmp/map-before.png')
    adb('shell','input','swipe',str(x),str(y1),str(x),str(y2),'600')
    time.sleep(2)
    after=node_bounds('Hvor går turen?')
    screenshot('/tmp/map-after.png')
    kept=after == title
    print(('PASS' if kept else 'REPRODUCED')+': vertical map swipe '+('keeps page fixed' if kept else 'moves the parent page'),flush=True)
    if required:
        assert kept, (title,after)
        from PIL import Image, ImageChops, ImageStat
        a=Image.open('/tmp/map-before.png').convert('RGB').crop(bounds)
        b=Image.open('/tmp/map-after.png').convert('RGB').crop(bounds)
        assert sum(ImageStat.Stat(ImageChops.difference(a,b)).mean)>2, 'Map content did not pan'
        # Releasing the map must not prevent page scrolling outside it or tab taps.
        adb('shell','input','swipe',str(w-4),str(y1),str(w-4),str(y2),'600')
        time.sleep(1)
        assert node_bounds('Hvor går turen?') != title, 'Page scroll outside map did not recover'


def seed_large_area():
    adb('shell','am','force-stop',PACKAGE)
    adb('root'); adb('wait-for-device')
    path='/data/data/'+PACKAGE+'/databases/trakk.db'
    with tempfile.TemporaryDirectory() as folder:
        file=Path(folder)/'trakk.db'
        for suffix in ['', '-wal', '-shm']:
            adb('pull',path+suffix,str(file)+suffix,check=False)
        db=sqlite3.connect(file)
        db.execute('DELETE FROM trails');db.execute('DELETE FROM points');db.execute('DELETE FROM trips')
        now=int(time.time()*1000);start=now-20000000
        pts=[dict(latitude=60.39+i*.000003,longitude=5.34+.0005*math.sin(i/150),timestamp=start+i*10000,accuracy=3,speed=1,altitude=50,altitudeAccuracy=2) for i in range(1800)]
        db.execute('INSERT INTO trips VALUES (?, ?, ?, ?, NULL, 0, 0)',('stress-trip','Stor samling testtur',start,pts[-1]['timestamp']))
        db.executemany('INSERT INTO points VALUES (?, ?, ?)', [('stress-trip',p['timestamp'],json.dumps(p)) for p in pts])
        items=[]
        for i in range(6000):
            lat=60.365+(i//100)*.0008;lon=5.30+(i%100)*.0008
            geometry=[dict(latitude=lat+j*.0001,longitude=lon+math.sin(j/4)*.00015) for j in range(20)]
            kind='street' if i%6==0 else 'trail'
            item=dict(id=f'stress/{i}',name=f'Test {i}',kind=kind,latitude=lat,longitude=lon,geometry=geometry,sourceUrl='',fetchedAt=now)
            if kind=='street': item.update(streetPaths=[geometry],streetEnds=[geometry[0],geometry[-1]])
            items.append(item)
        goals=[dict(id='stress-'+kind,title='Testmål '+kind,description='Syntetisk 5 km belastningstest',targets=[i for i in items if i['kind']==kind],createdAt=now) for kind in ['street','trail']]
        settings=dict(osmDiscoveries=items,osmAwards={},homeArea=dict(name='Bergen',latitude=60.39,longitude=5.34,radius=5000),goals=goals,goalCatalog=goals)
        cache=dict(points={},regions={},streets={'1':now})
        for p in pts:
            key=f"{min(8999, int((p['latitude']+90)//.02))}:{min(8999, int((p['longitude']+180)//.04))}"
            cache['points'][key]=now;cache['regions'][key]=dict(id=1,name='Fixture')
        settings['surveyCache']=cache
        for key,value in settings.items(): db.execute('INSERT OR REPLACE INTO settings VALUES (?, ?)',(key,json.dumps(value)))
        db.commit();db.execute('PRAGMA wal_checkpoint(TRUNCATE)');db.close()
        adb('shell','rm','-f',path+'-wal',path+'-shm')
        adb('push',str(file),'/data/local/tmp/stress.db');adb('shell','cat /data/local/tmp/stress.db > '+path)
    print('Seeded 6,000 discoveries, 120,000 geometry points, 1,800 GPS fixes and two large goals in 5 km home area',flush=True)


def navigation_check():
    # Tap by fixed bottom bar coordinates even while JS is busy, so the check
    # measures handling the user's input rather than waiting for JS to be idle.
    w,h=map(int,re.findall(r'(\d+)x(\d+)',adb('shell','wm','size'))[-1])
    for index,label in [(3,'Ditt eget tempo.'),(1,'Målbibliotek'),(2,'Stor samling testtur'),(0,'Hvor går turen?')]*2:
        started=time.monotonic()
        adb('shell','input','tap',str(int(w*(index+.5)/4)),str(h-42))
        elapsed=assert_page(label)
        print(f'PASS: tab {index} reacted in {time.monotonic()-started:.2f}s (includes adb/accessibility round trips)',flush=True)

try:
    install_hierarchy_helper()
    old=Path('/tmp/trakk-previous.apk')
    if old.exists():
        adb('install','-r',str(old)); launch()
        pan_check(required=False)
    else:
        adb('install','-r','android/app/build/outputs/apk/release/app-release.apk');launch()
    seed_large_area()
    if old.exists():
        try:
            launch();navigation_check()
        except Exception as e: print('BASELINE large-area responsiveness failure:',e,flush=True)
        adb('shell','am','force-stop',PACKAGE)
    # Upgrade the existing populated database; do not clear app data.
    adb('install','-r','android/app/build/outputs/apk/release/app-release.apk')
    adb('logcat','-c');launch();navigation_check()
    tab('Deg');tab('Utforsk');assert_page('Hvor går turen?');pan_check()
    tab('Deg');find('Ditt hjemmeområde · valgfritt');tap('5 km');tap('Lagre hjemmeområde')
    assert_page('Hjemmeområdet er lagret. Finn mål i Turpass.')
    navigation_check()
    adb('shell','am','force-stop',PACKAGE);launch();navigation_check()
    tab('Utforsk');tap('Start en tur');assert_page('Alt er en del av turen.');tap('Lukk');tab('Turlogg');assert_page('Stor samling testtur')
    print('PASS: populated update, 5 km save, map/page gestures, modal and repeated navigation survive relaunch',flush=True)
finally:
    Path('/tmp/trakk-crash.log').write_text(adb('logcat','-b','crash','-d',check=False))
    Path('/tmp/trakk-js.log').write_text(adb('logcat','-d','-s','ReactNativeJS:V','AndroidRuntime:E',check=False))
