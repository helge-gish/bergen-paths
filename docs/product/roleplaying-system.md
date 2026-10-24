# Rollespillsystem — lokal verden, varig figur

24. oktober 2026. Brukerkrav: potions, spells og en figur som blir mektig gjennom flittighet i fjellet, gode handler og eventuelt kamper. Fløyen er første testområde; konseptet skal kunne brukes andre steder og med andre tema og spilleregler. Live flerspiller prioriterer samarbeid, handel og felles hendelser.

## Det spilleren skal merke

Etter flere turer kan du noe du ikke kunne før. Du kjenner en oppskrift som andre trenger. Du har råd til en god stav fordi du gjorde et godt bytte. Du kan holde et vern rundt laget mens en ny spiller tenner lykten. En gammel utfordring er lettere, men et nytt mysterium kan fortsatt overraske deg.

Makt er både ferdigheter, utstyr, oppskrifter, forbindelser og kunnskap. Den skal være nyttig i verden, ikke bare et høyt tall på profilsiden.

## Tre veier til styrke

- **Vandring og utforsking:** bekreftet tid og avstand til fots på egnede stier, nye steder og gjenbesøk. Gir grunnerfaring og lokal kjennskap. Ingen fartskonkurranse eller krav om å gå til risikable steder. Variasjon og innsats over tid belønnes uten at man mister alt ved å ta en uke fri.
- **Alkymi og handel:** lær oppskrifter, lag blandinger, fullfør bestillinger og bygg tillit hos handlende. Overskudd kan byttes med spillere. Spiller-til-spiller-overføringer gir ikke XP i seg selv; ellers kunne to kontoer sende samme ingrediens frem og tilbake for uendelig erfaring.
- **Møter og kamp:** taktiske løsninger, samarbeid og gjennomførte møter gir mestring og tilgang til evner. Ikke alle møter må løses med vold. Kamp er turbasert ved et egnet møtested, ikke jakt på andre mennesker gjennom terrenget.

Begynn med en enkel nivåkurve og få tydelige egenskaper: utholdenhet, magisk kraft og vern. Utvid til retninger som stivokter, urtekyndig og tegnleser når et helt kapittel fungerer. Unngå en stor klassemeny før spilleren har fått prøve verdenen.

## Fløyens første magi

| Navn | Type | Bruk | Begrensning |
| --- | --- | --- | --- |
| Tåkesyn | Drikk | Avdekker et skjult tegn eller et ekko ved et fortellingssted | Må vite hvilket spor man undersøker |
| Bygebrygg | Drikk | Gjenoppretter magisk kraft i et møte | Bruker tur/handling; kan ikke gi uendelig kraft |
| Lyngglød | Formel | Lys, gamle lykter, virkning mot noen tåkeskapninger | Krever magisk kraft og en virtuell ingrediens |
| Rognvern | Formel | Vern rundt deg eller en medspiller | Styrken avhenger av erfaring; varighet begrenset |
| Vestavind | Formel | Forstyrrer en fiende eller bryter en tåkeeffekt | Motstandere kan tåle den; ikke alltid beste valg |

Oppskriftene bruker fiktive spillformer av blåbær, bjørk, rogn, røsslyng, einer og gran. Virkelig plukking, spising eller blanding inngår ikke. Lokale ord og talemåter gir karakter, men dialogen skal være lesbar og figurene troverdige.

## Kamp med Ultima-følelse

Foreslått første møte: en tåkevette holder lykten slukket. Laget kan bryte forbannelsen gjennom et lært navn, eller samarbeide om en kort turbasert kamp. Spillere velger én handling per runde: angripe, beskytte, bruke en drikk, kaste en formel eller trekke seg unna. En ny spiller skal ha nyttige oppgaver sammen med en erfaren. Førsteversjonen har ingen PvP, tap av hele inventaret eller kamp som tvinger spilleren til å bli stående ute.

En første ren kampmodell er implementert og testet: et lite rutenett, turrekkefølge, nærkamp, vern, Bygebrygg, Rognvern, Vestavind og retrett. Den er foreløpig en simulatorregel uten mobilgrensesnitt eller live-server; balanse, flere fiender, terreng og sammenkobling med kontoens inventar gjenstår.

## Appen finner lokale spill

Appen er en utendørs spillarena; rollespill er første spilltype, og Fløyen er første spillpakke. Se outdoor-arena.md for siste avklaring. Med posisjonstilgang viser den tilgjengelige spill i nærheten. Spilleren velger et spill og går inn med sin varige figur og hele inventaret. Fløyen tilbyr første eventyr. Et katalogtreff sier at et spill finnes i området; det er ikke bevis for at spilleren har kommet frem til et konkret oppdragspunkt. Spill utenfor området kan forhåndsvises, men fysisk ankomst bekreftes separat.

## En felles motor, ulike eventyrpakker

Felles: konto, figuridentitet, inventar, transaksjonell handel, lag, hendelser, lagring, GPS-kvalitet og tilgjengelighet.

Lokalt innhold: steder, arter som inspirasjon, ingrediensnavn, figurer, dialogspråk, oppskrifter, spells, økonomi, fortelling, møter og AR-uttrykk.

Lokale spilleregler: om kamp er aktivert, hvilke nye krefter som kan læres, og hvilke utfordringer og belønninger området tilbyr. Dette konfigureres per regelversjon; det hardkodes ikke «Fløyen» i konto- eller handelsmotoren.

**Besluttet av brukeren:** Én varig figur. Alle krefter, spells, oppskrifter og alt utstyr følger med til nye områder og tema. Ingen områdebestemt nedgradering, skjult normalisering eller nullstilling. Eventyrpakkene tilfører innhold; de tar ikke fra figuren det som er oppnådd.

Kontoens figur, globale evne-id-er og inventar eies av den felles serveren. Lokale navn/uttrykk kan variere uten at gjenstandens identitet eller virkning forsvinner. Sterke figurer får egne krevende møter og kan hjelpe nye spillere; gamle utfordringer får faktisk bli lettere. Ikke skaler alle fiender automatisk til spillerens nivå. Gatekampen og Tråkk er fortsatt separate produkter; denne portabiliteten gjelder rollespillets eventyrpakker.

## Server og real-time

Serveren bekrefter bevegelseshendelser og tildeler erfaring idempotent. En klient kan ikke sende et nytt level, egen belønning eller vilkårlig beholdning. Samme bevegelsesbevis kan ikke gi erfaring på nytt med en annen opplastings-id. Bestillinger og kamputfall har egne unike hendelser. GPS kan forfalskes; før et åpent spill trengs både kontrollregler og håndtering av tvister.

All handel og alle møtetrekk valideres mot serverens lag-/møteversjon. Dobbeltrykk, nettbrudd og to samtidige svar skal ikke duplisere varer eller turer. Prototypens simulerte hendelser og gratis startingredienser holdes i et separat miljø og kan aldri flyttes inn i live-økonomien.

## Milepæler

1. Historie, samtaler, inventar, én blanding og én handel i simulator. Test både solo og to spillere.
2. Ekte konto, laginvitasjon og serverlagring. Integrasjonstest real-time og frakobling.
3. Ett kontrollert møtested på Fløyen med GPS-ankomst og alternativ uten kamera.
4. Tåkesyn, Lyngglød og én turbasert utfordring. Meningsfull nivåøkning fra bekreftet gåing.
5. To turer med en ny og en erfaren spiller. Juster tempo, økonomi, batteri og lesbarhet før mer innhold.
