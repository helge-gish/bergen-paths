# Tråkk 0.3.14 · testutgave

[Last ned APK](https://github.com/helge-gish/bergen-paths/raw/refs/heads/trakk-apk-0.3.14/trakk-0.3.14.apk) · [Kildekodearkiv](https://github.com/helge-gish/bergen-paths/raw/refs/heads/trakk-apk-0.3.14/trakk-0.3.14-source.zip)

Installer som **Oppdater**, uten å avinstallere først. ARM64 Android, versionCode 19, samme testsignatur som 0.3.13.

- **Deg → Turkameraten din:** mann/dame, fantasyillustrasjoner, animert lyktelys og ildfluer, nivåprogresjon og prestasjoner. Valget lagres lokalt.
- **Utforsk → Finn sti → Kamera · AR:** navn, retning, luftlinjeavstand og kartlagt lengde over kamerabildet. Velg en sti for mer informasjon og turstart.
- Stidetaljer viser høydemeter fra brukbare GPS-målinger og SAC-gradering der den er registrert. Manglende data vises som ukjent; kartlagte deler er ikke nødvendigvis en komplett tur.
- Fullskjerm/minimering av kart, turkart og merkede fotruter, tydeligere stier og GPS-spor.

171 JavaScript-tester, TypeScript og 6 native tester består. Ferdig APK er kontrollert for signatur, Hermes, kameramodul, avatarbilder og fravær av mikrofontillatelse.

AR er en første retningsvisning, ikke en presis strek på bakken. Kamera, kompass og nye kartlag må prøves på fysisk telefon. Kartverkets fliser kunne ikke nettprøves i byggmiljøet. **Satellitt er ikke aktivert:** MapTiler-støtte er klar, men krever en konto/nøkkel. Denne utgaven bruker turkart.

[Kildekode og detaljer](https://github.com/helge-gish/bergen-paths/blob/trakk-0.3.14/docs/release-0.3.14.md). Kildecommit: `6504e9c`.
