# Tre produkter — arbeidsplan 24. oktober 2026

## Besluttet sammen med brukeren

Tråkk er naturstier i nærområdet, egne strekk og enkel trening. **Oppdatert beslutning 25. oktober: Start tur / Avslutt tur er eksplisitt.** Åpning av appen starter ikke registrering. Kart, Logg og Finn sti/strekk (AR) kan brukes uten aktiv tur; nye stibesøk, tider og fullføringer samles bare under en tur. På tur fortsetter registreringen med låst skjerm, og stier/strekk gjenkjennes automatisk. Start strekk / Stopp strekk lager egne strekk underveis. Trening kan startes, pauses, fortsettes eller avsluttes uavhengig mens turen fortsetter; flere økter beholdes. Avslutt tur avslutter også trening og ulagret strekkkladd. Personlige tider og prestasjoner beholdes. Skjermene skal ha minst mulig tekst. Logo, gamle turer og strekk beholdes; avatar, utstyr, gatesamling og konkurranser flyttes ut.

Gatekampen er et eget produkt for gater. Trapper er utenfor første utgave; brukeren åpnet 25. oktober for at de kanskje kan legges til senere. Først private vennegrupper med invitasjon; åpne konkurranser senere. Kontoer og varige, serverkontrollerte konkurranser må være med fra første spillbare nettutgave.

Den tredje appen er en utendørs spillarena som viser spill i nærheten, med maksimalt 5 km radius per spill. Den skal på sikt åpnes for andre utviklere. Første spilltype er rollespill med Ultima-gameplay. Bergen Ultima XXVII er arbeidstittel for det første lokale fjelleventyret inspirert av klassiske rollespill. Første område er Sandviksfjellet/Fløyen. Samarbeid, handel og felles hendelser er valgt retning. Én figur beholder alle krefter og alt utstyr på tvers av rollespillets eventyrpakker. Stedlige møter og AR skal støtte historien.

## Rekkefølge og leveranser

1. **Tråkk 0.4.4:** Start tur / Avslutt tur, naturstifilter, automatisk gjenkjenning under tur, målinger, egne strekk og Finn sti/strekk med AR. Automatisk gjenkjenning i begge retninger; skill retning i resultatene. Kartlagte OSM-deler må aldri kalles komplette navngitte turruter. GPS-hull og bilfart gir ingen rekord. Behold data og topp-logo. Test start/avslutning og kartklassifisering før APK.
2. **Gatekampen grunnlag:** egne produktregler, kontomodell, sesonger, medlemskap, gatesnapshot og serverberegnet poeng. Første vertikale leveranse er ekte innlogging, opprett/bli med i gruppe og synlig sesong. Backend må konfigureres før den kan feltprøves med flere brukere; ingen lokal jukseinnlogging som erstatning.
3. **Fjelleventyr-prototype:** ett lite gjennomspillbart kapittel med valg, inventar og lagret progresjon. Skill skrivebordssimulering fra stedsverifisering ute. Ingen belønning for tilfeldige GPS-punkter uten frisk posisjon og romslige, kontrollerte ankomstsoner. Eksisterende AR-motor gjenbrukes etter at spillflyten fungerer.
4. **Feltrunde:** Pixel 6a, låst skjerm, pause, lang stillstand, GPS-bortfall, begge retninger, faktisk natursti vs asfalt, oppgradering fra 0.3.28. Fiks målefeil før mer spillinnhold.

## Tråkk: måleregler og åpne valg

- Ingen registrering før eksplisitt Start tur. Android viser vedvarende registreringsvarsel. Førstegangsoppsett forklarer bakgrunnsposisjon og batteribruk.
- Råspor beholdes lokalt. Prestasjoner gjelder kvalifiserte naturstier og egne strekk; total bevegelse og stiprestasjoner presenteres separat.
- Start og slutt på et strekk gjenkjennes av GPS. Retning og geometri bestemmer sammenligningen. Usikker eller avbrutt gjennomgang gir ingen tid. 0.4.4 sammenføyer tilknyttede, uforgrenede deler med samme navn. Forgreninger forblir separate; dette er ikke verifiserte komplette turruter.
- Kartdata uten underlag eller tilstrekkelig stiklassifisering skal ikke late som de er verifiserte naturstier. Lokale rettelser og bedre naturkontekst er neste iterasjon.
- Automatisk registrering må ikke kjøre ubegrenset tung analyse på hele historikken hvert sekund. Bakgrunn mottar GPS og lagrer. Derivert analyse kjører med cache/budsjett.
- Automatisk avslutning etter lang stillstand og energisparing trenger egen feltrunde. 0.4.4 lagrer og avslutter etter 10 minutter med pålitelig stillstand, unntatt pågående trening. Ny tur krever Start tur. Den lover ikke aktivitetsgjenkjenning eller heldagsbatteri.

## Arkitektur og data

Behold Tråkks app-id/database/signering. Gamle funksjoner finnes i kildehistorikken og kan gjenbrukes, men spillappene skal få egne app-id-er og databaser. Del testet geometri, GPS-kvalitetsregler og kart/AR-teknikk; ikke del brukersesjon, samtykke eller opplastingsvalg implisitt mellom appene. Ingen gamle Tråkk-spor lastes opp til en spillkonto automatisk.

## Status

Tråkk 0.4-alfa implementert og under APK-kontroll. Gatekampens filter, poengmodell og databaseskisse opprettet; live-backend mangler. Rollespillplattformens historie og Ultima-gameplaygrunnlag er skrevet, og domeneprototyper er testet. Spillbar mobil løkke og live flerspiller gjenstår. Se utgivelsesnotatene for utførte kontroller. En planlagt funksjon er ikke en ferdig funksjon.

## Nye prioriteringer og ideer, 25. oktober 2026

Gatekampen er satt på pause etter brukerens ønske. Tråkk prioriterer nå automatisk start/fullføring av naturstier og egne strekk, talevarsler, personlig navn/stjerner, kronologisk besøkslogg og AR-veivisning til start. Herebound får en liten feltjustering: ULTIMA X-funnene samles på selve Meyermarken. Se nyere utgivelsesnotater for verifisert implementasjonsstatus.

**Isdalskvinnen** er notert på brukerens initiativ som et mulig framtidig, separat Herebound-spill. Foreløpig kun en idé, ikke startet utvikling. Mulig form: et stedbundet mysterium med kart, AR og utforsking av spor i Isdalen. Historiske fakta må kildebelegges, oppdiktede spor merkes som fiksjon, og fortellingen utformes med respekt for den virkelige kvinnen. Prioriteten nå er fortsatt Tråkk og den første ULTIMA X-prøven.

## Oppfølging etter 0.4.4

Brukeren mener fartstaket på 6 m/s (21,6 km/t) er for høyt. Senking er notert, men utsatt i denne runden. Dette taket filtrerer åpenbart for raske GPS-punkter; det er ikke pålitelig bil-/gangklassifisering. Treg kjøring kan fortsatt passere. Start tur / Avslutt tur er den viktigste brukergrensen nå.
