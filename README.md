# Herebound 0.2.0 – første feltprøve ved Meyermarken

[Last ned APK](https://github.com/helge-gish/bergen-paths/raw/refs/heads/herebound-apk-0.2.0/herebound-0.2.0.apk). Installer som **Oppdater**, uten å avinstallere Herebound. Android arm64; samme app-ID og testsignatur som 0.1.1. Tråkk er en separat app.

## Prøv ute

1. Gå til Meyermarken. Velg **Finn spill nær meg**, åpne ULTIMA X og bruk kartet til startsonen. Velg **Start ute** når GPS bekrefter at du er innenfor sonen. Hjemmeprøven er fortsatt separat.
2. Gå omkring. Spillkartet avdekkes omtrent 40 meter rundt deg. Kjente funn blir stående på kartet også når du går videre eller lukker appen. Rognebær vises før du er nær nok til å plukke dem. **Turkart** viser vanlig orienteringskart uten å gi oppdagelser.
3. Gå nær et funn og velg **Kamera · AR**. Tillat kamera; installer/oppdater Google Play-tjenester for AR hvis du blir bedt om det. Pek rolig mot bakken, trykk **Plasser foran meg**, og trykk på figuren eller **Undersøk funnet** når den er plassert.
4. Utforsk i fri rekkefølge: møt Maren, finn rognebær, snakk med Rusk og undersøk den slukne lykten. Rognebær og hvitløk kan tenne lykten og avdekke et spor etter Iver. Handlinger gjøres gjennom et åpnet AR-møte; kartet brukes til å finne frem og lese om kjente steder.
5. Prøv fullskjerm/minimer, kart/kamera og å lukke/åpne appen. Sekk, mynt, journal og avdekket kart skal bevares.

Sett av 10–20 minutter. Start helst i dagslys: ARCore trenger synlig underlag og detaljer. Møtene er samlet innen omtrent 60 meter fra teststart. Koordinatene er ennå ikke fysisk befart; første tur skal også kontrollere tilgjengelighet og plassering.

## Hva som er nytt

- Fysisk feltmodus med fersk GPS, start- og møtesoner. Simulatorposisjon kan ikke brukes til feltinteraksjoner.
- MapLibre-kart, varig utforsking, egen posisjon, fullskjerm og sentreringsknapp.
- Isolert Herebound ARCore-modul med lokale bakkeankere og enkle animerte 3D-figurer: handelsmann, Rusk, rognebær og lykt. Lokal plassering velges av spilleren; ankrene er ikke geografisk persistente eller delte mellom telefoner.
- En liten sammenhengende fortelling med plukking, handel, ingredienskostnad, lyktmagi og varig belønning. Ingen kamp i denne utgaven.
- Felles **Herebound-mynt** i sekken. ULTIMA X kaller den gull med kurs 1:1. Eldre gullsaldo migreres uten verdiendring; andre spill kan angi en fast visningskurs. Handel bruker alltid den samme saldoen.
- Feltjournal og hjemmeprøvens journal er adskilt. Figuren, sekken og reisefølget er fortsatt felles lokal testdata, ikke en verifisert flerspillerøkonomi.

## Kontroll og begrensninger

288 automatiske tester består, TypeScript er kontrollert og Android-utgaven er bygget. Oppdateringssignatur, versjon og pakket innhold kontrolleres før publisering. Kameraets faktiske plassering, grafikk, GPS-soner og livssyklus må fortsatt prøves på Pixel 6a ute. Figurenes grafikk er en første teknisk utgave. Nett trengs for kartfliser. GPS og kamera kjører i forgrunnen; dette er ikke bakgrunnssporing som i Tråkk.

Kildekode: tag `herebound-0.2.0`. APK, kildearkiv og SHA256SUMS ligger på grenen `herebound-apk-0.2.0`.
