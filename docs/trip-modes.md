# Vanlig tur og skyggetur

En vanlig tur har «Lagre sti hit». Første klipp lagrer GPS-sporet fra turstart til siste ferske punkt. Neste klipp begynner ved endepunktet til forrige klipp. Turens klokke og komplette GPS-logg fortsetter uavbrutt. «Sett start her» flytter bare begynnelsen til neste segment, for eksempel etter en transportetappe. Minst 10 meter og to gode GPS-punkter kreves. Grensene lagres på mobilen og overlever omstart.

Segmentet får automatisk et navn. Det kan navngis direkte i vanlig tur eller senere ved å åpne den lagrede stien. Lagrede stier kan åpnes fra Utforsk og kompasset. «Gå denne igjen med skygge» viser turstart med stiens egen tid og pauser som referanse. En hel tidligere tur kan også velges som skygge.

Skyggeturer viser sammenligningen uten klippeknapper eller segmentnavngiving. Lagringen avviser også klipp fra skyggeturer. Turmodusen lagres separat fra skyggereferansen, slik at en slettet referanse ikke gjør turen om til en vanlig tur. En aktiv tur må avsluttes før en annen skygge velges.

«Slett tur» krever bekreftelse. Turen, dens GPS-punkter og stier lagret fra den slettes i samme transaksjon. Referanser til både hele turen og dens stisegmenter ryddes, og samlingen beregnes på nytt fra turene som er igjen. Andre turer og profilinnstillinger beholdes.

## Trip names (0.3.5)

The start sheet offers up to four wrapping, selectable titles and an optional text field. Suggestions use the selected ghost, a recent permitted device location against cached named map features, the home area only when that location is inside it, and local time/date as an offline fallback. Panning the map never implies a start location. With existing permission, a fresh device position is requested if no recent fix is available, with an eight-second wait budget. GPS startup never waits for naming. There is no additional map-data request or permission prompt for naming; cached-map scans yield to the UI and cancel when the sheet closes.

If the start field is left empty, the just-finished trip gets a title from its own checked route. Peaks/huts/named viewpoints are preferred; substantially walked streets can form a two-name title. Unnamed features, incidental crossings, and visits from other trips do not supply names. Repeat visits count for naming even when no new collection award was earned. The trip's existing collection check is reused, not duplicated. When map data arrives later, suggestions refresh and can be selected in trip details; no historical trips are silently renamed.

Choosing a suggestion at start or entering a custom name locks that name against automatic replacement. Completed-trip suggestions save with one tap; typed edits use “Lagre turnavn”. Local naming metadata is stored in settings and removed with its trip. This does not change achievements, collection thresholds, or normal/ghost recording behavior.
