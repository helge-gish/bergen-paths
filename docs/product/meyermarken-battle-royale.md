# Spill nummer to: Meyermarken battle royale

Produktretning 24. oktober 2026. Dette er en plan for det andre spillet som skal utfordre Herebound-SDK-et, ikke en implementert flerspillermodus. Første prioritet er fortsatt den korte ULTIMA X-feltprøven fra Meyermarken.

## Premiss

Spillere møtes til en privat battle royale i et avgrenset område ved Meyermarken. De finner kister med virtuelt utstyr, våpen og forsyninger, kjemper i spillet, elimineres fra runden og forsøker å bli siste gjenværende spiller. Fortnite er en referanse for rundeformat, kister og loot; innhold, navn og uttrykk utformes for Herebound.

**Spilleren bruker sin eksisterende Herebound-figur. Relevant eid utstyr og evner blir med og kan brukes.** Dette er uttrykkelig brukerens ønskede modell. Ikke innfør identiske startfigurer, tom sekk eller skjult nullstilling av opparbeidet utstyr som en standardløsning for balansering.

## Plattformfigur og runde

- Plattformen eier figur, egenskaper, inventar, utstyr og hjelpere. Kampen bruker den samme identiteten og eierskapet.
- Gjenstander har delte, versjonerte egenskaper/effekter. Spillet erklærer hvilke effekter det støtter. Vurder bruken gjennom disse egenskapene, ikke ved å spesialkode enkelte ULTIMA X-ID-er i battle royale.
- Eksempler som må kunne uttrykkes: helsedrikk gjenoppretter helse; egnet beskyttelse gir vern; et støttet våpen brukes i kamp; en hjelper øker bæreevnen. Detaljert effektbalanse bestemmes i kampprøven.
- En permanent eid forbruksvare som brukes, trekkes fra Herebound-sekken én gang. Den kan ikke brukes igjen i et annet spill etter at den er brukt opp. Kommando-ID, autorisasjon og lagring må håndtere retry, samtidighet og gjenåpning.
- Spilleren får se hvilke medbrakte ting som virker og hva de gjør før runden starter. Ting uten støttet effekt forblir eid; de slettes eller omdøpes ikke.
- Helse, skjold, kampstatus, aktive effekter, rundetimer og eliminering er rundetilstand. Eliminering er ikke sletting av Herebound-figuren.
- Anbefalt regel for første prøve: permanent utstyr og hjelpere beholdes ved eliminering. Loot fra rundens kister er rundeeid inntil en eksplisitt belønningsregel overfører det. Dette er en foreløpig designanbefaling, ikke en brukerbeslutning om full loot eller risiko.
- Alle rundegjenstander bruker samme gjenstandsmodell som plattforminventaret, men har eksplisitt eierskapsomfang og opprinnelse. Ikke lag en uavhengig økonomi som senere må tolkes tilbake til sekken.

## Første gjennomførbare prøve

Anbefalt liten privat test med 4–8 inviterte spillere og korte runder. Lobby med kode, oppmøtesone, felles start, noen få kister, én våpentype, heling, eliminering og vinner. Minimer bygging, mange våpentyper, matchmaking og kosmetikk i denne prøven. En krympende spillsone kan legges til når den grunnleggende løkken fungerer.

Kart og AR deler verden, kister og deltakere. Geografisk GPS-nærhet er ikke presis nok til alene å avgjøre skuddtreff eller dekning. Kampmodellen må få en egen teknisk prøve: hva det betyr å sikte, hvordan motstanderavatarens posisjon etableres, og hvordan serveren avgjør treff med forsinkelse/usikkerhet. Ikke lov Fortnite-lignende presisjon fra GPS og et lokalt AR-anker. Første runde trenger en tydelig, prøvbar treffregel, og AR-en må vise det som faktisk beregnes.

## Nye SDK-behov som dette spillet prøver

1. Serverstyrte økter: lobby, deltakere, roller, livssyklus, felles klokke og runder.
2. Autoritativ rundetilstand: helse, effekter, eliminering og vinner; frakobling/gjeninntreden må ha bestemte regler.
3. Delt loot: to spillere kan ikke begge få den siste varen i samme kiste. Oppdatering og eierskap er atomisk og idempotent.
4. Overføring mellom permanent inventar og rundetilstand: støttede medbrakte gjenstander, reserverte/brukte mengder og eksplisitte belønninger.
5. Generisk kampkontrakt og effekter: støttede handlinger, mål, ressurskostnad, rekkevidde og validering. Ikke dupliser figur eller helpers.
6. Felles kart-/AR-presentasjon for samtidige deltakere, med status for posisjonsusikkerhet. Delte geografiske AR-ankre er et eget behov, ikke noe dagens lokale ARCore-anker allerede løser.

## Rekkefølge relativt til ULTIMA X og MCP

1. Ferdigstill den korte ULTIMA X-prøven med mørklagt kart, faktisk gange og AR ved Meyermarken.
2. Lag en minimal server-/flerspillerprøve for battle royale som SDK-ets andre krevende kunde. Test allerede her at en figur, hjelper og støttet gjenstand fra første spill brukes i det andre.
3. Bruk erfaring fra begge spill til å stabilisere kapabiliteter, gjenstandseffekter, økter og pakkekontrakt. Bygg deretter ut MCP-forfatting rundt de funksjonene som faktisk kjører.

Dette flytter nødvendig serverarbeid foran en faktisk battle royale-test. Simulatorens lokale testfigurer er ikke allerede verifiserte serverkonti; import/provisjonering til en privat test må gjøres eksplisitt.

## Førsteperson, angrepsvarsler og avstandskamp

Brukerens notat 24. oktober: battle royale må varsle med vibrasjon og stemme når spilleren angripes. AR-modus viser avatarens virtuelle hender og det aktive utstyret: våpen, gjenstand fra loot eller noe hentet fra den felles sekken. God grafikk og animasjon er en vesentlig del av opplevelsen. Skytevåpen skal tillate kamp på avstand.

Dette krever en presentasjonsmodell for aktivt utstyr, førstepersonsanimasjon og hendelsesdrevet lyd/haptikk. Serverbekreftede angrep gir dedupliserte varsler også når kartet vises; retning og skade skal bare annonseres når kampdataene støtter det. Varsling når appen er i bakgrunnen/låst må planlegges og testes som en egen mobil livssyklus, ikke antas å virke via en kameravisning.

Avstandskamp krever en definert, servervalidert treffmodell og håndtering av posisjons-/retningsusikkerhet og nettverksforsinkelse. Kamera/GPS alene gir ikke allerede presis FPS-sikting. Våpenets rekkevidde, skudd, ammunisjon, skade og treffrespons inngår i kampkontrakten. Virtuelle avatarhender er første mål; fysisk håndsporing er ikke besluttet som krav.
