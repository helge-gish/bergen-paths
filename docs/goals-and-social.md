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
