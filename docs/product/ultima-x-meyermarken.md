# ULTIMA X: spillprøven fra Meyermarken

Siste produktpresisering 24. oktober 2026. Formålet er å finne ut hvor bra ULTIMA X kan bli før det investeres mer i Herebound. SDK-et holdes uavhengig, men utvides gjennom behovene i dette spillet. Et generelt SDK, MCP eller flere spilltyper er ikke et forkantkrav.

Dette er en plan for neste leveranse, ikke innhold som allerede finnes i 0.1.1.

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
