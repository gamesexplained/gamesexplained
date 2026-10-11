# Level 2 — verified technical facts

File E on side 2. Every address here is this level's, in
`listing.json`; routines named with an address are the engine's
(`parts/engine`), and how the engine reads a level's tables is in the
engine's facts. Unless marked *live*, a fact comes from the bytes of
`work/entry.vsf`, stopped at `$B3CC` just after the load.

## Map and waves

- The scroll starts at tile column 0 of the 256-column map.
- 75 tile columns start an attack wave (6 to 244), placing 322 objects in all.
- Munitions pods: 20 of type 5, in every game, and 14 of type 6, which only a two-player game gets (`waves_spawn`, `$E3FF`).

## The script

The tables at `$9700-$977F` hold twelve events; only the first eleven
can happen.

| Event | Tile column | Character column | Speed | Shots | Does | Stops the scroll |
|---|---|---|---|---|---|---|
| 0 | 1 ($01) | 1 | 1 | 2 | colours 01/0C/0B | - |
| 1 | 52 ($34) | 1 | 2 | 2 | colours 01/0C/0B | - |
| 2 | 79 ($4F) | 1 | 3 | 3 | colours 01/0E/06 | - |
| 3 | 96 ($60) | 1 | 1 | 4 | colours 0F/0A/0B | - |
| 4 | 122 ($7A) | 1 | 2 | 4 | colours 0F/04/09 | - |
| 5 | 175 ($AF) | 1 | 2 | 2 | colours 0D/05/0B, starts the mid-level boss | 80 units, 3,840 frames (77 s) |
| 6 | 206 ($CE) | 1 | 3 | 3 | colours 0D/05/0B | - |
| 7 | 219 ($DB) | 1 | 2 | 2 | colours 01/0C/0B | - |
| 8 | 234 ($EA) | 1 | 4 | 4 | colours 01/0C/0B | - |
| 9 | 251 ($FB) | 3 | 3 | 4 | colours 01/0C/0B, starts the boss at the end | - |
| 10 | 0, the end | 3 | 3 | - | - | 160 units, 7,680 frames (153 s) |

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

- At the end of the level (`$9778`), started at tile column 251: the core takes 120 hits, but only once its 2 guards (objects 1-2, taking 100, 100 hits) are gone; the rest of its 14 objects cannot be hurt; 4 enemy shots at a time; spawn setting $81.
- Mid-level (`$97D8`), started at tile column 175: no guards, and the core takes 100 hits; the rest of its 8 objects cannot be hurt; 2 enemy shots at a time; spawn setting $03.

## Hidden message

The last sixteen bytes, `$98F0-$98FF`, which no code uses (the mover
copies them with the rest of the page), hold "DISHONEST JOHN" in screen codes
(A = 1), then two `$FE`.
