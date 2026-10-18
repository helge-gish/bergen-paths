# 4×4-trener · Android-beta

Velg **Fritt tempo** eller **4×4-trener** i den felles startdialogen. Valget er uavhengig av skygge, tidligere tur og lagret strekk. Startpunktkravet for skygger gjelder fortsatt. Alle kategorier, strekk, rekorder og mål registreres som før.

Programmet er 35 minutter: 5 min rolig oppvarming, 4 × 4 min rask gange med 3 min rolig mellom de raske dragene, og 5 min rolig nedtrapping. Brukeren velger intensiteten; appen måler ikke puls eller om tempoet faktisk var raskt. Rask gange har påminnelser etter 1, 2 og 3 minutter og 10 sekunder før skifte. Rolige faser har halvveis-, ett-minutt- og ti-sekundersbeskjed.

Pause fryser bare treningsklokken. Tid og GPS for turen fortsetter. Avslutt 4×4 går over til fritt tempo og beholder eventuell skygge. Etter 35 minutter fortsetter turregistreringen automatisk. Turoppsummeringen viser fullført/avsluttet program, antall ferdige raske drag og treningstid; en tidlig avsluttet økt får ikke fullføringsmerke. Tilstand lagres i SQLite og følger JSON-eksporten uten en databaseombygging.

## Tale og bakgrunn

Den lokale Android-modulen `trakk-coach` bruker en native klokke (elapsedRealtime), handler og en tidsbegrenset partial wakelock under løpende trening, sammen med GPS-tjenesten som allerede kjører i forgrunnen. Taletidspunktene er uavhengige av JS/GPS-oppdateringer. Pause, avslutning og fullføring slipper wakelocken. Etter prosessgjenoppretting kobler appen/GPS-oppgaven til igjen; en varig pekepinn hindrer at gamle beskjeder spilles på nytt. Androids tvangsstopp kan fortsatt stoppe hele appen. iOS har ikke denne betaen.

Skygge, strekkhendelser og 4×4 går gjennom samme native TTS-motor mens treneren kjører. En aktuell skyggebeskjed venter på en nærliggende treningsbeskjed og legges til etter treningsinstruksen. Nyere skyggeinformasjon erstatter eldre; gammel informasjon forkastes. Hendelser kan leses separat når det er ledig plass før neste instruks. Treningslyd og rute-/strekklyd kan slås av hver for seg. Stemmevalg følger installerte Android-stemmer; teksten er regionalt formulert, men dette er ikke en egen bergensk stemmemodell.

## Kontroller

- Domene- og SQLite-tester: fasegrenser, pause, fullføring, tidlig stopp, uavhengig rutemodus, omstart og sletting.
- `android-workout-smoke.py`: reell APK/startdialog, pause/gjenåpning/fortsett, gå videre fritt, turoppsummering og 4×4-valg fra lagret strekk.
- `android-coach-native-test.py`: laster native trenerkode fra den faktiske APK-en i en separat testprosess. En teststemme fanger de nøyaktige TTS-forespørslene uten nett. Kontrollerer kombinert skygge/temposkifte med låst skjerm, pause, lyd av/på, stopp, fullføring, vekkelås og varig talemarkør. Teststemmen og testinstrumenteringen inngår ikke i Tråkk-APK-en. Dette bekrefter meldingsflyten, ikke lydkvaliteten i brukerens øretelefoner.
