# Gatesamling

Navngitte gater hentes i det lokale administrative området fra OpenStreetMap, også utenfor Bergen. Hele ways hentes uten å klippe gaten ved en søkeradius. Overpass-svar med feilmelding avvises. Kartdata lagres på mobilen og hentes automatisk langs avsluttede turer, eller på brukerens initiativ.

Gater grupperes etter normalisert navn og område. Duplikate kanter fjernes. Forgreninger, adskilte deler og rundløyper bevares uten oppdiktede forbindelser. Samme gatenavn kan derfor kreve flere deler. OSM-lenken viser en av gatens ways; appkartet viser hele samletraseen.

Én avsluttet tur må dekke minst 95 % av den lengdevektede traseen og besøke alle ender innen 15 m (eller ankre i lukkede komponenter). Samples har høyst 8 m avstand. GPS-kanter må følge gatens retning innen 45 grader og passere innen 15 m. Rene kryssinger teller ikke. Endepunkter sjekkes mot selve GPS-kanten, også mellom to GPS-posisjoner.

To korte, motstående koblinger ved samme T-kryss behandles som én gateende: hver må være høyst 25 m, avstanden mellom endene høyst 30 m, og hovedløpet minst tre ganger så langt som koblingene samlet. Vanlige forgreninger og trappeløp beholdes. Kildens geometri endres ikke.

Ved terminale ender får fortausgange et begrenset slingringsmonn langs gaten: maksimalt 12 m og aldri mer enn 20 % av gatens lengde per ende. Bare endenære samples kan få dette; GPS-kanten må fortsatt følge retningen, ligge innen 15 m og komme innen 15 m av endepunktet. Dette hindrer at naturlige fortaussvinger krever gange ut i kjørebanen. Det gir ingen dekning av hull inne på gaten. Korte gater beskyttes av den proporsjonale grensen.

GPS-nøyaktighet dårligere enn 15 m, tidsavbrudd over 20 sekunder, sprang over 50 m og fart over 3,3 m/s bryter GPS-kanten. Allerede bekreftet dekning på samme tur beholdes. Ingen linje trekkes over avbruddet, og dekning kombineres ikke på tvers av turer for gater/trapper. Tidligere turer sjekkes også. Gateutmerkelser beregnes på nytt ved oppstart og kartoppdatering. Ufullstendig endebekreftelse forklares separat fra prosenten i samlingen.

Navnløse stier, trapper og utsiktspunkter vises i én sammenleggbar gruppe i samlingen og turdetaljene. De er ekstra registrerte delstrekninger, ikke hovedfunn som gir samle-milepæler/XP. Nye områdemål bruker navngitte ruter og utsiktspunkter. Eksisterende mål beholder sine lagrede definisjoner. Andre punktkategorier, som hytter, beholdes selv uten eget navn.

Brukeren kan gi en navnløs sti, trapp eller et utsiktspunkt et lokalt Tråkk-navn. Den blir da et hovedfunn når gang- eller besøkskravet er oppfylt; navngiving alene gir ingen fullføring. ID, geometri og OSM-lenke beholdes. Navnet kan endres eller fjernes, følger eksporten og beholdes ved kartoppdatering. Offisielle navn er låst; kommer et offisielt navn ved kartoppdatering, overtar det for det lokale navnet. Det skriver ikke til OSM eller andre brukeres mobiler. Felles navngiving og rettelser trenger en senere delt tjeneste.

GPS kan forveksle parallelle gater, og kartgrunnlaget kan være ufullstendig. Private veier, veier med fotforbud og veiområder utelates. Kartet er ingen garanti for faktisk gangadgang.
