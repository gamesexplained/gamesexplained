# Tile set 2 — verified technical facts

The tiles the map window draws maps 2, 3, 4, 5, 6, 27, 28, 31, 32, 33 and 34 with, unpacked to `$D000-$DD7F` when the party enters one of them. They are all on side 2 of the disks, as the set is. Every address here is the engine's, which lies beneath, or this set's.

## The set

- 96 tiles of 16 x 16 pixels. Tile *t*'s bitmap is the 32 bytes at `$D000` + 32*t*:
  four character cells, top left, top right, bottom left, bottom right, eight bytes
  each, two bits a pixel (engine `draw_tile_cells`, `$22F0-$2307`, the operand of
  `LDA $D0E0,X` at `$2367`). Its colours are the four bytes at `$DC00` + 4*t*, one
  a cell: the high nibble colours the pixel pairs 01, the low nibble the pairs 10
  (`$230E-$2321`, stored into the screen matrix at `$2374-$237A`). Pairs 00 show the
  background, black, and pairs 11 colour RAM, white in every cell.
- Each bitmap byte is EORed with `inverse_mask` `$29` as it is drawn (`$236A`).
- `enter_map` reads the map record's byte `+$30` and compares it with the set in
  memory, the operand at `$25F1` (`$25EC-$25F0`). Only when they differ does it
  unpack entry 2 of the tile-set directory, T35/L12, to `$D000` with a limit of
  `$DE00` (`unpack_tile_set`, `$2722`), keeping `$DD80-$DDFF`, the engine's scroll
  copier, on the stack meanwhile.
- The groups of tiles, by their labels: `blank_tile` 0; `figures` 1-6; `party_figure` 7; `radiation_sign` 8; `other_party_figure` 9; `chair_hut_and_slab` 10-14; `orange_blocks` 15-21; `blue_cube_and_rock_corner` 22-23; `pool_edges_and_floor` 24-31; `doors_windows_and_ladders` 32-36; `tree_checks_and_lattice` 37-41; `water_and_rock_edge` 42-45; `grey_rock` 46-50; `frames_and_rubble` 51-54; `red_floors` 55-58; `bench_rock_and_floor` 59-63; `bloody_water_and_props` 64-71; `parquet_and_wall_edges` 72-77; `white_brick_walls` 78-83; `barrel_and_oddments` 84-89; `white_bricks_and_fills` 90-95. Their colours: `figure_colours` 0-9; `chair_hut_and_block_colours` 10-21; `pool_door_and_tree_colours` 22-41; `water_rock_and_floor_colours` 42-63; `prop_colours` 64-77; `brick_and_fill_colours` 78-95.

## What the maps draw with it

Counted in the tile layers of maps 2, 3, 4, 5, 6, 27, 28, 31, 32, 33 and 34 as each comes off the disk, loaded by the game's own `enter_map`; a map changes in play.

- 11,264 squares (all 32 x 32). 69 of the 96 tiles are in a layer. Of the 27 in none, 1, 3-6, 8-9 are drawn by the game's code (the figures, the bag, the sign, the other parties); 88 by a class 4 record, map 4's rope (map-04 `$3FAA`), and 19 are in no class 4 record either: 11-12, 22, 24, 26-28, 41, 43, 55, 62, 67, 70-71, 77, 81, 84, 86, 89. A map's own code could still draw them. 3 bitmaps are blank, all zero bytes: 0, 12, 81.
- The commonest: tile 90 (2,969 squares), tile 58 (2,968 squares), tile 50 (830 squares), tile 57 (767 squares).
- Drawn off the edge of the map (the record's byte `+$33`, engine `draw_square` `$0B5E`): tile 0 on map 5; tile 50 on maps 28 and 31; tile 58 on maps 2, 3, 4, 6, 27, 32, 33 and 34.
- Radiation squares (class 9), drawn as tile 8 from 18:00 to 05:59 and as their layer's tile otherwise (engine `$0B80-$0B8A`): 1 on map 31.
- Loot bags (class 5), drawn as tile 5 whatever the layer holds (engine `$0B68`): 4 on map 4, 1 on map 32, 2 on map 33, 4 on map 34.
- Squares of class 4, which draw the tile in byte 1 of their record (AND `$7F`, engine `$0B8E-$0B97`) in place of the layer's: 1 on map 2, 2 on map 3, 1 on map 4, 1 on map 6, 10 on map 27, 1 on map 32, 128 on map 33.
- No layer and no class 4 record names a tile above 95, though `draw_tile` would draw one (tiles 96-127 would show the colour table and what follows it as bitmaps).

## Shared with the other sets

- Tiles 0-8 are the same bytes, bitmap and colours, in all nine sets: 0 blank, 1-6 the creatures and the loot bag 5 (the encounter figures, engine `creature_tiles` `$5BF5`), 7 the party, 8 the radiation sign.
- Tile 9, which marks the player's other parties, is the version of sets 1, 2, 3, 4, 5, 7 and 8; sets 0 and 6 have the other.
