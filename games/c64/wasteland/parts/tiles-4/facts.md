# Tile set 4 — verified technical facts

The tiles the map window draws maps 11, 24, 25, 35, 36, 39, 40 and 41 with, unpacked to `$D000-$DD7F` when the party enters one of them. They are all on side 3 of the disks, as the set is. Every address here is the engine's, which lies beneath, or this set's.

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
  unpack entry 4 of the tile-set directory, T35/L12, to `$D000` with a limit of
  `$DE00` (`unpack_tile_set`, `$2722`), keeping `$DD80-$DDFF`, the engine's scroll
  copier, on the stack meanwhile.
- The groups of tiles, by their labels: `blank_tile` 0; `figures` 1-6; `party_figure` 7; `radiation_sign` 8; `other_party_figure` 9; `chair_and_flag` 10-12; `orange_blocks` 13-21; `grey_rings` 22; `blue_squares_and_rope` 23-30; `door_and_blank` 31-32; `stripes_bars_chair_and_ladder` 33-36; `checks_and_oddments` 37-40; `pit_corner_and_water` 41-45; `grey_rock` 46-50; `lattice_frame_and_rubble` 51-54; `red_floors` 55-58; `bench_and_yellow_line` 59-60; `pit_walls` 61-66; `grey_brick_walls_and_grid` 67-69; `framed_panes_and_rope_end` 70-71; `purple_walls_and_stair_rails` 72-77; `white_brick_walls` 78-83; `machines_and_counter` 84-86; `floors_and_purple_corner` 87-89; `white_bricks_and_fills` 90-95. Their colours: `figure_colours` 0-9; `chair_flag_and_block_colours` 10-21; `water_and_door_colours` 22-36; `rock_and_floor_colours` 37-60; `wall_colours` 61-77; `brick_and_fill_colours` 78-95.

## What the maps draw with it

Counted in the tile layers of maps 11, 24, 25, 35, 36, 39, 40 and 41 as each comes off the disk, loaded by the game's own `enter_map`; a map changes in play.

- 8,192 squares (all 32 x 32). 64 of the 96 tiles are in a layer. Of the 32 in none, 1-6, 8-9 are drawn by the game's code (the figures, the bag, the sign, the other parties); 23, 25, 67, 71 and 81 by class 4 records, map 24's ropes across the sewage and the chasm (map-24 `$3DB4-$3DC9`), and 19 are in no class 4 record either: 11, 32, 37, 39-40, 44, 46-48, 50-51, 75, 77, 80, 86, 91, 93-95. A map's own code could still draw them. 3 bitmaps are blank, all zero bytes: 0, 32, 80.
- The commonest: tile 90 (2,834 squares), tile 58 (2,490 squares), tile 68 (527 squares), tile 57 (280 squares).
- Drawn off the edge of the map (the record's byte `+$33`, engine `draw_square` `$0B5E`): tile 0 on maps 11 and 36; tile 58 on maps 35, 39, 40 and 41; tile 90 on maps 24 and 25.
- Loot bags (class 5), drawn as tile 5 whatever the layer holds (engine `$0B68`): 2 on map 35, 4 on map 36, 1 on map 40.
- Squares of class 4, which draw the tile in byte 1 of their record (AND `$7F`, engine `$0B8E-$0B97`) in place of the layer's: 1 on map 24, 1 on map 25, 6 on map 36, 21 on map 39, 4 on map 40, 10 on map 41.
- No layer and no class 4 record names a tile above 95, though `draw_tile` would draw one (tiles 96-127 would show the colour table and what follows it as bitmaps).

## Shared with the other sets

- Tiles 0-8 are the same bytes, bitmap and colours, in all nine sets: 0 blank, 1-6 the creatures and the loot bag 5 (the encounter figures, engine `creature_tiles` `$5BF5`), 7 the party, 8 the radiation sign.
- Tile 9, which marks the player's other parties, is the version of sets 1, 2, 3, 4, 5, 7 and 8; sets 0 and 6 have the other.
