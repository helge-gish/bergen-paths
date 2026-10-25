# Herebound 0.3.4 – Finn spill, Mine spill og Profil

Installer som **Oppdater** over 0.3.3. Figur, sekk og tidligere feltspill beholdes.

## Én tydelig spillflyt

- **Finn spill** viser spill innen 5 km med ekte GPS. Se startstedet og trykk «Start spill». Et allerede startet spill viser «Fortsett».
- **Mine spill** viser én oppføring per spilltype med «Fortsett» og «Avbryt spill». Appen åpner her når du har startet spill fra før. Gjentatt start/fortsett bruker samme lagring; ingen parallelle Ultima X-runder.
- **Profil** samler Herebound-figur, sekk, utstyr, skins og progresjon.
- Prøvespill, simulatorknapper og separat kamerademo er fjernet fra appflyten. Eldre simulatorlagringer bevares i eksporten og figuren, men opptrer ikke som ekstra spill.
- Det åpne spillet viser sin tittel tydelig. **Spor og notater** ligger inne i spillet og viser bare dette eventyrets spor. Journal er ikke lenger en hovedfane.
- Å bytte fane eller gå tilbake til Mine spill bevarer fremgangen. GPS-observasjon av eventyret og AR stoppes når spillvisningen forlates.
- «Avbryt spill» krever bekreftelse. Bare det valgte feltspillets historie, kartutforsking og butikkstatus nullstilles. Herebound-figur, sekk, utstyr, valuta, XP og skins beholdes. Neste start krever spillets startsted igjen. Tidligere opptjent oppdagelses-XP deles ikke ut på nytt. Mislykket lagring lar spillet stå urørt.

## Kart og funn

- Fontenebærene er flyttet 60 meter rett sørover fra 0.3.3, til 60.40364, 5.32665.
- Rusk (60.40357, 5.32703) og den gamle lykten (60.40364, 5.32730) er flyttet til samme sørlige del av marken og spredt. Maren, sekken og de opprinnelige bærene står ved den nordlige starten. Alle punktene er innenfor startsonen på 80 meter.
- Ultima viser alltid eventyrkartet; «Turkart»-bryteren er fjernet. Før start vises veien til portalen; under spillet gjelder utforskingsmasken.
- Pilspissen og teksten «Pilen viser mobilretning» er fjernet. En myk, uttonet synsvifte viser retningen. Små kompassutslag opptil tre grader ignoreres, større endringer glattes langs korteste rotasjon. Kartrotasjon og gamle sensorverdier håndteres fortsatt.

## Kontroll og feltprøve

TypeScript og 353 automatiske tester bestod. De dekker blant annet start/fortsett uten duplikater, fanebytte, avbryt/bekreft/behold, feil ved lagring, ny start ved riktig sted, bevart figur og spillspesifikke notater. Synsviften er inspisert i fire retninger.

Neste feltprøve: fortsett Ultima X fra Mine spill, gå mot fonteneområdet og se etter Fontenebær/Rusk/lykten sør for portalen. Funn vises når området utforskes. Kompassro og plasseringer må bekreftes ute; koordinatene er justert etter brukerens feltbilde og ønske om omtrent 60 meter sørover.

Android-bygget og fem native AR-tester bestod. APK-innholdet er kontrollert for den nye navigasjonen og synsviften, samt fravær av de gamle prøveknappene og turkartbryteren. Signaturen samsvarer med 0.3.3.

Android: `no.herebound.app`, 0.3.4/kode 8, arm64.
APK: 48474730 byte. SHA-256: `66ba9941065ba304528b2ebc7c36b0a5ee0c03b7e70fd6a4c2926307584f8181`
