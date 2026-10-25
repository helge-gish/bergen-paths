# Tre produkter — arbeidsplan 24. oktober 2026

## Besluttet sammen med brukeren

Tråkk er naturstier i nærområdet og enkel trening. Appåpning aktiverer registrering, også med låst skjerm. Ingen turstart i normal bruk. Brukeren kan alltid pause; bevisst pause vedvarer ved gjenåpning. Personlige tider og prestasjoner beholdes. Treningsmoduser kan slås på når som helst; 4×4 er første program, tale/vibrasjon guider tempoet og vanlig registrering fortsetter etter programslutt. Flere økter i samme registrering må bevares. Avatar, utstyr, gatesamling og konkurranser flyttes ut. Eksisterende turer og strekk skal bevares.

Gatekampen er et eget produkt for gater. Trapper er utenfor første utgave; brukeren åpnet 25. oktober for at de kanskje kan legges til senere. Først private vennegrupper med invitasjon; åpne konkurranser senere. Kontoer og varige, serverkontrollerte konkurranser må være med fra første spillbare nettutgave.

Den tredje appen er en utendørs spillarena som viser spill i nærheten, med maksimalt 5 km radius per spill. Den skal på sikt åpnes for andre utviklere. Første spilltype er rollespill med Ultima-gameplay. Bergen Ultima XXVII er arbeidstittel for det første lokale fjelleventyret inspirert av klassiske rollespill. Første område er Sandviksfjellet/Fløyen. Samarbeid, handel og felles hendelser er valgt retning. Én figur beholder alle krefter og alt utstyr på tvers av rollespillets eventyrpakker. Stedlige møter og AR skal støtte historien.

## Rekkefølge og leveranser

1. **Tråkk 0.4 alfa:** ny rolig hovedflyt, eksplisitt engangsoppsett av automatisk registrering, vedvarende pause, naturstifilter, målinger og egne strekk uten turstart. Automatisk gjenkjenning i begge retninger; skill retning i resultatene. Kartlagte OSM-deler må aldri kalles komplette navngitte turruter. GPS-hull og bilfart gir ingen rekord. Behold data og topp-logo. Test oppstart/pauseløp og kartklassifisering før APK.
2. **Gatekampen grunnlag:** egne produktregler, kontomodell, sesonger, medlemskap, gatesnapshot og serverberegnet poeng. Første vertikale leveranse er ekte innlogging, opprett/bli med i gruppe og synlig sesong. Backend må konfigureres før den kan feltprøves med flere brukere; ingen lokal jukseinnlogging som erstatning.
3. **Fjelleventyr-prototype:** ett lite gjennomspillbart kapittel med valg, inventar og lagret progresjon. Skill skrivebordssimulering fra stedsverifisering ute. Ingen belønning for tilfeldige GPS-punkter uten frisk posisjon og romslige, kontrollerte ankomstsoner. Eksisterende AR-motor gjenbrukes etter at spillflyten fungerer.
4. **Feltrunde:** Pixel 6a, låst skjerm, pause, lang stillstand, GPS-bortfall, begge retninger, faktisk natursti vs asfalt, oppgradering fra 0.3.28. Fiks målefeil før mer spillinnhold.

## Tråkk: måleregler og åpne valg

- Ingen automatisk heldagsregistrering før appen har blitt åpnet. Android viser vedvarende registreringsvarsel. Førstegangsoppsett forklarer bakgrunnsposisjon og batteribruk.
- Råspor beholdes lokalt. Prestasjoner gjelder kvalifiserte naturstier og egne strekk; total bevegelse og stiprestasjoner presenteres separat.
- Start og slutt på et strekk gjenkjennes av GPS. Retning og geometri bestemmer sammenligningen. Usikker eller avbrutt gjennomgang gir ingen tid. Førsteutgaven bruker OSM-deler og personlige strekk; sammensatte, navngitte stiforløp er et eget senere arbeid.
- Kartdata uten underlag eller tilstrekkelig stiklassifisering skal ikke late som de er verifiserte naturstier. Lokale rettelser og bedre naturkontekst er neste iterasjon.
- Automatisk registrering må ikke kjøre ubegrenset tung analyse på hele historikken hvert sekund. Bakgrunn mottar GPS og lagrer. Derivert analyse kjører med cache/budsjett.
- Automatisk avslutning etter lang stillstand og energisparing trenger egen feltrunde. Første alfa har tydelig pause; den lover ikke aktivitetsgjenkjenning eller heldagsbatteri.

## Arkitektur og data

Behold Tråkks app-id/database/signering. Gamle funksjoner finnes i kildehistorikken og kan gjenbrukes, men spillappene skal få egne app-id-er og databaser. Del testet geometri, GPS-kvalitetsregler og kart/AR-teknikk; ikke del brukersesjon, samtykke eller opplastingsvalg implisitt mellom appene. Ingen gamle Tråkk-spor lastes opp til en spillkonto automatisk.

## Status

Tråkk 0.4-alfa implementert og under APK-kontroll. Gatekampens filter, poengmodell og databaseskisse opprettet; live-backend mangler. Rollespillplattformens historie og Ultima-gameplaygrunnlag er skrevet, og domeneprototyper er testet. Spillbar mobil løkke og live flerspiller gjenstår. Se utgivelsesnotatene for utførte kontroller. En planlagt funksjon er ikke en ferdig funksjon.
