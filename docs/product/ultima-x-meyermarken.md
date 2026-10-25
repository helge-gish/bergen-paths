# ULTIMA X: spillprøven fra Meyermarken

Siste produktpresisering 24. oktober 2026. Formålet er å finne ut hvor bra ULTIMA X kan bli før det investeres mer i Herebound. SDK-et holdes uavhengig, men utvides gjennom behovene i dette spillet. Et generelt SDK, MCP eller flere spilltyper er ikke et forkantkrav.

Første implementasjon er 0.2.0: kartavdekking, fire AR-møter, rognebær, handel, Rusk og lyktmagi. [Teststeg og begrensninger](../release-herebound-0.2.0.md). Fysisk feltprøve gjenstår; alternativ løsning og kamp er videre arbeid.

## Mål

En liten, sammenhengende utendørs prøve som er lett tilgjengelig fra Meyermarken: cirka 10–20 minutter, noen få steder innen kort gangavstand og ett lite mysterium. Spillområdet har fortsatt 5 km radius rundt Fløyvarden. Den korte prøven skal gi grunnlag for å vurdere glede ved utforsking, stemning, AR-interaksjon og lyst til å fortsette. Et fullstendig 45–60 minutters kapittel følger først etter denne vurderingen.

## Kartet er en spillmekanikk

- Spillkartet starter mørkt. Egen posisjon og startpunktet kan vises fra begynnelsen.
- Fysisk gange avdekker en begrenset del av verdenen rundt spilleren, med omtrent 30–50 m som første utprøvingsområde for radius. Endelig verdi bestemmes i feltprøven.
- Avdekkede områder beholdes mellom turer og appomstarter. Gjenbesøk nullstiller ikke kartet.
- Ukjente NPC-er og funn vises ikke som en komplett liste med navn og koordinater. De oppdages ved utforsking. Dialog kan gi et omtrentelig rykte før et eksakt funnsted er kjent.
- Kartbevegelse, zoom, appåpning og upresis/gammel GPS skal ikke avdekke hele områder eller telle som besøk. Simulatorens avdekking må holdes adskilt fra feltutforsking.
- AR og kart bygger på samme oppdagelsesstatus. Å bytte visning avslører ikke innhold som fortsatt er ukjent.
- Et ordinært turkart kan åpnes separat for å orientere seg. Det gir ingen spilloppdagelser. Mørket er i spillets utforskingskart, ikke et krav om å miste tilgang til orientering.

## En liten fortelling med fri utforsking

Arbeidstittel: «Den første slukne lykten».

1. Start ved Meyermarken. Den lokale delen av spillkartet avdekkes, og et første spor antyder at vokteren Iver er borte.
2. Utforsk noen få befarte steder i fri rekkefølge. Møt Maren, Rusk eller finn lykten først. Ikke gjør dette til en obligatorisk postløype.
3. Se og samhandle med minst én figur eller gjenstand lokalt festet i AR. Samtale, undersøkelse og handel bruker den allerede eksisterende figuren og sekken.
4. Finn/kjøp virtuelle råvarer, lær én enkel formel eller finn en alternativ løsning. Første magi trenger bare én gjennomført effekt: å tenne den slukne lykten.
5. Lykten gir en liten avsløring om Iver, en varig oppdagelse og et hint om et større område som fortsatt ligger i mørke.

Eksakte oppskrifter, grafikk og møteplasser utformes for denne korte delen. Ikke krev fullt kampsystem, avatarbygger eller stor verdenssimulering før dette fungerer. Kamp kan legges til etter at utforsking og AR gir en tydelig spillopplevelse.

## Rekkefølge i gjennomføringen

1. Fysisk sesjon og fersk posisjon; varig og modusadskilt utforskingsstatus.
2. Reelt kart med mørke, avdekking ved gange, valg av sted og tilgjengelig turkart.
3. Ett stedlig AR-objekt med stabil lokal plassering og en faktisk lagret handling.
4. Koble den lille fortellingen sammen: frie møter, funn, handel, én magisk effekt og avslutning.
5. Feltprøve på Pixel 6a, med forbedringer ut fra det brukeren faktisk opplever.

