# 27 — Robots III

## Loaded program

`PLF27` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

Three robots use thirty nodes and four edge tables [$331E-$3395](source-plf27.html#331E). [$33E2](source-plf27.html#33E2) tries one random direction per eligible update; failed choices wait. Equality prefers down/left. Each bomb callback [$31E3/$31EC](source-plf27.html#31E3) opens one downward edge and rewrites its already-open upward counterpart. Directed edge counts are70 initially,71 after either opening,72 after both.

## Checks and remaining limits

CPU checks cover full bomb paths and the exact page model: 4,800 direction/player-position choices, every edge in all opening states, and three continuous three-robot runs. The explorer matches 21,456 routine calls. A robot naturally taking a newly opened route remains open.


## Interactive Robots III routes

The article's [robot-route explorer](index.html#robot-routes) ports PLF27 [$3396-$347F](source-plf27.html#3396) over the original 30 nodes, four duration tables and cardinal velocities. Its three robots share the resident `$5832` random-number rule and run in sprite-slot order 5, 6, 7. A failed choice consumes one random byte and waits until the next eligible update. An accepted choice moves immediately and finishes its whole duration before retargeting. Direction preferences are up when player Y is smaller, otherwise down; right when floor(player X / 2) is greater, otherwise left. Equality permits down/left. The page's X range stays within the original nine-bit comparison domain.

**CPU checked:** the exact embedded model matches 21,456 calls to the unchanged robot routine. Comparisons cover all three positions, velocities, remaining durations, animation frames, the shared RNG state and individual accepted/rejected choices. This includes 4,800 junction cases across all four opening states, 284 complete edge traversals (4,368 movement updates), and three continuous 4,096-callback runs with changing player positions, original opening callbacks and inactive/death gates. During each isolated traversal, the target moves to the opposite side after the first step; the robot still reaches its original destination. The page's RNG also matches all 65,536 states. Private comparison records retain the scope and original snapshot hash; the page embeds only the route data excerpts and derived opening descriptions.

The displayed backdrop uses the existing checked geometry renderer. Each opening also applies the drawing from matching bomb record [$3175](source-plf27.html#3175) or [$317C](source-plf27.html#317C). The left callback adds downward node 12→18; the right adds 14→19. Their existing upward directions remain available. The diagram places actor markers at their sprite centres relative to the bitmap; these are explanatory markers, not original sprite graphics.

The explorer runs six eligible updates per second for readability, with a repeatable seed. It omits player physics, collisions/death, other consumers of the game's shared random stream and video-frame timing. The examples place Robot 1 at a chosen node and Jumpman below it. Changing a passage restarts all three robots; restoring a closed passage is a comparison control, not an in-game undo. These controlled placements do not establish a natural bomb-collection route or a live robot taking an opened path. Browser checks cover both closed/open examples, target reversal, all three focus choices, reset, mouse/touch placement and dragging, sliders, arrow keys, run/pause and 1440/768/390-pixel layouts.
