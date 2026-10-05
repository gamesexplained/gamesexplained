# Tile set 3 — verified technical facts

The tiles the map window draws maps 1 and 26 with, unpacked to `$D000-$DD7F` when the party enters one of them. They are all on side 2 of the disks, as the set is. Every address here is the engine's, which lies beneath, or this set's.

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
  unpack entry 3 of the tile-set directory, T35/L12, to `$D000` with a limit of
  `$DE00` (`unpack_tile_set`, `$2722`), keeping `$DD80-$DDFF`, the engine's scroll
  copier, on the stack meanwhile.
- The groups of tiles, by their labels: `blank_tile` 0; `figures` 1-6; `party_figure` 7; `radiation_sign` 8; `other_party_figure` 9; `rubble_and_cacti` 10-15; `fenced_plots` 16-23; `ground_and_corner_marks` 24-27; `purple_cracked_blocks` 28-29; `bushes_trees_and_stripes` 30-34; `red_ground` 35-36; `cracked_building_blocks` 37-43; `road_corners` 44-47; `rail_track` 48; `posts_rubble_graves_drums` 49-52; `building_entrances` 53-60; `road_edges` 61-64; `purple_building_walls` 65-76; `blue_building_walls` 77-88; `dark_ground_and_fills` 89-92; `train_tiles` 93-95. Their colours: `figure_colours` 0-9; `plot_and_ground_colours` 10-27; `block_bush_and_red_colours` 28-43; `road_and_entrance_colours` 44-64; `building_wall_colours` 65-88; `fill_and_train_colours` 89-95.

## What the maps draw with it

Counted in the tile layers of maps 1 and 26 as each comes off the disk, loaded by the game's own `enter_map`; a map changes in play.

- 5,120 squares (map 26 64 x 64, the rest 32 x 32). 77 of the 96 tiles are in a layer. Of the 19 in none, 1-9 are drawn by the game's code (the figures, the bag, the sign, the other parties); 93-95 by class 4 records (93 is the train at the east station, map-26 `$4CCE`), and 7 are in no class 4 record either: 14-15, 40, 59, 75, 81, 87. A map's own code could still draw them. One bitmap is blank, all zero bytes: 0.
- The commonest: tile 36 (1,694 squares), tile 35 (720 squares), tile 25 (601 squares), tile 24 (446 squares).
- Drawn off the edge of the map (the record's byte `+$33`, engine `draw_square` `$0B5E`): tile 35 on maps 1 and 26.
- Radiation squares (class 9), drawn as tile 8 from 18:00 to 05:59 and as their layer's tile otherwise (engine `$0B80-$0B8A`): 54 on map 26.
- Squares of class 4, which draw the tile in byte 1 of their record (AND `$7F`, engine `$0B8E-$0B97`) in place of the layer's: 2 on map 26.
- No layer and no class 4 record names a tile above 95, though `draw_tile` would draw one (tiles 96-127 would show the colour table and what follows it as bitmaps).

## Shared with the other sets

- Tiles 0-8 are the same bytes, bitmap and colours, in all nine sets: 0 blank, 1-6 the creatures and the loot bag 5 (the encounter figures, engine `creature_tiles` `$5BF5`), 7 the party, 8 the radiation sign. On map 26 the map's code exchanges tile 7's bytes with tile 95's for the train ride east or 93's for the ride west, and back (map-26 train_swap_tiles `$4EF9`).
- Tile 9, which marks the player's other parties, is the version of sets 1, 2, 3, 4, 5, 7 and 8; sets 0 and 6 have the other.