Det er disse behovene som former de neste SDK-funksjonene. Herebound beholder eierskap til posisjon, kamera, rendering, figur, sekk, hjelpere og transaksjoner. ULTIMA X leverer innhold, geografi og reglene for mysteriet.

## Feltjustering 25. oktober 2026

I Herebound 0.3.1 ligger alle fem møter/funn innen 15 meter fra teststarten midt på Meyermarken (60.40418, 5.32703). Testens kiste, rognebær, Maren, Rusk og lykt er samlet her for å gjøre AR-prøven enkel. Spillets radius er fortsatt 5 km rundt Fløyvarden. Møte-ID-er og innholdsversjon beholdes slik at oppgradering ikke avviser lagret fremgang. Det kompakte oppsettet må sjekkes ute; det er ikke den endelige utbredelsen av eventyret.

## Lokalt historiestoff — forslag under vurdering

Brukeren foreslo Bjelke eller Meyer som utgangspunkt for forsvinningen. Dette er undersøkt 25. oktober 2026; historien i spillpakken er foreløpig ikke skrevet om.

- [Løytnant Bjelkes gate](https://www.bergenbyarkiv.no/bergenbyleksikon/arkiv/1422171) er oppkalt etter sjøoffiseren Johan Christian August Bielke (1781–1846). Han ledet kanonbåter mot den britiske fregatten Tartar ved Alvøen 16. mai 1808. [Tartargaten](https://www.bergenbyarkiv.no/bergenbyleksikon/arkiv/1424849) viser til samme hendelse.
- [Meyermarken](https://www.bergenbyarkiv.no/bergenbyleksikon/arkiv/1424843) var Otto Meyers eiendom på Ladegårdens grunn. [Ladegården](https://www.bergenbyarkiv.no/bergenbyleksikon/arkiv/1425033) var i familien Meyers eie fra 1832 til 1908; hovedhuset lå ved dagens Rotthaugsgaten 1–7. Ikke bland denne personen med andre bergenske kjøpmenn som het Meyer.
- [Meyerminen](https://www.bergenbyarkiv.no/bergenbyleksikon/arkiv/date/2001/01/page/53) var et steinbrudd på Rotthaugen eid av Otto Meyer. En tunnel eller underverden under Fløyen er ikke dokumentert av denne kilden.

Anbefalt fiksjonsretning: «Meyers hemmelighet». I en fantasiversjon av området er Meyer forsvunnet etter et funn i steinbruddet. Spilleren kan følge regnskaper, handle med vitner eller undersøke magiske spor i fri rekkefølge. En oppdiktet journal knyttet til Bjelke kan åpne et sidespor. Magi, forsvinning, journal og sammenhengen mellom personene er spillfiksjon, ikke historiske påstander. Unngå å flytte første test bort fra Meyermarken; bruk virtuelle møter der, selv om bakgrunnshistorien omfatter større områder.

### 0.3.3: ekstra funn ved inngangen/fontenen

Et nytt, separat bærfunn (`fountain-rowan`) gjør det mulig å teste uten å gå til
lekebingen eller nullstille tidligere funn. Foreløpig kartpunkt: 60.40418,
5.32665, omtrent 21 meter vest for teststarten, med 35 meters møteradius.
Plasseringen er et anslag for fonteneområdet brukeren markerte på satellittbildet,
ikke et verifisert fontenekoordinat. Bekreft eller juster i neste feltprøve.
Startsonen på 80 meter dekker også dette punktet. Eksisterende møte-ID-er og
pakkeversjon beholdes.

### 0.3.4: feltkorrigering sør for lekeplassen

Brukerens feltbilde avklarte at 0.3.3-fontenepunktet lå for langt nord.
Fontenebær flyttes 60 m rett sørover til 60.40364, 5.32665. Rusk flyttes til
60.40357, 5.32703 og lykten til 60.40364, 5.32730. Alle ligger innenfor den
uendrede startsonen på 80 m. Nordlige funn beholdes; samme ID-er og pakkeversjon
hindrer at tidligere samlede ting blir nye belønninger. Dette erstatter
koordinatanslaget i 0.3.3-avsnittet over.
