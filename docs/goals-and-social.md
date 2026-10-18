# Tråkk: collection, goals, avatar and a two-person social pilot

## Shipped in 0.3.0

Start walking without choosing categories. Finished normal and ghost walks are evaluated against every downloaded category. Foreground jobs discover map data for every visited grid cell (0.02° latitude × 0.04° longitude, 3 km query radius), retain independent point/street checkpoints, retry failures, and refresh after seven days. Raw GPS tracks stay on the phone; Overpass receives geographic search areas. Offline walks can receive awards retrospectively. Jobs are not OS background jobs: reopen the app with network to complete collection.

A home area is optional. Search a named city, town, village or neighbourhood, or use current position, then select 1/3/5 km radius. Walking elsewhere counts equally. Place searches match OSM names, Norwegian names, alternative names and named administrative boundaries. The map uses home area, recent track or current GPS; it no longer defaults to Bergen.

Named streets use the most local mapped administrative area at levels 6–8, with a scope in their identity. Complete OSM ways in that area are returned, preserving branches. A street's definition ends at its loaded administrative scope; this is not a promise of global name completeness. The UI describes the scope and full plotted geometry. Municipalities, data quality and boundaries vary worldwide; missing boundaries do not block point/trail collection. Existing unscoped streets are retired as their corresponding scoped OSM sources arrive.

Goal suggestions group the loaded area by streets, peaks, viewpoints, huts, landmarks or paths. Goals say “all in this map selection”, not “all physically existing places”. A radius selection is not an official city-centre polygon. “All streets in Bergen centre” as a shared canonical challenge needs an agreed boundary and published target list. Activating freezes target IDs and geometry. Historical walks count; deactivation never removes collection. The curated Bergen seven-peak goal resolves OSM peaks near their known positions and requires all seven before offering activation. Definition IDs include geometry so changed definitions cannot silently share a ranking.

The local avatar earns milestone XP once for total distance, cumulative ascent and collected targets. Level = floor(sqrt(XP/100)) + 1. Caps unlock at level 2, backpack at 3, pole at 5, gold badge at 8. Avatar colour persists. Deleting a walk recomputes evidence, milestones and equipment. These are personal prototype scores, not trusted server rankings.

## Next: private pilot for the owner and partner

The first online release should support two invite-only accounts, mutual friendship, explicit trip sharing, friends' profiles and stats, shared trips as ghosts, and optional live location during a walk. Live location must not be inferred from normal recording or from choosing a ghost.

Suggested implementation: hosted Postgres + auth + object storage + realtime (e.g. Supabase). No such project is provisioned or configured yet. Production project, region and owner need choosing before backend deployment. Only the publishable client key ships in the app; administrative secrets never do.

Tables and ownership:

- `profiles(user_id, display_name, avatar_colour)`; authenticated owner writes; accepted friends read the fields they are allowed to see. Weight remains device-only.
- `friendships(id, requester, recipient, status)` and single-use expiring invite tokens. Either party can revoke access.
- `shared_trips(id, owner, source_id, version, visibility, stats, path_object, created_at)` with unique owner/source/version for idempotent uploads. Storage paths obey the same friend access rules. A private track does not become shared by default.
- `live_sessions(id, owner, started_at, expires_at, ended_at)` and `live_positions(session_id, sampled_at, latitude, longitude, accuracy)`. Explicit “share with friends for this walk” consent. Session ends on finish/manual stop and expires without renewal. Stale positions show last seen, never “now”; spectators receive only latest fixes.
- `goal_definitions(id, version, boundary, targets, rules)` and `goal_members(user_id, goal_version, joined_at)`. Server recomputes accepted progress from private evidence; rankings compare only identical published definition versions. Users choose whether to participate.

A friend's ghost is a permitted, immutable snapshot of that friend's shared walk, including GPS timestamps and pauses, provenance and display name. Store it separately from the walker's own trips so downloading a friend's hike cannot inflate their distance, collection or avatar. Resolve remote references through a reference repository used by both UI and background tracking. The existing `ghostComparison` and `matchRoute` functions can consume this snapshot. Once a replay starts, keep its version fixed; withdrawn sharing removes future access and cached copies according to an explicit retention policy. Do not use live friend positions as historical ghost timestamps.

Acceptance for the two-phone pilot:

