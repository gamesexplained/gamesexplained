# Level 1 — verified technical facts

File D on side 2. Every address here is this level's, in
`listing.json`; routines named with an address are the engine's
(`parts/engine`), and how the engine reads a level's tables is in the
engine's facts. Unless marked *live*, a fact comes from the bytes of
`work/entry.vsf`, stopped at `$B3CC` just after the load.

## Map and waves

- The scroll starts at tile column 0 of the 256-column map.
- 93 tile columns start an attack wave (3 to 244), placing 307 objects in all.
- Munitions pods: 16 of type 5, in every game, and 12 of type 6, which only a two-player game gets (`waves_spawn`, `$E3FF`).

## The script

The tables at `$9700-$977F` hold twelve events; only the first eleven
can happen.

| Event | Tile column | Character column | Speed | Shots | Does | Stops the scroll |
|---|---|---|---|---|---|---|
| 0 | 1 ($01) | 1 | 1 | 2 | colours 01/0E/06 | - |
| 1 | 17 ($11) | 1 | 1 | 2 | colours 01/0E/06 | - |
| 2 | 48 ($30) | 1 | 1 | 3 | colours 01/05/0B | - |
| 3 | 62 ($3E) | 1 | 1 | 1 | colours 01/05/0B | - |
| 4 | 69 ($45) | 1 | 2 | 2 | colours 01/0A/09 | - |
| 5 | 99 ($63) | 1 | 2 | 2 | colours 01/0A/09 | - |
| 6 | 117 ($75) | 1 | 1 | 2 | colours 01/0A/02 | - |
| 7 | 144 ($90) | 1 | 2 | 2 | colours 01/0E/06 | - |
| 8 | 214 ($D6) | 1 | 2 | 4 | colours 01/0C/0B, starts the mid-level boss | 60 units, 2,880 frames (57 s) |
| 9 | 251 ($FB) | 3 | 3 | 1 | colours 01/0C/0B, starts the boss at the end | - |
| 10 | 0, the end | 3 | 3 | - | - | 256 units, 12,288 frames (245 s) |

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

- At the end of the level (`$9778`), started at tile column 251: no guards, and the core takes 160 hits; the rest of its 15 objects cannot be hurt; 2 enemy shots at a time; spawn setting $FF.
- Mid-level (`$97D8`), started at tile column 214: no guards, and the core takes 90 hits; the rest of its 8 objects cannot be hurt; 1 enemy shot at a time; spawn setting $03.

## Hidden message

The last sixteen bytes, `$98F0-$98FF`, which no code uses (the mover
copies them with the rest of the page), hold "DISHONEST JOHN" in screen codes
(A = 1), then two `$FE`.
