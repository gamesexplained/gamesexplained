# 19 — Ladder Challenge

## Loaded program

`PLF19` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

[$3237](source-plf19.html#3237) moves three ladder pieces together, reversing at exact X124/228 and top-pieceY82/142. The joint cycle lasts1,560 eligible updates. [$32AD](source-plf19.html#32AD) runs first, adding old horizontal velocity to the rider and climbing flag8; no private Y carry occurs.

## Checks and remaining limits

CPU checks cover the full cycle, exact boundaries, sign extension, rider/reversal order and all death masks. Any ladder bit exempts a mixed hazard mask. A legal ladder ride and natural mixed contacts remain open.

The game's shared verification scope and cross-level comparisons are included below.
