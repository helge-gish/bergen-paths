#!/usr/bin/env python3
"""Exercise a release APK on a connected emulator, without external services."""
import re
import os
import base64
import tempfile
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path

PACKAGE = 'no.trakk.app'

def adb(*args, check=True):
    return subprocess.run(['adb', *args], text=True, stdout=subprocess.PIPE,
                          stderr=subprocess.STDOUT, timeout=45, check=check).stdout

def screen():
    raw = adb('shell', 'am', 'instrument', '-w', 'no.trakk.hierarchy/no.trakk.hierarchy.Dump')
    match = re.search(r'INSTRUMENTATION_RESULT: hierarchy=([A-Za-z0-9+/=]+)', raw)
    if not match:
        adb('shell', 'rm', '-f', '/sdcard/trakk-ui.xml')
        adb('shell', 'uiautomator', 'dump', '/sdcard/trakk-ui.xml', check=False)
        xml = adb('shell', 'cat', '/sdcard/trakk-ui.xml')
    else:
        xml = base64.b64decode(match[1]).decode()
    Path('/tmp/trakk-ui.xml').write_text(xml)
    return ET.fromstring(xml)

def install_hierarchy_helper():
    # UiAutomator's dump command waits for one second of UI idleness. The live
    # trip clock prevents that; capture accessibility nodes without the idle wait.
    sdk = Path(os.environ['ANDROID_HOME'])
    java = Path(os.environ['JAVA_HOME']) / 'bin'
    tools = sdk / 'build-tools/36.0.0'
    source = Path(__file__).parent / 'android-hierarchy'
    with tempfile.TemporaryDirectory(prefix='trakk-hierarchy-') as tmp:
        out = Path(tmp)
        (out / 'classes').mkdir()
        (out / 'dex').mkdir()
        def run(args):
            subprocess.run([str(a) for a in args], check=True, timeout=60)
        run([java / 'javac', '-source', '8', '-target', '8', '-cp', sdk / 'platforms/android-36/android.jar', '-d', out / 'classes', source / 'Dump.java'])
        run([tools / 'd8', '--lib', sdk / 'platforms/android-36/android.jar', '--min-api', '24', '--output', out / 'dex', out / 'classes/no/trakk/hierarchy/Dump.class'])
        apk = out / 'hierarchy.apk'
        run([tools / 'aapt', 'package', '-f', '-M', source / 'AndroidManifest.xml', '-I', sdk / 'platforms/android-36/android.jar', '-F', apk])
        from zipfile import ZipFile
        with ZipFile(apk, 'a') as archive:
            archive.write(out / 'dex/classes.dex', 'classes.dex')
        run([java / 'keytool', '-genkeypair', '-keystore', out / 'smoke.jks', '-storepass', 'android', '-keypass', 'android', '-alias', 'smoke', '-dname', 'CN=TrakkTest', '-keyalg', 'RSA', '-keysize', '2048', '-validity', '1', '-noprompt'])
        run([tools / 'apksigner', 'sign', '--ks', out / 'smoke.jks', '--ks-pass', 'pass:android', apk])
        adb('install', '-r', str(apk))

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
    install_hierarchy_helper()
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
    print('PASS: start, GPS updates, relaunch active trip, finish', flush=True)
    if os.environ.get('TRAKK_SMOKE_STREETS') == '1':
        time.sleep(2)
        tap('Lukk')
        tap('Turpass')
        tap('Hent / oppdater Bergens gater')
        deadline = time.time() + 100
        while time.time() < deadline:
            xml = screen()
            text = ET.tostring(xml, encoding='unicode')
            if 'Gatekartet er klart' in text:
                print('PASS: real Bergen street download: ' + text, flush=True)
                break
            if 'Det gikk ikke helt' in text:
                raise RuntimeError('Street download failed: ' + text)
            time.sleep(3)
        else:
            raise RuntimeError('Timed out waiting for Bergen street download')
        tap('OK')
        tap('Gater')
        x, y = find('Vis på kartet →')
        adb('shell', 'input', 'tap', str(x), str(y))
        time.sleep(5)
        alive()
        find('markert i korall', contains=True)
        print('PASS: street collection list and selected street map', flush=True)

finally:
    Path('/tmp/trakk-crash.log').write_text(adb('logcat', '-b', 'crash', '-d', check=False))
    Path('/tmp/trakk-js.log').write_text(adb('logcat', '-d', '-s', 'ReactNativeJS:V', 'AndroidRuntime:E', check=False))
