# Gatekampen 0.1.0 — første personlige felttest

[Last ned APK](https://github.com/helge-gish/bergen-paths/raw/refs/heads/gatekampen-apk-0.1.0/gatekampen-0.1.0.apk).

Dette er en egen app: **Gatekampen**, Android-pakke `no.gatekampen.app`. Installer ved siden av Tråkk og Herebound. Ingen av dem erstattes, og gamle spor flyttes ikke automatisk. APK-en er en arm64-testutgave for blant annet Pixel 6a.

## Første prøve nær Meyermarken

1. Velg **Sandviken → Hent gatekart** mens du har nett.
2. Trykk **Start registrering**, gi nøyaktig posisjon og bakgrunnstilgang. Tillat varsler for synlig registrering på låseskjermen.
3. Gå en kort, kjent gate fra ende til ende på fortauet. Lås gjerne skjermen underveis. Gateregistreringen bruker Tråkks eksisterende, felttestede algoritme.
4. Åpne appen. Gaten skal bli grønn; trykk på den for dekning og bekreftede gateender. Fullskjermkartet har **Meg** og **Minimer**.
5. Trykk **Pause** når du er ferdig. Samlingen bevares. Ti minutters bekreftet stillstand gir også automatisk pause, med manuell start når du fortsetter.

**Kampen** har fem ledetrådoppgaver, blant annet to i Sandviken. Åpne en oppgave før du går gaten. Dette er tekstoppgaver; fotojakten trenger et utvalg egnede bilder.

## Gater og områder

Kun gater i første utgave. Trapper og gangstier filtreres før navnegruppering. Minst 95 % av én hel gate og gateendene må bekreftes på samme tur. Fortausgange teller; GPS-hull, bilfart og kryssinger fyller ikke inn manglende deler. To halve, separate turer blir ikke én fullført gate.

Nordnes, Sandviken og sentrum har foreløpige testgrenser. Hele gater som berører et område beholdes, også utenfor grensen. «Hent gater der jeg er» under Samling støtter personlig gatesamling andre steder. Gatene og råsporene lagres på mobilen; kartbakgrunnen kan fortsatt trenge nett.

## Vennegrupper

Klient og serveroppsett for e-postinnlogging, invitasjonskoder, 28-dagerssesonger og serverkontrollerte resultater er implementert. **Nettjenesten er ikke satt i drift**, så denne APK-en åpner ikke vennegrupper. Et dedikert Supabase-prosjekt og gjennomgåtte konkurransekataloger må kobles til først. Det vises også i appen.

## Kontrollert

- 310 automatiserte tester bestod, inkludert Tråkks eksisterende gatealgoritme og nye Gatekampen-regler.
- TypeScript-kontroll bestod.
- PostgreSQL-test av migrasjoner, privat tilgang, invitasjoner, sesongresultater, fryst katalog og gjentatte innsendinger bestod. Auth-kontekst er en testfixture; ingen live e-post-/Edge-test ennå.
- Skjermflyt kontrollert med nettlesertest og simulerte native grenser. Kart/GPS på telefon, låseskjerm og batteri er ikke fysisk testet her.
- Bygget som egen Android-APK. Faktisk OSM-henting må bekreftes på telefon: Overpass-adressen er blokkert av utviklingsmiljøets nettpolicy, mens klienten bruker den samme karttjenesten som Tråkk.

[Produktplan](https://github.com/helge-gish/bergen-paths/blob/gatekampen-0.1.0/docs/product/gatekampen-v1.md) · [Backend-oppsett](https://github.com/helge-gish/bergen-paths/blob/gatekampen-0.1.0/apps/gatekampen/README.md).
