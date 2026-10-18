# Strekk og skygge · 0.3.7

Egne lagrede rutebiter kalles **strekk**. Sti brukes fortsatt om fysiske stier i kartdata.

- Skyggeturen krever en GPS-posisjon yngre enn 15 sekunder, med nøyaktighet ≤20 m, innen 25 m fra referansens første gode punkt. Startskjermen viser begge posisjoner, luftlinjeavstand og en lenke til gangveivisning. Tidtaking starter ved brukerens trykk, etter en ny kontroll i GPS-tjenesten.
- Skyggens tidsforskjell bruker samme ordnede rutetilpasning som avviksdeteksjonen. Samme gate på utreise og hjemreise blir ikke lenger tolket som uavklarte alternative passeringer.
- Vedvarende avvik vises og leses opp dersom lyd er aktivert. Et senere gjeninntog tillater ikke sammenligning av totaltid. «Fortsett uten skygge» bevarer klokke og GPS-spor og åpner vanlig turmodus eksplisitt.
- Fullførte lagrede strekk gjenkjennes i riktig retning, med sammenhengende GPS. Kryssing, retur i motsatt retning, manglende ende og GPS-opphold over 30 sekunder gir ingen fullføring. Registreringen krever ikke at hele turen følger skyggen.
- Tidsporter opptil 8 m innenfor begge ender gir omtrentlige GPS-tider som også brukes for tidligere forsøk. Pauser mellom portene inngår. Under 5 sekunders forskjell vises som jevnt. Dette er ikke presis konkurransetidtaking.
- Underveis: siste fullførte strekk, utvidbar liste og valgfri tale. Etterpå: alle fullføringer, sist, tidligere beste og valgt skygge. Gamle lokale turer blir sjekket mot lagrede strekk. Senere turer brukes aldri som tidligere rekord.
- «Lagre strekk hit» og «Sett start her» bekreftes. Siste handling kan angres i 10 sekunder; GPS-punktene slettes aldri av angre. Navnefeltet åpnes ved et eksplisitt valg og lukkes etter lagring.
- Blå DU-markør skiller nåposisjonen fra grønt spor og korallfarget skygge. Posisjonsknappen sentrerer også under en skyggetur.
- Norsk talemotor og stemmevalg kommer fra mobilen. Meldinger bruker bergensk ordlyd med «eg»; appen inneholder ingen separat bergensk talemodell.

## Validering

123 domenetester/databasetester og TypeScript. Syntetiske tilfeller dekker ruter med retur langs samme gate, tidsporter, pauser, feil retning, kryssing, GPS-opphold, senere rekorder, startgrense og angre etter omstart. `scripts/android-stretches-smoke.py` kontrollerer slutt-APK-en med syntetiske spor på Android.

En privat lokal gjennomspilling av to gjentatte runder gjenkjente alle sju strekk fra første runde på den andre. Skyggesammenligningen var tilgjengelig gjennom hele opptaket; 20 minuttmeldinger fra første minutt til slutt. Ingen private spor eller eksportfiler inngår i kildekode, APK eller CI.
