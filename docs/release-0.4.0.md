# Tråkk 0.4.0 — naturstier og automatisk registrering, alfa

VersionCode 34. Samme app-id, database og signeringsnøkkel som 0.3.28. Installer som oppdatering. Tidligere turer og egne strekk beholdes. Dette er en større endring i arbeidsflyt og må feltprøves før den erstatter en stabil treningsrutine.

## Bruk

1. Første gang: velg «Tillat automatisk registrering» og gi Android nødvendige posisjonstillatelser. Bakgrunnsposisjon trengs for låst skjerm. Dette er et engangsoppsett, ikke en turstart før hver tur.
2. Etterpå: åpne Tråkk og gå. Registrering fortsetter med låst skjerm. Varsel og tydelig status viser at den er på. Pause stopper registrering og lagrer perioden. En bevisst pause består ved gjenåpning til du trykker «Fortsett».
3. Stier og egne strekk måles automatisk fra ende til ende, separat for hver retning. GPS-tider er omtrentlige, med samme små innvendige start-/sluttporter som tidligere. Kartdata består av OSM-deler, ikke ferdig sammensatte turruter.
4. Lag eget strekk med «Sett start her» og «Lagre strekk hit». Startmerket vises på kartet. Tidligere strekk finnes under Deg.
5. Kart, fullskjerm, avstand, Min posisjon og kamera/AR er beholdt. Treningsmodus er tilgjengelig direkte under registreringsstatusen. Velg 4×4 når du vil, også midt i en gåtur. Når programmet er ferdig, går du videre i fritt tempo. Du kan velge en ny økt uten å avslutte GPS-registreringen. Avatar, spillutstyr, gate-/trappesamling og konkurransevalg er ute av Tråkks nye hovedflyt.

Hver treningsøkt får egen ID for tale og vibrasjon. Dermed blir ikke en ny økt stille fordi beskjeder allerede ble spilt under den forrige. Tidligere økter arkiveres i registreringen og følger med i historikk og eksport. «Fritt tempo» avslutter bare treningsprogrammet. Å åpne modusvelgeren opphever aldri en bevisst GPS-pause; knappen for 4×4 sier uttrykkelig fra når registreringen må fortsette.

## Kart og målinger

- Egen naturstikilde. Harde underlag, vanlige asfaltforbindelser, fortau, trapper og gater fremheves ikke som naturstier. Stier trenger underlag, turgradering eller naturkontekst. Gruslagte gangstier trenger kartlagt skog/lyng-/krattkontekst.
- Klassifiseringen er konservativ. Manglende OSM-underlag, manglende skogpolygoner eller skog representert bare som komplekse multipolygoner kan føre til at en ekte sti ikke vises. Ukjent kartdata gir ikke en garanti om natursti. Heller ikke klassifiseringen beviser fremkommelighet.
- Målinger viser registrert distanse, aktuell fart og GPS-høydemeter. Bevegelsestid er et konservativt estimat fra gode, sammenhengende punkter. Adkomst til stier inngår i total distanse; personlige stiprestasjoner gjelder gjenkjente stideler/strekk.
- Måleforsøk brytes ved dårlig GPS, hull og målt fart over 6 m/s. Dette er kvalitetssiling, ikke sikker gjenkjenning av om brukeren går eller kjører.
- Retning og geometri inngår i målereferansen. Resultater og milepæler beregnes automatisk fra de lagrede sporene når appen er åpen. Endring/sletting av datagrunnlaget kan endre beregnede resultater; historiske OSM-versjoner er ikke arkivert i denne alfaen.
- Beregninger gjenbruker uendrede spor/referanser og gir fra seg JS-tråden mellom arbeidspakker. Én enkelt svært lang referanse/registrering kan fortsatt kreve tid; langvarig bruk trenger videre felttest.

## Registrering og data

Førsteutgaven er ikke en heldagsaktivitetsmåler. Den krever at appen åpnes, og registreringen går til den pauses. Som ekstra grense avsluttes automatiske registreringer over åtte timer ved neste GPS-leveranse. Dette er ikke en OS-planlagt nøyaktig åttetimerstopp. Ny appåpning kan starte igjen hvis brukeren ikke har valgt pause.

GPS-/bakgrunnsfeil vises med gjenoppretting. Gamle manuelle turer vises som tidligere turer; nye registreringer krever ikke navngiving. Automatiske perioder under 10 meter uten treningsøkt skjules fra listen, men rådata beholdes i databasen/eksport. Ingen eksisterende spor lastes opp til Gatekampen eller rollespillet. Lang stillstand, batteriforbruk, OS-bakgrunnsbegrensninger og restart etter en tvungen appstopp må prøves på fysisk telefon.

## De andre produktene

- Gatekampen: eget filter for bare gater, poengregler og Supabase-databaseskisse for kontoer, vennegrupper og sesonger. Nettinnlogging, API-er og publisert spillapp gjenstår. SQL-skjemaet er ikke integrasjonstestet mot en kjørende database.
- Utendørs spillarena: [Lyktene under Fløyen](product/floeyen-story.md), [systemplan](product/roleplaying-system.md), separate innholdspakker, maks 5 km spillradius med manifestvalidering, lokal spillkatalog og testmodeller for atomisk handel, erfaring, delt/personlig progresjon og full figurportabilitet. Ingen live-server, faktisk kampmotor eller feltgodkjente oppdragspunkter er publisert.

## Kontroll

244 tester for app, komponenter og spillmodeller, TypeScript-kontroll, Android-bygg og 14 native enhetstester består. Nye tester dekker oppstart/pause-race, vedvarende pause, naturstifilter, begge måleretninger, GPS-/fartshull, gateregler, handelsatomisitet, turbasert kamp, figurportabilitet og områdeoppdagelse. APK-ens versjon, signatur, logo, innebygde JS og native AR-moduler er kontrollert. Ingen fysisk Pixel 6a eller Android-emulator er tilkoblet.

APK: 43539298 byte. SHA-256: `223e9a3e84e8bcf76ae0dafd8d0d5f894ffd8ce87618b5fa9bebcc84bc3b18f7`.
