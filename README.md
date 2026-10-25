# Herebound 0.3.2 – lesbar Ultima-AR

Installer som **Oppdater** over Herebound 0.3.1. Dette er Herebound-appen, ikke Tråkk. Spill, figur og sekk beholdes.

## Endringer

- Alle fem funntyper vises som miniatyrer. Maksimal grunnhøyde er omtrent 35 cm for bær, 37 cm for sekken, 43 cm for lykten, 50 cm for Rusk og 70 cm for handelsboden.
- Ved plassering beregnes størrelse fra den faktiske kameraprojeksjonen: maksimalt 36 % av bildets bredde og 32 % av høyden. Små kameravinduer får derfor mindre figurer. Størrelsen holdes stabil etter plassering.
- Bakkeplassering tillates fra 1,2 til 5 meter foran kameraet. Når GPS tillater møtet og ARCore har stabil sporing, leter kameraet automatisk etter underlag ved det synlige siktet. Ingen plasseringsknapp kreves. Manglende underlag får en kort veiledning. Ekstrem nærhet eller klippet figur skjules med beskjed om å snu seg eller plassere på nytt.
- Et navneskilt og en stiplet linje følger figurens projiserte plassering. Berøringsflaten følger den mindre figurens faktiske modellgrenser.
- Kameraet viser valgt navn, type og omtrentlig GPS-avstand til funnstedet. Avstanden gjelder spillstedet, ikke den lokalt plasserte miniatyren.
- Én tydelig hovedhandling: undersøk funnet, snakk eller handle. «Plasser på nytt» er en liten sekundærknapp. Lange hjelpepaneler er redusert.
- Velgeren viser ulike navn i én horisontal rad. GPS-bevegelse bytter aldri et valgt funn til et annet automatisk. Valget beholdes mellom kart, AR og fullskjerm. Fullskjermknappen er kompakt og har tilgjengelighetsetikett.
- Når fullskjerm endrer den native kameravisningen, finner kameraet automatisk et nytt bakkeanker. Dette sikrer at bare én ARCore-kameraeier er aktiv og at størrelsen tilpasses den nye flaten.

Dette er fortsatt lokalt plasserte, enkle 3D-modeller. De er ikke presise geografiske AR-ankre ved kartkoordinatene. GPS avgjør hvilke møter som er innen rekkevidde; AR åpner møtet når en synlig figur er valgt. Prøvekameraet gir ingen spillbelønning.

## Kontroller

- 346 automatiske tester bestått. De nye UI-testene dekker riktig navn/handling, usynlig eller feil mål, bakgrunn/forgrunn, prøvekamera, fullskjerm med én kameraeier og GPS som forlater rekkevidden.
- TypeScript bestått. De 16 berørte UI-/spilltestene kjørt på nytt etter endringen til automatisk plassering.
- Fem native JUnit-tester dekker automatisk plassering etter stabil sporing, projeksjon, størrelsesgrenser i små/store vinduer, nær/fjern plassering, treffområder og ugyldige/bak-kamera-projeksjoner.
- Visuell AR-test i virkelig terreng gjenstår. Ingen tilkoblet Pixel var tilgjengelig i byggemiljøet.

## Kort feltprøve

1. Åpne ULTIMA X på Meyermarken og velg Kamera · AR.
2. Velg Rognebær. Sikt på detaljert bakke 1–3 meter foran deg. Funnet skal dukke opp automatisk, uten et knappetrykk.
3. Sjekk at liten figur, navn og stiplet linje hører sammen. Trykk direkte på bærene eller navneskiltet. Knappen «Undersøk rognebær» er et alternativ.
4. Prøv også Marens bod og fullskjerm. Funnet skal også dukke opp automatisk etter bytte av kamerastørrelse.

Godt lys hjelper ARCore å finne underlaget. Kameraet beholder konkrete meldinger om lite lys og manglende detaljer.

Android-bygget og de fem native testene bestod. App-ID `no.herebound.app`, versjon 0.3.2/kode 6, arm64. Signaturen samsvarer med 0.3.1. APK-innholdet er kontrollert for den nye AR-flyten.

APK: 48445750 byte. SHA-256: `8b0bff71b1eae2b469f9e03a99fa9cfc5e744f3031b2877bba6a939bf19ccd30`
