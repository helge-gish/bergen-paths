# ULTIMA X — første spill i utendørsplattformen

Produktbeslutning 24. oktober 2026. Dette er gjeldende retning etter brukerens presiseringer om Ultima V, Fløyvarden og felles spillplattform. Erstatter den lineære rekkefølgen, de fire prøveingrediensene og det obligatoriske Maren-møtet i den første testplanen. Plattformens arbeidsnavn er Herebound. Brukerens valgte navn på første spill er **ULTIMA X**, med **Lyktene under Fløyen** som første fortelling.

Nummereringen følger siste utgitte nummererte hovedspill, Ultima IX. Et tidligere prosjekt kalt Ultima X: Odyssey ble kansellert. Denne prototypen er et eget prosjekt, ikke en offisiell videreføring.

## Gjeldende gjennomføringsplan

Herebound, SDK-et og ULTIMA X bygges adskilt fra første dag. Herebound er selvstendig, mens ULTIMA X er første krevende kunde av den felles kontrakten. Se [Herebound SDK og leveranseplan](herebound-sdk.md) for arkitektur, sekk, hjelpere, kapasitet og konkrete milepæler.

Herebound viser spill innen 5 km fra spillerens posisjon. Først finnes bare ULTIMA X rundt Fløyvarden. Spillpakken bestemmer hvor man må møte opp for første start; brukeren har valgt **Meyermarken i Sandviken i testfasen**. Områdets sentrum forblir Fløyvarden. Det erstatter tidligere formulering om fri første inngang hvor som helst i sirkelen. Når spillet er startet, er videre utforsking fortsatt fri, og man trenger ikke besøke Maren først.

Første 0.1.0-prøve tester den sammenhengende veien gjennom katalog, figur, startsted, åpne møter, samtale, handel, rekruttering og varig plattforminventar. Faktisk GPS brukes til katalogen; innholdet spilles i tydelig merket simulator før befaring. Kamp, magi, ferdig mysterium og AR er neste leveranser, ikke fullført i dette bygget.

## Ett univers rundt Fløyvarden

- Senter: Fløyvarden, foreløpig kartfestet fra Peakbooks UTM 32V 298560 6701387, konvertert til WGS84 **60.398520824, 5.343193887**.
- Radius: **5000 meter**, målt fra senter, ikke lengde langs stiene. Hele universet er cirka 78,5 km². Dette inkluderer også byområder; vi begrenser ikke adgang til Tråkks naturstifilter.
- Innholdet plasseres ved utvalgte, tilgjengelige steder innenfor sirkelen. Radiusen betyr ikke at alle kvadratmeter får et møte, eller at vann og privat eiendom blir spillbare.
- Første felttest konsentrerer innhold rundt noen få befarte steder ved Fløyen. Grensen er fortsatt 5 km. Den flyttes aldri til spillerens posisjon.
- Dårlig eller gammel GPS viser usikker posisjon. Støy nær grensen skal ikke nullstille økten eller gi gjentatte ankomstbelønninger. Eksakte funnsteder og terrengfesting krever egne kontroller.

## Ultima V er gameplayreferansen

Den virkelige gangen er oververdensreisen. Spilleren kan undersøke, snakke, kjøpe, selge, bytte, blande, kaste magi, bruke utstyr, hvile eller kjempe. Møter finnes før man har fått et oppdrag om dem.

NPC-er har interesser, kjente samtaleemner og enkle rutiner. Et navn lært hos én person åpner et nytt spørsmål hos en annen. Handel har konkret lager, priser og ressurskostnader. Forsyninger, penger og forberedelse betyr noe; magi er mer enn knapper med nedtelling.

Oppdrag er tilstander og spor i en åpen verden, ikke en obligatorisk kjede av poster. Spilleren kan finne sluttstedet først, trekke seg tilbake og vende tilbake med en løsning. Det skal være verdifullt å gå en tur bare for å handle, utforske eller skaffe ingredienser. Kartet lagrer egne oppdagelser og omtrentlige rykter. Virkelige stier og orientering hjem forblir tilgjengelige.

