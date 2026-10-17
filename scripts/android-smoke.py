#!/usr/bin/env python3
"""Exercise a release APK on a connected emulator, without external services."""
import re
import os
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path

PACKAGE = 'no.trakk.app'

def adb(*args, check=True):
    return subprocess.run(['adb', *args], text=True, stdout=subprocess.PIPE,
                          stderr=subprocess.STDOUT, timeout=45, check=check).stdout

def screen():
    adb('shell', 'uiautomator', 'dump', '/sdcard/trakk-ui.xml', check=False)
    raw = adb('shell', 'cat', '/sdcard/trakk-ui.xml')
    Path('/tmp/trakk-ui.xml').write_text(raw)
    return ET.fromstring(raw)

def find(label, contains=False):
    for _ in range(10):
        for node in screen().iter('node'):
            values = (node.get('text', '').casefold(), node.get('content-desc', '').casefold())
            matches = any(label.casefold() in value for value in values) if contains else label.casefold() in values
            if matches:
                x1, y1, x2, y2 = map(int, re.findall(r'\d+', node.get('bounds')))
                if x2 > x1 and y2 > y1:
                    return (x1+x2)//2, (y1+y2)//2
        width, height = map(int, re.findall(r'(\d+)x(\d+)', adb('shell', 'wm', 'size'))[-1])
        adb('shell', 'input', 'swipe', str(width//2), str(height*3//4), str(width//2), str(height//3), '300')
        time.sleep(2)
    raise RuntimeError('Visible content not found: ' + label)

def tap(label):
    x, y = find(label)
    adb('shell', 'input', 'tap', str(x), str(y))

def alive():
    if not adb('shell', 'pidof', PACKAGE, check=False).strip():
        raise RuntimeError('Tråkk process exited')

def launch():
    adb('shell', 'am', 'start', '-n', PACKAGE + '/.MainActivity')
    time.sleep(8)
    alive()

try:
    adb('install', '-r', 'android/app/build/outputs/apk/release/app-release.apk')
    first_run = os.environ.get('TRAKK_SMOKE_FIRST_RUN') == '1'
    permissions = ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'POST_NOTIFICATIONS']
    if not first_run:
        permissions.append('ACCESS_BACKGROUND_LOCATION')
    for permission in permissions:
        adb('shell', 'pm', 'grant', PACKAGE, 'android.permission.' + permission)
    adb('logcat', '-c')
    adb('emu', 'geo', 'fix', '5.347', '60.393')
    launch()
    tap('Start en tur')
    tap('Start turen min')
    if first_run:
        time.sleep(3)
        adb('shell', 'pm', 'grant', PACKAGE, 'android.permission.ACCESS_BACKGROUND_LOCATION')
        adb('shell', 'input', 'keyevent', '4')
        time.sleep(3)
    for i in range(8):
        adb('emu', 'geo', 'fix', '5.347', str(60.393 + i * .00005))
        time.sleep(3)
        alive()
    find('Avslutt og lagre tur')
    services = adb('shell', 'dumpsys', 'activity', 'services', PACKAGE)
    assert 'isForeground=true' in services, 'Location foreground service is missing'
    adb('shell', 'input', 'keyevent', '223')
    time.sleep(15)
    alive()
    adb('shell', 'input', 'keyevent', '224')
    adb('shell', 'input', 'keyevent', '82')
    adb('shell', 'am', 'force-stop', PACKAGE)
    launch()
    find('Avslutt og lagre tur')
    tap('Avslutt og lagre tur')
    tap('Avslutt og lagre')
    alive()
    print('PASS: start, GPS updates, relaunch active trip, finish')
finally:
    Path('/tmp/trakk-crash.log').write_text(adb('logcat', '-b', 'crash', '-d', check=False))
    Path('/tmp/trakk-js.log').write_text(adb('logcat', '-d', '-s', 'ReactNativeJS:V', 'AndroidRuntime:E', check=False))