1. Invite/accept, and prove a third unconnected account cannot read profiles, paths or location.
2. Share a recorded walk, open it on the other phone and start “walk with this ghost”; route, timing and pauses survive relaunch. Neither importing nor replaying duplicates the friend's achievements into the recipient's history.
3. Enable live sharing explicitly, see fresh/last-seen distinction, then stop/expire/revoke and verify access ends.
4. Offline recording and an upload retry produce one shared trip. Removing a shared copy does not remove the original local walk.
5. Both users activate exactly the same goal version; completed counts and optional ranking agree with server evidence. No speed ranking across different routes.

## Longer-term game direction

Preserve reliable tracking, full elapsed time, route comparison and personal stats. Add collection journeys, geographic goal packs, avatar equipment, friend activity and optional challenges. Progress rewards explored places and accumulated walking rather than notification pressure. OpenStreetMap supplies the world geometry; the app supplies people, progress, sharing and game rules. Social sharing is not implemented in 0.3.0.


## 0.3.1 corrections

Collection and goal evaluation yield between bounded work slices instead of running synchronously during rendering. Startup and collection/network activity have explicit status text. Saving a home area or avatar colour does not reload the full collection. Map overlays are limited to the current viewport, at most 500 discoveries and 30,000 vertices, with an explicit zoom-in hint; selected targets stay visible. This affects drawing only, not collection evidence. The Android MapLibre 11.5.0 default pan interception fix is applied by postinstall and the Android build script.

Named footways and steps join the whole-street query. A name consisting solely of stairs becomes one stair target; stairs belonging to a street stay part of that street. Unnamed stairs use their own full-traversal target. Walking along a nearby sidewalk counts toward street coverage with the same GPS tolerance. Tagged sidewalks and crossings do not receive separate trail awards. On first launch after upgrading, legacy path data without highway metadata and old street definitions are retired and re-fetched, old derived fragment awards are removed, and active goals based on the obsolete subdivision are marked for replacement. Personal GPS tracks and saved trails are never removed by this cache upgrade. Genuine OSM paths still use OSM segment identities; semantic grouping of named hiking routes remains future work. Imperfect OSM tagging can still affect classification.

The home area and radius are displayed in Turpass, radius buttons wrap at large text sizes, and collection counts distinguish earned streets, stairs, path segments and places from the number of downloaded objects. The home area remains optional and does not limit where trips count.


## 0.3.2: per-trip rewards and collection under Deg

Navigation is Utforsk, Turlogg, Deg. The profile opens separate Samlingen min and Mine mål sheets. Collection defaults to earned, named finds, with Påbegynt and Alt i kartet as explicit alternatives. Rules and fetching are below the results.

Trip details show newly earned targets, repeat visits/partial coverage, newly crossed distance/ascent/collection milestones and progress in active goals. Awards are attributed to the completing GPS track, even if map data arrives later; cumulative trails use their threshold-crossing time rather than their earliest partial visit. Deleting evidence recomputes attribution.

Finished tracks and immutable map definitions keep their identity across status refreshes. Calculation is cooperative, reports partial progress, retains previous results, catches errors with retry, rejects distant geometry before detailed matching and reuses completed results while navigating. The Android large-area test now requires calculation to actually finish, then backgrounds/foregrounds the app to check that unchanged input does not restart it.


### Lokale navn og senere felles kartlegging (0.3.3)

Navnløse stier og trapper grupperes som ekstra spor. Brukeren kan gi dem et lokalt Tråkk-navn, slik at faktisk gjennomgåtte ruter får en navngitt plass i samlingen. Navn beholdes ved OSM-oppdatering, men endrer ikke kilden. Offisielle OSM-navn er låst og tar over dersom en navnløs rute får offisielt navn senere. Delte navn er ennå ikke implementert.

Retning for sosial navngiving: første bruker foreslår et navn som kan tas i bruk. Andre må kunne foreslå rettelser, alternative lokale navn og rapportere misbruk; navnet låses ikke permanent til førstemann. OSM-navn og Tråkk-navn må ha tydelig kilde, historikk og en felles objektidentitet. Dette trenger server, synkronisering og moderering sammen med den sosiale delen. Ingen deling skjer i denne versjonen.


### Utsiktspunkter uten navn (0.3.4)

Også navnløse utsiktspunkter ligger i den kompakte «Uten navn»-gruppen i samling og turdetaljer. De påvirker ikke hovedtall, samle-milepæler eller nye målforslag før de har fått navn. Et bekreftet besøk kreves fortsatt. Navngiving er lokal, overlever kartoppdatering, og kan ikke endre offisielle navn. Eldre kartdata med standardtittelen «Utsiktspunkt» følger samme regel.
