# Tile set 7 — verified technical facts

The tiles the map window draws maps 7, 13, 15 and 21 with, unpacked to `$D000-$DD7F` when the party enters one of them. They are all on side 4 of the disks, as the set is. Every address here is the engine's, which lies beneath, or this set's.

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
  unpack entry 7 of the tile-set directory, T35/L12, to `$D000` with a limit of
  `$DE00` (`unpack_tile_set`, `$2722`), keeping `$DD80-$DDFF`, the engine's scroll
  copier, on the stack meanwhile.
- The groups of tiles, by their labels: `blank_tile` 0; `figures` 1-6; `party_figure` 7; `radiation_sign` 8; `other_party_figure` 9; `hulk_entrance_and_marks` 10-14; `orange_blocks` 15-21; `grille_box_and_bands` 22-26; `road_edges` 27-31; `cabinets_and_top_edge` 32-34; `green_ground_and_chair` 35-36; `blue_blocks_and_wall_mark` 37-40; `dense_green_and_corner` 41-42; `framed_shapes_and_corners` 43-46; `wall_ends` 47-50; `purple_lattice_floor` 51; `banded_walls` 52-57; `shapes_over_lattice` 58-60; `stone_wall_and_entrance` 61-62; `zigzags_chair_and_ladder` 63-66; `more_banded_walls` 67-71; `entrance_speckles_and_wall` 72-74; `blue_building_pieces` 75-77; `chevrons_and_door` 78-80; `checks_counter_and_signs` 81-87; `blue_pieces_and_fills` 88-95. Their colours: `figure_colours` 0-9; `figure_and_block_colours` 10-26; `road_and_ground_colours` 27-46; `wall_and_floor_colours` 47-74; `building_and_fill_colours` 75-95.

## What the maps draw with it

Counted in the tile layers of maps 7, 13, 15 and 21 as each comes off the disk, loaded by the game's own `enter_map`; a map changes in play.

- 4,096 squares (all 32 x 32). 74 of the 96 tiles are in a layer. Of the 22 in none, 1-6, 8-9 are drawn by the game's code (the figures, the bag, the sign, the other parties); 33 by a class 4 record, map 13's opened safety cabinet (map-13 `$3C76`), and 13 are in no class 4 record either: 10-11, 27, 31, 36, 42, 45-46, 65, 78, 81, 84, 90. A map's own code could still draw them. 4 bitmaps are blank, all zero bytes: 0, 11, 31, 84.
- The commonest: tile 51 (1,806 squares), tile 56 (243 squares), tile 35 (231 squares), tile 74 (219 squares).
- Drawn off the edge of the map (the record's byte `+$33`, engine `draw_square` `$0B5E`): tile 0 on maps 13 and 15; tile 35 on maps 7 and 21.
- Loot bags (class 5), drawn as tile 5 whatever the layer holds (engine `$0B68`): 8 on map 13, 1 on map 15.
- Squares of class 4, which draw the tile in byte 1 of their record (AND `$7F`, engine `$0B8E-$0B97`) in place of the layer's: 1 on map 15, 2 on map 21.
- No layer and no class 4 record names a tile above 95, though `draw_tile` would draw one (tiles 96-127 would show the colour table and what follows it as bitmaps).

## Shared with the other sets

- Tiles 0-8 are the same bytes, bitmap and colours, in all nine sets: 0 blank, 1-6 the creatures and the loot bag 5 (the encounter figures, engine `creature_tiles` `$5BF5`), 7 the party, 8 the radiation sign.
- Tile 9, which marks the player's other parties, is the version of sets 1, 2, 3, 4, 5, 7 and 8; sets 0 and 6 have the other.
