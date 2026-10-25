# Herebound 0.3.4 – funn sør på Meyermarken

Installer som **Oppdater** over 0.3.3. Figur, sekk og tidligere funn beholdes.

- Fontenebærene er flyttet 60 meter rett sørover fra plasseringen i 0.3.3, til 60.40364, 5.32665. Feltbildet viste at forrige anslag lå ved lekeplassen.
- Rusk (60.40357, 5.32703) og den gamle lykten (60.40364, 5.32730) er flyttet sørover og spredt på samme del av marken. Maren, sekken og de opprinnelige bærene blir ved den nordlige starten. Alle punktene ligger fortsatt i startsonen på 80 meter.
- Ingen nullstilling eller nye belønninger for allerede fullførte funn. Samme møte-ID-er, kvitteringer og pakkeversjon.
- «Turkart»-valget er fjernet. Ultima viser alltid sitt eventyrkart. Før spillstart er veien til portalen synlig; under spillet gjelder utforskingsmasken.
- Pilspissen og teksten «Pilen viser mobilretning» er fjernet. En myk, uttonet synsvifte viser telefonens retning. Små kompassutslag på opptil tre grader ignoreres; større endringer glattes langs korteste rotasjon. Rotert kart og gamle sensorverdier håndteres fortsatt.

## Kontroll

TypeScript og 48 berørte automatiske tester bestod, inkludert feltstart, AR-møter, kart/kompass, pakkevalidering og lagret progresjon. Synsviften er inspisert visuelt i fire retninger. Android-bygget og fem native AR-tester bestod. APK-en er kontrollert for den nye synsviften og fravær av turkartbryter/forklaringstekst. Signaturen samsvarer med 0.3.3.

Neste feltprøve: gå til fonteneområdet, åpne eventyrkartet og se etter Fontenebær/Rusk/lykten sør for portalen. Funnene dukker opp når området utforskes. Kompassro og de nye plasseringene må bekreftes ute; koordinatene er justert ut fra brukerens feltbilde og ønske om omtrent 60 meter sørover.

Android: `no.herebound.app`, 0.3.4/kode 8, arm64.
APK: 48477858 byte. SHA-256: `75564e539e713155ff57a35225663cf413918a65493784edde63646b4457a398`
