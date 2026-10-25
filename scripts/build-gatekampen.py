#!/usr/bin/env python3
"""Build a bundled arm64 Android test APK using the installed cloud SDK.

Uses the generated project's debug signing key, not a production signing identity.
Does not upload, publish, or install anything on a device.
"""
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.parse
import urllib.request

repo = Path(__file__).resolve().parents[1]
root = repo / 'apps/gatekampen'
subprocess.run(['node', str(repo / 'scripts/patch-map-gestures.cjs')], check=True)
subprocess.run(['node', str(repo / 'scripts/patch-camera-preview.cjs')], check=True)
env = os.environ.copy()
sdk = Path(env.get('ANDROID_HOME', '/workspace/.android-sdk'))
jdks = sorted(Path('/workspace/.java').glob('jdk-17*'))
java_home = env.get('JAVA_HOME') or (str(jdks[-1]) if jdks else None)
if not java_home:
    raise SystemExit('Java 17 is required. Set JAVA_HOME to an installed JDK 17.')
if not (sdk / 'platforms/android-36/android.jar').is_file():
    raise SystemExit('Install Android platform 36 in ANDROID_HOME before building.')
env.update(
    JAVA_HOME=java_home,
    ANDROID_HOME=str(sdk),
    ANDROID_USER_HOME=env.get('ANDROID_USER_HOME', '/workspace/.android-user'),
    GRADLE_USER_HOME=env.get('GRADLE_USER_HOME', '/workspace/.gradle'),
    XDG_CACHE_HOME=env.get('XDG_CACHE_HOME', '/workspace/.cache'),
    npm_config_cache=env.get('npm_config_cache', '/workspace/.npm-cache'),
    EXPO_NO_TELEMETRY='1', EXPO_OFFLINE='1', CI='1', NODE_ENV='production',
)
subprocess.run([str(repo / 'node_modules/.bin/expo'), 'prebuild', '--platform', 'android', '--no-install'], cwd=root, env=env, check=True)
wrapper = root / 'android/gradle/wrapper/gradle-wrapper.properties'
contents = wrapper.read_text()
if 'distributionSha256Sum=' not in contents:
    match = re.search(r'distributionUrl=https\\://services\.gradle\.org/distributions/(gradle-[\d.]+-bin\.zip)', contents)
    if not match:
        raise SystemExit('Verify the Gradle distribution checksum before using a custom wrapper URL.')
    with urllib.request.urlopen('https://services.gradle.org/distributions/' + match[1] + '.sha256', timeout=30) as response:
        checksum = response.read().decode().strip()
    if not re.fullmatch(r'[a-f0-9]{64}', checksum):
        raise SystemExit('Invalid Gradle SHA-256 response.')
    wrapper.write_text(contents + '\ndistributionSha256Sum=' + checksum + '\n')

architectures = env.get('GATEKAMPEN_ANDROID_ARCHITECTURES', 'arm64-v8a')
if not re.fullmatch(r'(arm64-v8a|x86_64)(,(arm64-v8a|x86_64))*', architectures):
    raise SystemExit('Unsupported Android architecture list.')
args = ['./gradlew', ':app:assembleRelease', '--no-daemon', '--max-workers=2', '-PreactNativeArchitectures=' + architectures]
if env.get('GATEKAMPEN_ANDROID_CLEAN') == '1':
    # Metro's copied drawables can outlive a removed JS asset in an incremental
    # build. Use a clean app build when replacing bundled artwork.
    args.insert(1, ':app:clean')
jvm = '-Xmx4g -XX:MaxMetaspaceSize=1g'
# The system Java trust store contains this environment's configured root CAs.
# Keep certificate validation enabled when using a separately installed JDK.
trust = Path('/etc/ssl/certs/java/cacerts')
if trust.is_file():
    jvm += ' -Djavax.net.ssl.trustStore=' + str(trust)
args.append('-Dorg.gradle.jvmargs=' + jvm)
proxy = urllib.parse.urlsplit(env.get('HTTPS_PROXY', env.get('https_proxy', '')))
if proxy.hostname:
    if proxy.username or proxy.password:
        raise SystemExit('Configure a supported Java proxy route; this script does not copy proxy credentials.')
    args.extend([
        '-Dhttps.proxyHost=' + proxy.hostname,
        '-Dhttps.proxyPort=' + str(proxy.port or 80),
        '-Dhttp.proxyHost=' + proxy.hostname,
        '-Dhttp.proxyPort=' + str(proxy.port or 80),
    ])
    # The wrapper downloads Gradle before Gradle parses the command-line -D
    # flags. Give that bootstrap JVM the same proxy and trusted CA route too.
    bootstrap = ' -Dhttps.proxyHost=' + proxy.hostname + ' -Dhttps.proxyPort=' + str(proxy.port or 80)
    bootstrap += ' -Dhttp.proxyHost=' + proxy.hostname + ' -Dhttp.proxyPort=' + str(proxy.port or 80)
    if trust.is_file():
        bootstrap += ' -Djavax.net.ssl.trustStore=' + str(trust)
    env['JAVA_TOOL_OPTIONS'] = env.get('JAVA_TOOL_OPTIONS', '') + bootstrap
result = subprocess.run(args, cwd=root / 'android', env=env)
if result.returncode:
    raise SystemExit(result.returncode)
apk = root / 'android/app/build/outputs/apk/release/app-release.apk'
if not apk.is_file():
    raise SystemExit('Build returned success without the expected APK.')
print('Gatekampen test APK:', apk)
