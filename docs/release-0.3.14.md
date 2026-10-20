# Tråkk 0.3.14 — Finn sti, kamera-AR og turkamerat

Android testutgave, versionCode 19. Installer som oppdatering for å beholde turene.

## I appen

- Utforsk → Finn sti → Kart / Kamera · AR. Velg en sti og gå videre til turstart. Egne strekk kan også gås med skygge.
- Kameraet viser stinavn, luftlinjeavstand og kartlagt lengde. Trykk på navnet for detaljer: lengde, tilgjengelige høydemeter og registrert SAC-gradering.
- Retningsvisningen bruker bakkameraets retning fra Androids rotasjonssensor, korrigert for magnetisk misvisning. GPS og kompass må være ferske og nøyaktige. Ved usikkerhet skjules stietikettene. Dette er retnings-AR, ikke en terrengregistrert strek på bakken.
- Alle kart kan utvides og minimeres. Kartutsnittet følger med. Turkart fra Kartverket og et eget lag med merkede fotruter er standard. Stiene og eget spor har tydeligere konturer og posisjonsmarkøren er mindre.
- Deg → Turkameraten din: illustrert mann/dame, lagret valg, diskret lyktelys og ildfluer, nivåmerke, XP-fremdrift, neste rang og prestasjoner. Eksisterende XP og turer brukes videre. Animasjon stopper i bakgrunnen og respekterer redusert bevegelse. Kunst er lokal i APK-en, ingen bilder lastes ned underveis.

## Datakvalitet

Kartlagte stideler er ikke nødvendigvis en komplett, sammenhengende tur. Lengden summerer tilgjengelige linjer uten å telle identiske kanter flere ganger. GPS-hull i egne strekk forbindes ikke. Høyde er et GPS-estimat og vises bare når minst 90 % av de rensede punktene har brukbar høydemåling. Ukjent høyde blir ikke 0 m.

SAC-graden fra OpenStreetMap beholdes som T1–T6; ingen automatisk oversettelse til norske fargegrader. Høyeste registrerte grad vises, med «delvis gradert» når noen deler mangler grad. Gamle kartdata må hentes på nytt for å få nye graderingsfelt. Ingen gradering gjettes fra stiens lengde eller beliggenhet.

Kameraet brukes bare til forhåndsvisning. Appen tar ikke bilder eller lydopptak. Kameratilgang etterspørres først ved bruk av AR.

## Satellitt

MapTiler er valgt som leverandør. Hybridkart støttes med byggetidsvariabelen `EXPO_PUBLIC_MAPTILER_KEY`. Ingen nøkkel er konfigurert i denne APK-en, så satellittvalget er skjult og turkart brukes. Nøkkelen er en offentlig klientnøkkel og vil være synlig i APK-en; bruk egnet kvote og restriksjoner. Konto/eierskap må etableres før aktivering. Ingen betalt konto er opprettet.

## Kilder

- [Kartverkets flisetjeneste](https://cache.kartverket.no/).
- [Kartverkets offisielle Norgeskart-konfigurasjon](https://github.com/kartverket/nk3config/blob/master/config/norgeskart.json), fotrutelaget `Fotrute` i `wms.friluftsruter2`.
- [UTs kartforklaring](https://hjelp.ut.no/hc/no/articles/360002784419-Hva-betyr-de-ulike-symbolene-og-tegnene-i-kartet).
- [OpenStreetMap SAC-gradering](https://wiki.openstreetmap.org/wiki/Key:sac_scale).
- [MapTiler attribusjon](https://docs.maptiler.com/guides/map-design/attribution/add-attribution/).
- Stolpejaktens synlige kartvalg og kobling mellom liste og kart inspirerte den korte velg-sti-flyten. Ingen spillmekanikk eller data er kopiert.

## Kontroll

TypeScript-kontroll og 171 JavaScript-tester består. Nye regresjonstester dekker AR-retning over nord, gammel/unøyaktig/ugyldig GPS, kamera mot bakken, GPS-hull, delvis SAC-gradering, manglende høyde og satellitt uten nøkkel.

Android-bygget og alle seks native tester består (fire eksisterende regresjoner og to nye kameraretningskontroller). Ingen fysisk telefon er koblet til byggmiljøet. AR og nye kartlag må derfor feltprøves. Kartverkets rasterverter er blokkert av byggmiljøets nettpolicy; kildekonfigurasjonen er kontrollert, men faktisk flislasting er ikke verifisert her.

## Ferdig APK

- Størrelse: 52,273,576 byte.
- SHA-256: `6f58fab016f929d1a222529a44f1a03a7358e45d8844618a87fc6eb83ab20c24`.
- Hermes-pakke, kameramodul og begge avatarbilder er kontrollert i APK-en. Mikrofontillatelse er fjernet.
- Signaturen er den samme testnøkkelen som i 0.3.13, slik at appen kan oppdateres på stedet.
- Testet syntetisk Finn sti-datasett med 250 000 punkter: 626 ms første oppsett, 57 ms første nærhetssøk og 39 ms varmt søk i byggmiljøet. Dette er ikke en måling på telefon.
