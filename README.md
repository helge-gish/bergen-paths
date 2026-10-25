# Tråkk 0.4.5 – tydelig område og fullføring

[Last ned APK](https://github.com/helge-gish/bergen-paths/raw/refs/heads/trakk-apk-0.4.5/trakk-0.4.5.apk). Installer som **Oppdater**, uten å avinstallere.

- Turen avsluttes ikke lenger etter ti minutter i ro. Meldingen og forklaringen er fjernet fra Utforsk, Logg og Innstillinger. Start tur / Avslutt tur styrer registreringen; kart og AR kan fortsatt brukes uten tur.
- Området vises med et stedsnavn, for eksempel «5 km rundt Sandviken, Bergen». Oppslaget gjelder det festede sentrumspunktet, ikke posisjonen som flytter seg under turen. Navnet mellomlagres. Manglende nett/navn gir koordinater som reserve, uten å blokkere bruk eller be om nye tillatelser.
- Logoen har undertittelen «utforsk stiene nær deg».
- Fullført sti eller strekk vises i et eget varsel øverst på hovedskjermene, med navn og tid. Varselet kan lukkes. Talevarsler fra 0.4.4 beholdes, også under bakgrunnsregistrering når Android tillater talen.
- Navnløse stier får **Gi stien et navn**. Navnefeltet står først; navn og stjerner er valgfrie. Navngiving og vurdering kan også gjøres senere fra Logg. Dette er personlige opplysninger lagret på mobilen, ikke endringer i det offentlige kartet.

Bakgrunnsregistrering fortsetter under en aktiv tur også når du tar en pause. Avslutt tur når du er ferdig. Den eksisterende åttetimersgrensen og kravet om nytt områdesamtykke ved reise beholdes; ny automatisk batterihvile er ikke innført. Fullføringskortet ligger i hovedvisningen, mens kart-/AR-fullskjerm og andre åpne dialoger ligger foran. Et fullført, aktivt turstrekk kan vises når du vender tilbake fra låst skjerm. Eldre turhistorikk utløser ikke nye varsler.

## Kontroll

Tester dekker fortsatt tur ved lang stillstand med/uten trening, stedsnavn fra festet sentrum, cache, avvist posisjonstillatelse, forsinkede svar etter områdebytte, fullføringsvarsel, valgfri navngiving og at et lukket varsel ikke vises igjen. 329 automatiske tester, TypeScript, Android-bygg og 14 native tester består. APK-kontrollen bekrefter versjon 0.4.5 (kode 39), app-ID no.trakk.app, nye tekster og samme testsignatur som tidligere. Stedsnavn fra Androids geokoding, GPS og tale med låst skjerm må bekreftes på telefon.

Kildekode: `trakk-0.4.5`. APK, kildearkiv og kontrollsummer: `trakk-apk-0.4.5`.

APK: 43706774 byte. SHA-256: `99126d0744060302a768401ade200e29e082c301654c7cd716a5705420dc9717`.
