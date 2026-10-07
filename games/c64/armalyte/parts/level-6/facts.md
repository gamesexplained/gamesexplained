# Level 6 — verified technical facts

File N on side 2. Every address here is this level's, in
`listing.json`; routines named with an address are the engine's
(`parts/engine`), and how the engine reads a level's tables is in the
engine's facts. Unless marked *live*, a fact comes from the bytes of
`work/entry.vsf`, stopped at `$B3CC` just after the load.

## Map and waves

- The scroll starts at tile column 0 of the 256-column map.
- 85 tile columns start an attack wave (4 to 243), placing 390 objects in all.
- Munitions pods: 34 of type 5, in every game, and 17 of type 6, which only a two-player game gets (`waves_spawn`, `$E3FF`).

## The script

The tables at `$9700-$977F` hold twelve events; only the first eleven
can happen.

| Event | Tile column | Character column | Speed | Shots | Does | Stops the scroll |
|---|---|---|---|---|---|---|
| 0 | 5 ($05) | 1 | 1 | 2 | colours 01/0C/0B | - |
| 1 | 13 ($0D) | 1 | 2 | 3 | colours 01/0E/06 | - |
| 2 | 39 ($27) | 1 | 3 | 4 | colours 01/0C/0B | - |
| 3 | 64 ($40) | 1 | 3 | 4 | colours 01/0A/02 | - |
| 4 | 97 ($61) | 1 | 3 | 4 | colours 01/0A/02 | - |
| 5 | 118 ($76) | 1 | 2 | 3 | colours 01/05/09 | - |
| 6 | 157 ($9D) | 1 | 4 | 1 | colours 01/04/0B | - |
| 7 | 180 ($B4) | 1 | 2 | 3 | colours 01/08/09, starts the mid-level boss | 60 units, 2,880 frames (57 s) |
| 8 | 212 ($D4) | 1 | 3 | 4 | colours 01/0E/06 | - |
| 9 | 251 ($FB) | 3 | 4 | 4 | colours 01/0E/06, starts the boss at the end | - |
| 10 | 0, the end | 3 | 4 | - | - | 255 units, 12,240 frames (244 s) |

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

- At the end of the level (`$9778`), started at tile column 251: no guards, and the core takes 300 hits; the rest of its 13 objects cannot be hurt; 4 enemy shots at a time; spawn setting $02.
- Mid-level (`$97D8`), started at tile column 180: the core takes 8 hits, but only once its 3 guards (objects 1-3, taking 60, 40, 40 hits) are gone; the rest of its 7 objects cannot be hurt; 4 enemy shots at a time; spawn setting $00.

## Hidden message

The last sixteen bytes, `$98F0-$98FF`, which no code uses (the mover
copies them with the rest of the page), hold "HARRIES FVCKER" in screen codes
(A = 1), then two `$FE`.
