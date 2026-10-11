# Level 7 — verified technical facts

File A on side 2. Every address here is this level's, in
`listing.json`; routines named with an address are the engine's
(`parts/engine`), and how the engine reads a level's tables is in the
engine's facts. Unless marked *live*, a fact comes from the bytes of
`work/entry.vsf`, stopped at `$B3CC` just after the load.

## Map and waves

- The scroll starts at tile column `$7F` (127), halfway along the 256-column map (`level_setup_vars`, `$A2AC`), so the level is about half as long as the others (*live*: column `$85` five seconds in).
- The level has no scenery: every one of the map's 1,280 entries is tile 0, and tile 0 is 25 gaps, so the screen shows only stars. Its tiles (`$25AC-$3933`) and tile addresses (`$3E34-$3FC3`) are byte for byte level 1's, which the map never uses.
- 40 tile columns start an attack wave (132 to 242), placing 260 objects in all.
- Munitions pods: 20 of type 5, in every game, and 20 of type 6, which only a two-player game gets (`waves_spawn`, `$E3FF`).

## The script

The tables at `$9700-$977F` hold twelve events; only the first eleven
can happen.

| Event | Tile column | Character column | Speed | Shots | Does | Stops the scroll |
|---|---|---|---|---|---|---|
| 0 | 127 ($7F) | 1 | 2 | 4 | colours 01/0E/06 | - |
| 1 | 128 ($80) | 1 | 2 | 4 | colours 01/0E/0B | - |
| 2 | 129 ($81) | 1 | 2 | 4 | colours 01/0C/0B | - |
| 3 | 130 ($82) | 1 | 2 | 4 | colours 01/0C/0B | - |
| 4 | 131 ($83) | 1 | 2 | 4 | colours 01/05/0B | - |
| 5 | 132 ($84) | 1 | 2 | 4 | colours 01/05/09 | - |
| 6 | 170 ($AA) | 1 | 1 | 4 | colours 01/0A/02 | - |
| 7 | 180 ($B4) | 1 | 3 | 4 | colours 01/08/09 | - |
| 8 | 210 ($D2) | 1 | 3 | 4 | colours 01/04/0B | - |
| 9 | 251 ($FB) | 3 | 4 | 4 | colours 01/0A/02, starts the boss at the end | - |
| 10 | 0, the end | 3 | 4 | - | - | 256 units, 12,288 frames (245 s) |

An event happens when the scroll reaches its tile column and the
character column within that tile; the last event's column 0 is the
map's end, after column 255. Speed is the enemies' speed before the
bonus for completed games; shots is the number of enemy shots allowed
on screen at once. Colours are the values written to `$D021`, `$D022`
and `$D023`: the scenery's shared colours, and in `$D022` and `$D023`
the near and far stars' (space itself is black characters). A stop is counted
in units of 48 frames; when it runs out the boss blows up by itself
(`level_script`, `$A93E`).

## Bosses

- At the end of the level (`$9778`), started at tile column 251: the core takes 260 hits, but only once its 2 guards (objects 1-2, taking 120, 120 hits) are gone; the rest of its 14 objects cannot be hurt; 4 enemy shots at a time; spawn setting $03.
- No mid-level boss: no event of the script starts boss 2, so nothing reads the table at `$97D8`.

## Hidden message

The last sixteen bytes, `$98F0-$98FF`, which no code uses (the mover
copies them with the rest of the page), hold "HAWKEYE'S SHIT" in screen codes
(A = 1), then two `$FE`.
