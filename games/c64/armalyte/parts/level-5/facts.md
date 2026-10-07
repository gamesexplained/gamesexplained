# Level 5 — verified technical facts

File U on side 2. Every address here is this level's, in
`listing.json`; routines named with an address are the engine's
(`parts/engine`), and how the engine reads a level's tables is in the
engine's facts. Unless marked *live*, a fact comes from the bytes of
`work/entry.vsf`, stopped at `$B3CC` just after the load.

## Map and waves

- The scroll starts at tile column 0 of the 256-column map.
- 132 tile columns start an attack wave (4 to 245), placing 437 objects in all.
- Munitions pods: 21 of type 5, in every game, and 12 of type 6, which only a two-player game gets (`waves_spawn`, `$E3FF`).

## The script

The tables at `$9700-$977F` hold twelve events; only the first eleven
can happen.

| Event | Tile column | Character column | Speed | Shots | Does | Stops the scroll |
|---|---|---|---|---|---|---|
| 0 | 0, the start | 1 | 1 | 4 | colours 01/0E/06 | - |
| 1 | 5 ($05) | 1 | 1 | 3 | colours 01/0E/06 | - |
| 2 | 45 ($2D) | 1 | 2 | 3 | colours 01/0E/06 | - |
| 3 | 85 ($55) | 1 | 2 | 4 | colours 01/05/0B | - |
| 4 | 105 ($69) | 1 | 3 | 2 | colours 01/05/0B | - |
| 5 | 175 ($AF) | 1 | 2 | 4 | colours 01/05/0B | - |
| 6 | 208 ($D0) | 1 | 2 | 4 | colours 01/0A/02 | - |
| 7 | 232 ($E8) | 1 | 3 | 3 | colours 01/0A/02 | - |
| 8 | 248 ($F8) | 1 | 4 | 1 | colours 01/08/0B | - |
| 9 | 251 ($FB) | 3 | 4 | 4 | colours 01/08/0B, starts the boss at the end | - |
| 10 | 0, the end | 3 | 5 | - | - | 255 units, 12,240 frames (244 s) |

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

- At the end of the level (`$9778`), started at tile column 251: no guards, and the core takes 480 hits; the rest of its 15 objects cannot be hurt; 4 enemy shots at a time; spawn setting $03.
- No mid-level boss: no event of the script starts boss 2, so nothing reads the table at `$97D8`.

## Hidden message

The last sixteen bytes, `$98F0-$98FF`, which no code uses (the mover
copies them with the rest of the page), hold "JOHN H IS A" in screen codes
(A = 1), then three spaces and two `$FE`.
