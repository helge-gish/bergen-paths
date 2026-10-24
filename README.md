# Herebound 0.3.0 – figurverksted og enklere spillstart

[Last ned APK](https://github.com/helge-gish/bergen-paths/raw/refs/heads/herebound-apk-0.3.0/herebound-0.3.0.apk). Installer som **Oppdater**, uten å avinstallere. Samme app-ID og testsignatur; figur, sekk, mynt og fremgang beholdes.

## Prøv hjemme først

1. **Start prøve / Fortsett prøve**: ett trykk på et funn flytter den simulerte figuren dit og åpner møtet direkte. Du skal bli i møtet når du plukker, handler eller snakker. Avslutt med «Tilbake til verdenen» når du selv vil videre.
2. **Figur & sekk → Tilpass figuren**: velg kvinne/mann, hudtone, hår og hårfarge. Figuren er synlig mens du redigerer. Lagre utseendet. Forstørr figuren ved å trykke på den.
3. **Utstyr**: finn tursekken ved Meyermarken, kjøp en stav hos Maren eller vinn Vokterglød ved lykten. Ta dem på; figurvisningen gjenspeiler utstyret. Utstyret er fortsatt i samme inventar og veier bare én gang.
4. **Skins**: forhåndsvis antrekk. Skogvokter gis automatisk på nivå 2. Stormvandrer kan kjøpes på nivå 2 for 8 Herebound-mynt. Lyktbærer vinnes ved å tenne den første lykten. Kjøp skjer med lokale spillmynter, ikke ekte penger.
5. **Spilloversikt → Startsted og AR-kamera → Test kamera · AR**: test kamera og plassering av en prøvegjenstand hjemme, uten å starte et feltspill. Denne kameraprøven gir ingen belønninger. Bruk godt lys og et underlag med synlige detaljer.

## Ny startflyt etter testen av 0.2.0

Den rapporterte utetesten ble blokkert før spillet og AR kunne prøves. Startsonen ved Meyermarken er nå 80 meter og vises på kartet. GPS-usikkerheten trekkes ikke lenger fra den oppgitte soneradiusen. Usikker eller gammel GPS og posisjoner utenfor sonen avvises fortsatt. Startknappen henter en ny måling ved behov, og skjermen viser konkret avstand, målingens alder og årsaken når start ikke er mulig.

GPS oppdateres også når du står stille med appen åpen. «Oppdater GPS» beholder startskjermen. Kamera kan testes før fysisk start. Simulatorens ekstra flytt/undersøk-steg er fjernet; det rapporterte tilbakespranget på telefon er ikke reprodusert direkte her, men hele forløpet er nå testet med den enklere flyten.

Ved Meyermarken: **Finn spill nær meg → Se startsted → Start ute**. Gå inn i den markerte sonen. Etter start finner du **Kart / Kamera · AR** i verdenen. Nær et funn kreves fersk GPS og et åpnet AR-møte for å samhandle.

## Figur, XP og nivå

- En ny illustrert figurvisning med lagdelt klær/utstyr, farger, rolig hvileanimasjon og større visning. Dette er første 2D-avatarutgave, ikke en ferdig roterbar 3D-avatar eller førstepersonshender.
- XP følger figuren mellom spill. Nivå 2 ved 30 XP, nivå 3 ved 90 XP, nivå 4 ved 180 XP. Senere nivåer krever mer; første tak er nivå 50.
- Nye steder gir 10 XP; fullførte møtehandlinger gir pakkens belønning. Samme oppdagelse/handling gir XP én gang også på tvers av simulator og felt. Kjøp, påkledning og appåpning gir ikke XP.
- Eldre XP beholdes og gir riktig nivå. Allerede opptjente nivåskins og lyktbelønningen blir tilgjengelige uten at eventyret må gjøres på nytt.
- Skins er varige kosmetiske eiendeler, separat fra fysisk utstyr og bæreevne. Ingen forfall av egenskaper eller betaling med ekte penger i denne utgaven.

## Spillstyrt startportal

ULTIMA X velger en stor runeportal med ravglød og rolig pulsering. Spillpakken angir motiv, farge og navn; verten viser portalen både på startskjermen og det virkelige kartet. Den foreløpige kontrakten tilbyr runeportal, leir og signalstein. Bevegelse respekterer telefonens innstilling for redusert animasjon.

## Kontroll

299 automatiske tester består. TypeScript og Android-bygg kontrolleres, og APK-signatur sammenlignes med forrige versjon. Nettleserprøven omfatter utseende, lagring, skin-kjøp, alle utstyrsplasser, hele den korte simulatorhistorien og en avvist feltstart som beholder startskjermen. Native GPS, AR og portalens plassering på Android må prøves på telefon.

Kildekode: `herebound-0.3.0`. APK, kildearkiv og kontrollsummer: `herebound-apk-0.3.0`.
