# Level 4 — verified technical facts

File H on side 2. Every address here is this level's, in
`listing.json`; routines named with an address are the engine's
(`parts/engine`), and how the engine reads a level's tables is in the
engine's facts. Unless marked *live*, a fact comes from the bytes of
`work/entry.vsf`, stopped at `$B3CC` just after the load.

## Map and waves

- The scroll starts at tile column 0 of the 256-column map.
- The level has no scenery: every one of the map's 1,280 entries is tile 0, and tile 0 is 25 gaps, so the screen shows only stars. Its other tiles are gaps too (`$25AC-$3933` all `$20`).
- 77 tile columns start an attack wave (4 to 247), placing 513 objects in all.
- Munitions pods: 22 of type 5, in every game, and 15 of type 6, which only a two-player game gets (`waves_spawn`, `$E3FF`).

## The script

The tables at `$9700-$977F` hold twelve events; only the first eleven
can happen.

| Event | Tile column | Character column | Speed | Shots | Does | Stops the scroll |
|---|---|---|---|---|---|---|
| 0 | 0, the start | 1 | 1 | 4 | colours 01/0E/06 | - |
| 1 | 49 ($31) | 1 | 3 | 4 | colours 01/0A/02, starts the mid-level boss | 120 units, 5,760 frames (115 s) |
| 2 | 50 ($32) | 1 | 2 | 4 | colours 01/0C/0B | - |
| 3 | 140 ($8C) | 1 | 2 | 4 | colours 01/05/0B | - |
| 4 | 191 ($BF) | 1 | 1 | 4 | colours 01/08/09 | - |
| 5 | 211 ($D3) | 1 | 2 | 4 | colours 01/0A/02 | - |
| 6 | 212 ($D4) | 1 | 1 | 4 | colours 01/0A/02 | - |
| 7 | 213 ($D5) | 1 | 3 | 4 | colours 01/0A/02 | - |
| 8 | 249 ($F9) | 1 | 2 | 4 | colours 01/0E/06 | - |
| 9 | 251 ($FB) | 3 | 4 | 4 | colours 01/0E/06, starts the boss at the end | - |
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

- At the end of the level (`$9778`), started at tile column 251: the core takes 40 hits, but only once its 3 guards (objects 1-3, taking 100, 100, 100 hits) are gone; the rest of its 14 objects cannot be hurt; 4 enemy shots at a time; spawn setting $81.
- Mid-level (`$97D8`), started at tile column 49: the core takes 40 hits, but only once its 2 guards (objects 1-2, taking 120, 120 hits) are gone; the rest of its 11 objects cannot be hurt; 4 enemy shots at a time; spawn setting $FF.

## Hidden message

The last sixteen bytes, `$98F0-$98FF`, which no code uses (the mover
copies them with the rest of the page), hold "FVCKHEAD JOHN" in screen codes
(A = 1), then a space and two `$FE`.
