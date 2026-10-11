# Level 8 — verified technical facts

File R on side 2. Every address here is this level's, in
`listing.json`; routines named with an address are the engine's
(`parts/engine`), and how the engine reads a level's tables is in the
engine's facts. Unless marked *live*, a fact comes from the bytes of
`work/entry.vsf`, stopped at `$B3CC` just after the load.

## Map and waves

- The scroll starts at tile column 0 of the 256-column map.
- 65 tile columns start an attack wave (1 to 231), placing 277 objects in all.
- Munitions pods: 24 of type 5, in every game, and 20 of type 6, which only a two-player game gets (`waves_spawn`, `$E3FF`).

## The script

The tables at `$9700-$977F` hold twelve events; only the first eleven
can happen.

| Event | Tile column | Character column | Speed | Shots | Does | Stops the scroll |
|---|---|---|---|---|---|---|
| 0 | 0, the start | 1 | 2 | 4 | colours 01/0C/0B | - |
| 1 | 25 ($19) | 1 | 3 | 4 | colours 01/0C/0B | - |
| 2 | 50 ($32) | 1 | 2 | 4 | colours 01/05/0B | - |
| 3 | 79 ($4F) | 1 | 5 | 4 | colours 01/0C/09 | - |
| 4 | 129 ($81) | 1 | 3 | 4 | colours 01/0E/0B | - |
| 5 | 167 ($A7) | 1 | 2 | 4 | colours 01/0A/09, starts the mid-level boss | 30 units, 1,440 frames (29 s) |
| 6 | 218 ($DA) | 1 | 2 | 4 | colours 01/04/0B | - |
| 7 | 242 ($F2) | 1 | 3 | 4 | colours 01/0C/0B, starts the mid-level boss | 100 units, 4,800 frames (96 s) |
| 8 | 247 ($F7) | 1 | 4 | 4 | colours 01/0C/0B | - |
| 9 | 251 ($FB) | 3 | 3 | 4 | colours 01/0C/0B, starts the boss at the end | - |
| 10 | 0, the end | 3 | 3 | - | - | 255 units, 12,240 frames (244 s) |

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

- At the end of the level (`$9778`), started at tile column 251: the core takes 100 hits, but only once its 2 guards (objects 1-2, taking 200, 200 hits) are gone; the rest of its 11 objects cannot be hurt; 4 enemy shots at a time; spawn setting $02.
- Mid-level (`$97D8`), started at tile columns 167 and 242: no guards, and the core takes 230 hits; the rest of its 15 objects cannot be hurt; 4 enemy shots at a time; spawn setting $02.

## Hidden message

The last sixteen bytes, `$98F0-$98FF`, which no code uses (the mover
copies them with the rest of the page), hold "BASTARD J.W.H." in screen codes
(A = 1), then two `$FE`.