Spillet har en egen døgnrytme som påvirker personer og enkelte funn. «Vent» på et egnet møtested kan flytte en soloepisode videre; hovedhistorien krever ikke at spilleren faktisk går ut om natten. Delte hendelser får senere en felles serverstyrt klokke; personlig venting kan ikke flytte den klokken eller fornye butikkvarer gratis.

## Ingredienser og magi

De åtte klassiske råvaretypene gir et gjenkjennelig grunnlag. Dette er virtuelle spillgjenstander, ikke påstander om planter som vokser på Fløyen. Hvitløk og ginseng kan for eksempel komme fra urtehandlerens forsyninger.

| Råvare | Norsk visningsnavn | Magisk rolle |
| --- | --- | --- |
| Garlic | Hvitløk | Vern |
| Ginseng | Ginseng | Heling |
| Spider silk | Edderkoppsilke | Binding |
| Sulfurous ash | Svovelaske | Energi og ild |
| Blood moss | Blodmose | Bevegelse |
| Black pearl | Svart perle | Kraft på avstand |
| Nightshade | Nattskygge | Illusjon og gift |
| Mandrake root | Alrunerot | Sterk og sjelden magi |

Spilleren lærer en formel, kjøper eller finner råvarene og **blander et antall ladninger før bruk**. Hver blanding trekker ingredienser; bruk trekker en ladning og mana. Manglende ingredienser, kunnskap eller mana forklares konkret. Ingrediensene trekkes ikke dobbelt ved kasting. Ferdige potions er egne forbruksgjenstander.

Første spillbare sett: lys, heling, motgift, vern, binding og magisk støt. Høyere magisirkler, usynlighet, søvn og sterkere formler åpnes senere. Norske navn og egne oppskrifter kan ha lokalt særpreg, mens ressursmekanikken ligger nær referansen. Prøveoppskrifter og balanse skal merkes som våre regler, ikke fremstilles som en nøyaktig gjengivelse av Ultima V.

## Monstre og taktikk

Klassiske fantasi- og monstertyper får stedlige uttrykk og originale bilder. Verdenen skal romme både svake og sterke motstandere; alt skaleres ikke automatisk til spilleren.

| Første typer | Rolle i vår prøve |
| --- | --- |
| Kjemperotte | Enkel motstander; lærer rekkevidde og angrep |
| Kjempeedderkopp | Gift gjør motgift og forberedelse relevant |
| Slim | Deling gjør valg av angrep viktig |
| Skjelett | Vekter ved et gammelt sted; sterkere forsvar |
| Troll | Tydelig sterkere møte som kan unngås, forhandles med eller bekjempes |
| Gjenganger/tåkevokter | Magisk møte knyttet til mysteriet; kunnskap kan erstatte kamp |

Dette er innholdsmål, ikke seks ferdig implementerte fiender. Første gjennomspillbare bygg trenger tre mekanisk forskjellige motstandere: rotte, edderkopp og vokter. De øvrige følger etter at kamp- og økonomiløkken fungerer.

AR viser skapningen i spillets lag over landskapet. Kamp går over til et lesbart turbasert spillefelt med rekkevidde, plassering, vern, magi, gjenstander og retrett. Spilleren flytter brikker på skjermen, ikke kroppen mellom kampfelt. Taktiske følgesvenner er en planlagt utvidelse; første kampprøve bruker én figur. Senere live-samarbeid bruker samme kampregler.

## Historien: Den forsvunne vokteren

Iver, vokteren som holdt forbindelsen mellom Fløyens steder, har forsvunnet. En midlertidig forvalter har overtatt og innført nye regler «for å holde stiene trygge». Noen støtter ham, noen er redde, og noen hjelper spilleren i det skjulte. Lyktene slukner, og minner forsvinner fra landskapet.

Målet er å finne Iver, forstå hva som skjedde og gjenopprette forbindelsene. Man løser det gjennom rykter, personer, dokumenter, magi og utforsking. Den forsvunne personen, det endrede styret og den gradvise avsløringen gir den ønskede Ultima V-lignende strukturen; personer, dialog og hendelser skrives for dette spillet.

