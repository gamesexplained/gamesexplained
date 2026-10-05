# Location module 3 — verified technical facts

Module 3 is the way into the Ranger Center from the world map. It is
entry 3 of the module directory at T34/L16, stored on side 1 only; the
engine's `load_module` unpacks it to `$CA00`, and its own bytes are
`$CA00-$CA24`. The game runs it from the world map's class-6 record 0,
whose action byte is `$83` (game `$8845`). It saves, then loads the
Ranger Center program over the game and starts it; it never returns.

## Load and extent

- Side 1's directory entry is `4C 07 01 01`: the stream starts at T25/L8
  byte 76 and the unpacker may read one page. Sides 2-4 have `00 00 00
  01`, which names side 1.
- The 37 bytes `$CA00-$CA24` decode from the stream's first 385 bits:
  T25/L8 bytes 76-123 and the top bit of byte 124, the first of the 130
  zero bytes that fill the sector up to its last two, `$19 $11`.
  Decoded from side 1, the stream gives `entry.vsf`'s `$CA00-$CB7C` byte
  for byte.

## What it does

- `save_map` writes the world map back (`$CA00`), its entrance square
  already turned into class 6 number 0 (below).
- `save_game` writes the game state to T35/L7-L0 of the disk in the
  drive (`$CA03`), before any side check.
- It copies the record's bytes 3-14, "Ranger Ctr." and its zero, to the
  picture caption `$F4D0` (`$CA06-$CA13`), which the Ranger Center shows
  under its portrait.
- It waits for side 1 (`$CA15`). The `BCS` after the call never
  branches: the side check returns only by the `CLC` at engine `$18C2`.
- It loads T27/L7 with `load_program`, which starts the Ranger Center at
  `$7E00` (`$CA1A-$CA22`). The record's bytes 1-2, `$FF $FF`, are never
  applied.

## The entrance

- The world map's class-6 record 0, `$4D5F` in map 0, `83 FF FF "Ranger
  Ctr." 00`, is the only class-6 record with action `$83` on the 42 maps
  (every word of every map's class-6 list).
- The square that leads to it is column 55, row 62: class 10 number 39,
  record `$4EB7`, `D8 00 00 00 06 00`. Its first byte asks first, gives
  offsets from the party's square and shows message 24, "Entering Ranger
  Center."; the offsets are 0, 0, the map is the world map itself, and
  the square becomes class 6 number 0 (game `$89B5`). Entering the map
  already in memory does nothing (engine `$25C1`), the handler returns
  with the carry set, and the game runs the new square at once.
- The exit handler changes the square before the module runs, and the
  module saves the world map with it. On the play disks `copy-s1.g64` and
  `save-s1.g64` the world map's square 55,62 is class 6 number 0; on the
  masters and a fresh copy it is class 10 number 39. The game's
  `play-map.vsf`, and the radio, order and death snapshots taken from it,
  hold 6, 0 there, with the pair 10, 39 that the change replaced still in
  `$AD/$AE`.
- The world map puts the exit back. The party steps only north, south,
  west and east (the main menu's I, K, J and L, game `$AE19-$AE84`). Of
  the four squares beside 55,62, two are class 11 (54,62 and 55,63), and
  the other two, 55,61 and 56,62, are remote-change square 2 of the world
  map (map-00 `$4F2E`), which writes class 10 number 39 back on 55,62
  without a redraw. So a party that comes back finds the exit, and the
  move check asks "Enter new location (Y/N)?" for a class-10 square (game
  `$8A36-$8A3B`), as on the first visit (traced, not tried).
