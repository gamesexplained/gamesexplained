# Tile set 1 — verified technical facts

The tiles the map window draws maps 8, 9, 10, 29, 43 and 49 with, unpacked to `$D000-$DD7F` when the party enters one of them. They are all on side 1 of the disks, as the set is. Every address here is the engine's, which lies beneath, or this set's.

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
  unpack entry 1 of the tile-set directory, T35/L12, to `$D000` with a limit of
  `$DE00` (`unpack_tile_set`, `$2722`), keeping `$DD80-$DDFF`, the engine's scroll
  copier, on the stack meanwhile.
- The groups of tiles, by their labels: `blank_tile` 0; `figures` 1-6; `party_figure` 7; `radiation_sign` 8; `other_party_figure` 9; `counter_hut_and_slab` 10-15; `wagons_and_blue_cubes` 16-22; `rock_corner_and_column` 23-26; `grass_and_rock_pieces` 27-34; `sack_and_blue_cube` 35-36; `trees_rubble_and_water` 37-45; `grey_rock` 46-56; `floor_and_rock_edges` 57-60; `stone_and_brick_walls` 61-62; `green_rows_bushes_and_trees` 63-66; `ground_speckles` 67-72; `barriers` 73-75; `water_edges` 76-79; `white_octagon_corners` 80-83; `purple_emblem` 84-88; `rail_track` 89; `bricks_and_solid_fills` 90-95. Their colours: `figure_colours` 0-9; `counter_hut_and_block_colours` 10-26; `grass_and_rock_colours` 27-45; `grey_rock_colours` 46-60; `wall_row_bush_and_tree_colours` 61-72; `water_and_emblem_colours` 73-88; `track_and_fill_colours` 89-95.

## What the maps draw with it

Counted in the tile layers of maps 8, 9, 10, 29, 43 and 49 as each comes off the disk, loaded by the game's own `enter_map`; a map changes in play.

- 6,144 squares (all 32 x 32). 79 of the 96 tiles are in a layer. Of the 17 in none, 1-6, 8-9 are drawn by the game's code (the figures, the bag, the sign, the other parties); 16 by a class 4 record, map 43's cube once opened and emptied (map-43 `$3D44`), and 8 are in no class 4 record either: 0, 12, 35, 43, 72, 74-75, 95. A map's own code could still draw them. 4 bitmaps are blank, all zero bytes: 0, 12, 72, 95.
- The commonest: tile 58 (1,552 squares), tile 70 (1,541 squares), tile 50 (550 squares), tile 71 (307 squares).
- Drawn off the edge of the map (the record's byte `+$33`, engine `draw_square` `$0B5E`): tile 0 on map 29; tile 50 on map 43; tile 58 on maps 10 and 49; tile 70 on maps 8 and 9.
- Loot bags (class 5), drawn as tile 5 whatever the layer holds (engine `$0B68`): 3 on map 9, 3 on map 49.
- Squares of class 4, which draw the tile in byte 1 of their record (AND `$7F`, engine `$0B8E-$0B97`) in place of the layer's: 1 on map 8, 1 on map 9, 4 on map 43, 1 on map 49.
- No layer and no class 4 record names a tile above 95, though `draw_tile` would draw one (tiles 96-127 would show the colour table and what follows it as bitmaps).

## Shared with the other sets

- Tiles 0-8 are the same bytes, bitmap and colours, in all nine sets: 0 blank, 1-6 the creatures and the loot bag 5 (the encounter figures, engine `creature_tiles` `$5BF5`), 7 the party, 8 the radiation sign.
- Tile 9, which marks the player's other parties, is the version of sets 1, 2, 3, 4, 5, 7 and 8; sets 0 and 6 have the other.