Første mysterium er fortsatt lykten ved vannet. Minst tre uavhengige spor peker dit: Marens kunnskap, et funn i verdenen og Rusk. Spilleren trenger ikke besøke alle. Lykten kan åpnes gjennom forberedt kamp eller kunnskap om vokteren. Belønningen er erfaring og en utstyrbar vokterlykt, og en beskjed fra Iver åpner neste mysterium.

45–60 minutter er ønsket omfang på første meningsfulle gjennomspilling, ikke en tidsgrense eller et ferdig ruteestimat. Spilleren kan bruke flere turer eller la mysteriet vente.

## Samme SDK og figur i alle spill

Alle spillpakker må bruke samme versjonerte SDK-kontrakt. Plattformen eier konto, figur, inventar, utstyr, evner, transaksjoner og progresjon. Pakken leverer geografisk avgrensning, innhold, møter og deklarerte spillregler. Ingen pakke lager en separat spillerøkonomi eller får skrive direkte til inventaret.

Felles tjenester som må implementeres:

- `catalogue`: spill i nærheten, valgt spill, versjon og tilgjengelighet.
- `presence`: områdestatus og ankomst til konkrete møter, separat fra katalogtreff.
- `character`: samme figur, eiendeler, evner og aktivt utstyr på tvers av spill.
- `inventory/trade`: autoriserte, atomiske forbruk, belønninger og bekreftede bytter.
- `discovery/journal`: personlige oppdagelser og valg per spill, gjenopptakbart mellom turer.
- `encounters`: dialog, samling, handel og kamp med idempotente handlinger.
- `presentation`: felles kart, AR, lesbare paneler, lyd og tilgjengelighetsalternativer.
- `party/world`: senere invitasjoner, samarbeid og felles hendelser.

Gjenstander får stabile, navneromssatte ID-er og egenskaper som lys, vern eller heling. Et nytt spill tolker egenskapene gjennom SDK-et; det lager ikke en kopi av figuren. Alt eierskap følger med. Eventuelle begrensninger på bruk skal være synlige og ikke slette, redusere eller nullstille karakteren i det skjulte. Plattformen må kontrollere hvilke belønninger et tredjepartsspill kan utstede, siden de kan brukes utenfor det spillet.

## AI-forfatting via MCP

Brukerens mål er at en skaper kan beskrive et spill til en AI og få en spillpakke som andre kan bli med i. MCP er forfattergrensesnittet; SDK-et er den felles kontrakten som faktisk kjører spillet. Et AI-generert spill skal ikke kreve en ny APK eller egne konti. Første forfatterversjon støtter de prøvde regelblokkene; helt nye mekanikker krever en SDK-utvidelse.

Eksempel: «Lag et samarbeidseventyr på Fløyen med urtemagi, handel og en forsvunnet vokter. Det skal kunne spilles alene på en time.»

Foreslått MCP-kontrakt, ennå ikke implementert:

| Verktøy | Resultat og avgrensning |
| --- | --- |
| `sdk.describe` | Tilgjengelige mekanikker, skjemaer, kapasitet og versjoner. AI får det faktiske regelsettet før den lager innhold. |
| `games.create_draft` | Eierbundet utkast med manifest, område og navn; aldri automatisk offentlig. |
| `games.update_draft` | Strukturert endring av figurer, dialog, oppskrifter, steder og oppdrag, med versjonskontroll. |
| `games.validate` | Kontrollerer skjema, radius, referanser, innganger, oppdragslåser og plattformens ressurs-/belønningsgrenser. Rapporteres uten å hevde at geografien er befart. |
| `games.simulate` | Spillbar forhåndsvisning og scenarioforsøk med adskilte testfigurer. Testressurser kan ikke overføres til live-inventar. |
| `games.publish` | Publiserer en bestemt, validert revisjon under skaperens konto etter eksplisitt publiseringshandling. Krever nødvendige geografiske og innholdsmessige kontroller. |
| `games.create_invite` | Deltakelseslenke eller kode med tilgangsnivå, eksempelvis privat vennegruppe. Sender ingen meldinger på skaperens vegne. |

