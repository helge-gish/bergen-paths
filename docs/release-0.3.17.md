# Tråkk 0.3.17 — gater i nærområdet og Tråkkvennen

Android testutgave, versionCode 22. Installer som oppdatering uten å avinstallere.

## Gater som hovedmåling

Et fremtredende kort viser «X av Y gater fullført», prosent og antall delvis gåtte gater. Kortet står i Utforsk før turstart og øverst under Deg. Trykk åpner delvis gåtte, resterende og fullførte gater; en gate kan vises på kartet.

Utvalget består av navngitte gater fra nedlastede kartdata som berører den valgte radiusen. Sammenhengende deler med samme navn grupperes før telling. Stier, trapper og punktmål telles ikke som gater her. En gate kuttes ikke ved radiusgrensen for å gjøre den lettere å fullføre.

Fullført bygger på eksisterende GPS-bevis og gateregler: minst 95 % av hver kartlagt gatetrase og besøk ved endene på én lagret tur. Alle delene i en gruppert gate må være bekreftet. Delvis gått gir ikke full uttelling. Pågående tur teller etter avslutning/lagring. Slettede turer fører til ny beregning; tellingen lager ingen ekstra XP eller permanente kopier av prestasjoner.

Telleren viser tydelig at den gjelder kartlagte gater, ikke nødvendigvis alle faktiske gater. Uten posisjon eller lokale gater vises ingen misvisende nullprosent. Ved pågående sjekk eller feil markeres status; en uferdig sjekk presenteres ikke som ferdig prosent. Sist kjente posisjon merkes. Radius og posisjon kan endre både teller og nevner.

## En egen turkamerat

Fantasygrafikken er erstattet av en ny illustrert Tråkkvenn i regnjakke og tursko. Eksisterende mann/dame-valg, XP og prestasjoner beholdes. Rolig bevegelse stopper ved redusert bevegelse eller når appen går i bakgrunnen. Figuren har et lyst, enkelt miljø og titler som Nabolagsvandrer, Stifinner og Turvenn.

Utstyrssamlingen viser tursko, caps, ryggsekk, turstav og gullmerke med tydelige nivåkrav. Elementene har stabile ID-er og plasser for videre utvikling. De kan ennå ikke tas på figuren. Den nye illustrasjonen er generert for appen og leveres lokalt i APK-en; det gamle fantasybildet er fjernet.

[Retning for figurbygger og sosial spillmodus i v2](companion-v2.md). Sosiale funksjoner er ikke aktivert, og ingen stedssynlighet eller konto er lagt til i denne utgaven.

## Kontroll

TypeScript og 198 app-/komponenttester består. Nye tester dekker avgrensing til gater, gruppering, kryssing av radius, tomt område, ufullstendig sjekk, delvis/fullført GPS-bevis, sletting, pågående tur, filter og visning på kartet samt bevaring av figurvalg og evidensbaserte utstyrsgrenser.

Et syntetisk kontrollutvalg med 10 000 gater og 300 000 koordinater tok omtrent 28 ms å gruppere og 34 ms per nærområdeberegning i byggmiljøet etter optimalisering. Entydige gatenavn går utenom unødvendig gruppering av kryss, og geometriens yttergrenser mellomlagres for å avvise fjerne gater før nøyaktig avstandssjekk. Dette er ikke en måling på telefon.

Rent Android-appbygg og seks native tester består. APK-en er kontrollert for versjon, samme signatur som 0.3.16, Hermes, nye UI-tekster og at kamerarettingen fortsatt finnes i DEX-koden. Det nye bildets synlige piksler og gjennomsiktighet samsvarer med kildebildet; det gamle fantasybildet er ikke med. AAPT endrer usynlige RGB-verdier under helt gjennomsiktige piksler, så bildekontrollen sammenligner synlig innhold og alfa. Fysisk telefon er ikke tilgjengelig i byggmiljøet.

APK: 44220860 byte. SHA-256: `e3045d26341733fea64ef9a608a48e26d073a6df60110311a9db48a26a62ed1f`.
