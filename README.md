# Tråkk 0.3.16 · testutgave

[Last ned APK](https://github.com/helge-gish/bergen-paths/raw/refs/heads/trakk-apk-0.3.16/trakk-0.3.16.apk) · [Kildekodearkiv](https://github.com/helge-gish/bergen-paths/raw/refs/heads/trakk-apk-0.3.16/trakk-0.3.16-source.zip)

Installer som **Oppdater**, uten å avinstallere. ARM64 Android, versionCode 21, samme testsignatur som 0.3.15.

- **Tydeligere kart:** blått turspor med hvit kant, lilla tidligere turer og ulike linjetyper for sti/småsti, gangvei og trapp. Ekstra samlingsprikker og fargelag over vanlige gater er fjernet. Turkart og merkede fotruter beholdes.
- **Trykkbar stiinfo:** navn, kartlagt lengde og registrert vanskelighetsgrad. Manglende gradering og høyde vises som ikke registrert. Valg og kartutsnitt følger med ved fullskjerm/minimering. Tegnforklaring kan åpnes ved kartet.
- **Mine mål:** egen søkestatus, lagrede kartdata brukes først, tidsgrense på 30 sekunder og «Avbryt søket». Bakgrunnssynkronisering viser ikke lenger feilaktig «Henter mål». Aktive mål står først, og Bergen-knappen skjules når målet allerede finnes.

TypeScript, 191 app-/komponenttester og seks native tester består. APK-signatur, versjon, nye tekster, Hermes og fortsatt inkludert kameraretting er kontrollert.

Trykkbar info gjelder fremhevede stier med egne kartdata. Stier som bare finnes i bakgrunnsbildet er ikke trykkbare. Lengden gjelder den markerte stidelen, ikke nødvendigvis en hel tur. Kartgjengivelse og treffområde må fortsatt prøves på fysisk telefon.

[Detaljer og kontroll](https://github.com/helge-gish/bergen-paths/blob/trakk-0.3.16/docs/release-0.3.16.md).

Kildecommit: `1ebf621`.