Skaperen får oversikt over kart, historie, tilgjengelige møter og prøveresultater før publisering. Ny revisjon skal ikke ødelegge aktive spilleres journaler eller eiendeler; versjonsbinding og migrasjonsregler hører til plattformen. Rettigheter avgrenses til egne utkast og tillatte handlinger. MCP-et gir ikke AI direkte tilgang til serverens lager, rå spillerposisjoner eller fri tildeling av globale gjenstander.

Første Fløyen-pakke holder innhold og regler adskilt fra appens tjenester. Etter gameplay-iterasjonene brukes erfaringene til et felles format og MCP-verktøy. Deretter prøver vi å lage et lite spill nummer to fra en tekstbeskrivelse. Det er testen på om kontrakten kan brukes av andre; vi låser ikke forfatterformatet før første spillet fungerer godt.

Herebound er valgt arbeidsnavn. Navnetilgjengelighet er ikke verifisert.

## Leveranser og status

1. **Sammenhengende gameplay:** ett spillkort, lokal figur/lagring, åpne møter, oppdagelser, butikk, forberedt magi, tre fiendetyper og ett løsbart mysterium. Simulatorposisjon gjør rask gjennomspilling mulig. Test at lykten kan oppdages først, at Maren kan hoppes over, og at legitime ressursvalg ikke låser fortellingen.
2. **Samme app ute på Fløyen:** GPS, kart/AR og befarte møteplasser. Test inne/ute av området, GPS-bortfall, appomstart og mobil i lommen mellom møter. Ingen krav om presist AR-anker for å fullføre. Lokal lagring er tilstrekkelig for denne soloprøven.
3. **Gameplay-iterasjoner:** juster frihet, forståelighet, økonomi, samtaler, magi, kamp, AR-presentasjon og gleden ved nye turer ut fra faktisk bruk. Ikke utvid plattformen for å slippe å løse problemer i spillet.
4. **Videreutvikle kontrakten:** stabiliser de delene av SDK-et vi nå har bruk for. Legg til konto/serverlagring og prøv samarbeid, bekreftet bytte og personlig versus delt progresjon.
5. **MCP-forfatterprøve:** AI oppretter spill nummer to via SDK-skjemaene, validerer, simulerer og lager et privat publiseringsutkast med invitasjonslenke. Test samme figur og utstyr i begge spill. Utviklerverktøyene skal ikke kreve kodeendringer for hver ny fortelling eller hvert nytt område.

Den nye 0.1.0-koden ligger under `apps/herebound`, `packages/herebound-sdk` og `games/ultima-x`; gjeldende status og begrensninger står i SDK-planen. Tidligere status for de gamle referansemodellene: Fløyvarden-senteret og 5 km-radiusen er lagt i prototypen, med en ren funksjon for GPS-basert områdestatus. Spillvelger-UI, komplett SDK, automatisk videreføring i mobilappen, innholdet over og live-serveren er ikke ferdigstilt. Eldre `scenario.ts` og `world.ts` bruker fortsatt de tidligere lokale ingrediensene; de må migreres sammen med oppskrifts-/inventarmodellen, ikke omdøpes blindt.

## Referanser

- [Fløyvarden, Peakbook](https://peakbook.org/no/peakbook-element/78551/no/Fl%C3%B8yvarden.html): senterets kartkoordinater; ingen bekreftelse på felttestede møtesteder.
- [Ultima V-manual, gjengitt hos Lemon64](https://www.lemon64.com/doc/ultima-5/645) og [reagenser i Ultima V](https://wiki.ultimacodex.com/wiki/Reagents): ingrediensreferanse.
- [Ultima V Avatar’s Companion](https://www.openu5.org/companion/?lang=en): støtte for mekanikk og bestiarium, ikke spesifikasjon av vår spillbalanse.
- [Hovedseriens nummerering](https://en.wikipedia.org/wiki/Ultima_(series)) og [kanselleringen av Ultima X: Odyssey](https://www.gamespot.com/articles/electronic-arts-kills-ultima-x-odyssey/1100-6101727/).
