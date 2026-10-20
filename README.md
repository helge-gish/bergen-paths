# Tråkk 0.3.15 · testutgave

[Last ned APK](https://github.com/helge-gish/bergen-paths/raw/refs/heads/trakk-apk-0.3.15/trakk-0.3.15.apk) · [Kildekodearkiv](https://github.com/helge-gish/bergen-paths/raw/refs/heads/trakk-apk-0.3.15/trakk-0.3.15-source.zip)

Installer som **Oppdater**, uten å avinstallere først. ARM64 Android, versionCode 20, samme testsignatur som 0.3.14.

- **Kamera · AR:** fullskjerm og tydelig minimering. Valgt sti beholdes. Retting av kameraflaten, maskinvareakselerasjon og CameraX TextureView. Oppstartsfeil vises utenfor kameraflaten, med mulighet for nytt forsøk.
- **Kart:** stier vises alltid; den overflødige «Stier»-bryteren og enslige «Turkart»-knappen er fjernet.
- **Aktivt startmerke:** fast badge viser hvor merket er og når det ble satt. Turstart er standard. Trykk for kart; nytt startmerke erstatter det gamle etter bekreftelse. Lagring av strekk flytter merket til sluttpunktet. Angre gjenoppretter forrige merke.

181 JavaScript-/komponenttester, TypeScript og seks native tester består. Kamerarettingen er verifisert i den ferdige APK-ens DEX-kode, og signaturen samsvarer med forrige utgave.

**Kamerabildet må fortsatt bekreftes på Pixel 6a.** Det finnes ingen fysisk telefon i byggmiljøet. AR viser retning til stier, ikke en presis linje på bakken. Kartet bruker turkart med stier; satellitt er fortsatt ikke aktivert.

[Kildekode og detaljer](https://github.com/helge-gish/bergen-paths/blob/trakk-0.3.15/docs/release-0.3.15.md).

Kildecommit: `b1f1117`.
