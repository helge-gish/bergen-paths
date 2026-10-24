# Herebound 0.1.0 — første simulatorprøve

Egen app, `no.herebound.app`, som kan installeres ved siden av Tråkk.

- Herebound, SDK og ULTIMA X er separate deler. Tom spillkatalog støttes.
- GPS-katalog viser ULTIMA X innen 5 km fra Fløyvarden. Teststart og prøvemøter ligger ved Meyermarken.
- Opprett figur, velg spillet og prøv steder i fri rekkefølge. Undersøk lykten, snakk med Maren og Rusk, og la funn åpne nye spørsmål.
- Kjøp og selg. Sekk, gull, egenskaper og hjelper følger figuren mellom spill. Rognebær bruker en felles gjenstands-ID.
- Bæreevne styres av styrke og hjelpere. Rusk kan rekrutteres etter samtale og gir 5 kg ekstra.
- Tilstanden lagres før en handling bekreftes. Omstart beholder fremgangen; figur/lagring kan eksporteres.

## Slik prøver du

Opprett figur → **Åpne prøvemodus** → **Se startsted** → **Gå til start i simulatoren** → **Begynn eventyret**. Velg et rykte og undersøk stedet. Hos Maren kan du handle; hos Rusk kan du spørre om lyktene og be ham slå følge. Se **Figur & sekk**, lukk appen og åpne igjen.

Dette er en lokal simulator og første del av historien. Kartet er skjematisk, møtesteder er ikke befart, og posisjonen flyttes med prøveknapper. Ikke bruk prøvekartet som turkart. Faktisk GPS brukes bare for spillkatalogen. Kamera/AR, magi, kamp, et komplett 45–60 minutters eventyr, avatarbygger, flerspiller og MCP-server er ikke med ennå.

## Kontroll

277 automatiske tester bestod, inkludert 11 nye SDK-/integrasjonstester. De nye testene ble kjørt igjen etter siste koordinatendring. TypeScript-kontroll bestod. Grensesnittflyten ble gjennomgått ved mobil skjermbredde i nettleser med native grenser erstattet: katalog utenfor Bergen, startkrav, dialog, handel, rekruttering, sekk og gjenåpning. Dette erstatter ikke testing av native GPS eller SQLite på telefon.

Android arm64-utgave bygges med bundlet Hermes-kode og testsignering. Ingen fysisk Pixel 6a-test er gjennomført i utviklingsmiljøet.
