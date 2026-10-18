#!/usr/bin/env python3
"""Final-APK check of the real seven-peak goal after the summit-coordinate correction.
The unchanged recording/ghost/avatar flows are covered by android-goals-smoke.py.
"""
import os
import runpy
import subprocess
import time
from pathlib import Path
os.environ['TRAKK_SMOKE_HELPERS_ONLY'] = '1'
context = runpy.run_path(str(Path(__file__).with_name('android-smoke.py')))
os.environ.pop('TRAKK_SMOKE_HELPERS_ONLY')
adb, tap, find, alive, launch = (context[n] for n in ['adb', 'tap', 'find', 'alive', 'launch'])
PACKAGE = context['PACKAGE']
try:
    context['install_hierarchy_helper']()
    adb('install', '-r', 'android/app/build/outputs/apk/release/app-release.apk')
    adb('logcat', '-c')
    launch()
    tap('Deg'); tap('Åpne mine mål')
    tap('Hent målet: De syv byfjellene i Bergen')
    deadline = time.time() + 250
    while time.time() < deadline:
        time.sleep(5)
        xml = context['screen']()
        if any(n.get('text') == 'Det gikk ikke helt' for n in xml.iter('node')):
            raise RuntimeError('Real curated goal fetch failed: '+Path('/tmp/trakk-ui.xml').read_text())
        tap('Lukk'); tap('Åpne mine mål')
        try:
            x,y = find('Aktiver som mitt mål')
            adb('shell', 'input', 'tap', str(x), str(y))
            break
        except RuntimeError:
            alive()
    else:
        raise RuntimeError('Timed out loading the real seven-peak goal')
    tap('Lukk'); tap('Åpne mine mål')
    find('DITT MÅL')
    find('0 / 7')
    print('PASS: final APK loads all seven real OSM summits and activates the curated goal', flush=True)
    adb('shell', 'am', 'force-stop', PACKAGE)
    launch()
    tap('Deg'); tap('Åpne mine mål')
    find('DITT MÅL'); find('0 / 7')
    with open('/tmp/trakk-avatar.png', 'wb') as output:
        subprocess.run(['adb','exec-out','screencap','-p'], stdout=output, check=True, timeout=30)
    print('PASS: real goal definition and activation survive relaunch', flush=True)
finally:
    Path('/tmp/trakk-crash.log').write_text(adb('logcat','-b','crash','-d',check=False))
    Path('/tmp/trakk-js.log').write_text(adb('logcat','-d','-s','ReactNativeJS:V','AndroidRuntime:E',check=False))
