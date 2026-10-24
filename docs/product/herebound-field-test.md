# Neste leveranse: ULTIMA X ute, med kart og AR

Plan 24. oktober 2026, etter simulator 0.1.1. Brukerens prioritet er ekte utendørs gameplay med AR og turkart slik som i Tråkk. Denne planen beskriver kommende arbeid; feltsystemet er ikke implementert i 0.1.1.

## Første feltløype

Meyermarken er teststart. Spillområdets sentrum forblir Fløyvarden og radiusen 5 km. Første tekniske feltprøve tar cirka 10–15 minutter i nærheten av Meyermarken. Den erstatter ikke målet om et fritt, fullstendig 45–60 minutters eventyr; den bekrefter at stedlige møter faktisk fungerer før historien utvides.

1. Åpne Herebound: faktisk GPS finner ULTIMA X i katalogen. Spillkortet viser Meyermarken som startsted, avstand og kart.
2. Ankom startsonen: tydelig «Du er fremme» og startknapp. Ingen teleportering eller simuleringsposisjon i feltmodus.
3. Velg Kart eller AR. Kartet har reelle stier, egen posisjon, startsted, oppdagelser og rykter. Fullskjerm, minimer og sentrer på meg finnes i begge relevante visninger. Spillkartet begynner mørkt og avdekkes rundt faktisk gange. Vanlig turkart kan åpnes separat når spilleren ønsker orientering; det avslører ikke spillinnhold eller gir oppdagelser.
4. Finn ett møte i AR: på avstand gis omtrentlig retning/avstand; i møtesonen opprettes et lokalt ARCore-anker på oppdaget underlag. Første prøve kan be spilleren trykke for å plassere figuren/lykten på bakken. Dette er lokal plassering ved møtestedet, ikke et løfte om et geografisk centimeternøyaktig eller delt anker.
5. Trykk på figuren/gjenstanden: undersøk, snakk, handle eller rekrutter gjennom eksisterende SDK-handlinger. Samme sekk, gull, journal og reisefølge som i resten av Herebound.
6. Bytt kart/AR, legg mobilen bort, kom tilbake og fortsett. Ingen dupliserte belønninger eller tapt fremgang.

Begynn med ett helt fungerende AR-møte. Når det er prøvd på Pixel 6a ute, kobles Maren, Rusk og lykten sammen i fri rekkefølge. Møteplassene i simulatoren er forslag; plasser og gangforbindelser må kontrolleres før de brukes som fysiske navigasjonsmål.

## Teknisk arbeid i rekkefølge

### 1. Reell tilstedeværelse i SDK-et

Skille simulering fra fysisk tilstedeværelse i sesjonen. SDK-et validerer fersk GPS, startområde og møtenærhet ved handlingen, ikke bare når UI-knappen vises. GPS-bortfall eller utdaterte målinger bevarer tilstanden og gir en forståelig status. Å fortsette etter appgjenåpning må ikke gjenbruke gammel posisjon som bevis på ankomst. Simuleringen må være eksplisitt og kan ikke utstede feltbelønninger i det skjulte. Første figur er fortsatt en lokal testfigur, uten verifisert flerspillerøkonomi.

### 2. Kart som presentasjonstjeneste

Bruk Tråkks MapLibre-erfaring og relevante kartkontroller, med et separat Herebound-grensesnitt for spillobjekter. Ikke importer Tråkks trenings-, sporings-, stifilter- eller innsamlingsregler. Kartet viser valgt møtested, avstand, ankomststatus, egne oppdagelser og «tilbake til meg». Kart og AR bruker samme valg og SDK-tilstand.

### 3. Kamera og lokale AR-objekter

Tråkks Android-kode har ARCore, plane detection, lokalt anker og kamerahåndtering for en retningspil. Del ut et avgrenset, spillnøytralt AR-lag eller bruk en isolert Herebound-modul; ikke dra med hele TrakkCoach eller treningsfunksjonene. En egen renderer må vise spillfigur/gjenstand, animasjon og treff ved berøring. Livssyklus og eksklusivt kameraeierskap må tåle fullskjerm, kartbytte og bakgrunn.

GPS avgjør hvilket møte som finnes i nærheten. ARCore stabiliserer den lokale figuren i forhold til kameraet og underlaget. Kompass brukes for omtrentlige hint, ikke som et absolutt krav for alle interaksjoner. Tap av AR-sporing viser status og mulighet for ny plassering. Kameraet skal frigis når spilleren bruker kart eller appen går i bakgrunnen.

Ved mørke eller uegnet underlag kan lokal ankervising svikte. Kart og lesbart møtepanel holder prøven brukbar. Første vurdering av plassering/stabilitet bør gjøres i dagslys; en egen kveldsprøve undersøker hvordan feilhåndteringen fungerer. Geografisk persistente ankere og identisk plassering for flere spillere er senere arbeid.

### 4. Spillpakke og kontrakt

ULTIMA X leverer koordinater, aktør/gjenstand, grafikkreferanse, størrelse, tilgjengelige handlinger og historie. Herebound leverer visning, tilstedeværelse, input, lagring og transaksjoner. AR-visningen lager ikke en separat økonomi eller kopi av inventaret. Nye presentasjonsfelter versjoneres og valideres; de er kommende byggesteiner for MCP-forfatting.

### 5. Feltprøve før større gameplay

APK med ett AR-møte først, deretter tre møter. Verifiser fysisk start, normal ankomst, GPS-usikkerhet, nektede tillatelser, dårlig kompass, mørke, sporingstap, bakgrunn/gjenåpning og gjentatt kart/AR-bytte. UI- og domenetester er nødvendige, men fysisk telefonprøve er et eget ferdigkriterium.

## Godkjenningsmål for første AR-møte

- Brukeren kan finne fram til teststart på et ekte kart.
- Et spillobjekt står lokalt festet i underlaget og kan sees fra flere vinkler mens sporingen er god.
- Berøring åpner riktig møte, og minst én faktisk SDK-handling endrer lagret spilltilstand.
- Kamera-/kartbytte og appomstart beholder fremgang uten ekstra belønninger.
- GPS og AR-usikkerhet fremgår uten svart skjerm eller endeløse krav om kompasskalibrering.

Etter dette: forberedt magi, et taktisk kampmøte og alternativ løsning på lyktmysteriet, fortsatt gjennom det samme SDK-et. AR og kart blir en del av den spillbare løkken fra denne leveransen, ikke en dekorasjon som legges på etterpå.

Senere presisering samme dag: Den prioriterte leveransen er [en spillbar ULTIMA X-del fra Meyermarken](ultima-x-meyermarken.md). Ett AR-møte er en intern teknisk milepæl; det endelige prøvemålet er en liten opplevelse som faktisk kan vurderes som et spill.
