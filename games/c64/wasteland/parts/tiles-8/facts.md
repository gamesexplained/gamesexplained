# Tile set 8 — verified technical facts

The tiles the map window draws maps 16, 17, 18, 19, 20, 22 and 23 with, unpacked to `$D000-$DD7F` when the party enters one of them. They are all on side 4 of the disks, as the set is. Every address here is the engine's, which lies beneath, or this set's.

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
  unpack entry 8 of the tile-set directory, T35/L12, to `$D000` with a limit of
  `$DE00` (`unpack_tile_set`, `$2722`), keeping `$DD80-$DDFF`, the engine's scroll
  copier, on the stack meanwhile.
- The groups of tiles, by their labels: `blank_tile` 0; `figures` 1-6; `party_figure` 7; `radiation_sign` 8; `other_party_figure` 9; `sunken_square_hole_and_panels` 10-14; `orange_blocks` 15-21; `chain_walls` 22-23; `chevron_floor_and_rings` 24-26; `wheel_heads_and_scraps` 27-29; `corner_panels_and_lattice` 30-35; `chair_bolts_and_pennants` 36-38; `stripes_door_and_brown_floor` 39-41; `counter_and_land_mines` 42-44; `table_ladder_and_edges` 45-50; `purple_lattice_floor` 51; `diagonal_and_knots` 52-56; `blue_panels_and_shapes` 57-62; `red_ground` 63-68; `frame_and_band_corners` 69-71; `speckles_and_blue_panels` 72-74; `checks_bars_and_chevrons` 75-79; `cross_bricks_and_stripes` 80-82; `trees_boulders_and_stripes` 83-85; `bands_stripes_and_walls` 86-91; `checkerboard_fills` 92-95. Their colours: `figure_colours` 0-9; `block_and_wall_colours` 10-29; `panel_and_door_colours` 30-50; `floor_and_shape_colours` 51-74; `checks_and_fill_colours` 75-95.

## What the maps draw with it

Counted in the tile layers of maps 16, 17, 18, 19, 20, 22 and 23 as each comes off the disk, loaded by the game's own `enter_map`; a map changes in play.

- 10,240 squares (map 22 64 x 64, the rest 32 x 32). 78 of the 96 tiles are in a layer. Of the 18 in none, 1, 3-9 are drawn by the game's code (the figures, the bag, the sign, the other parties); 33, 43, 44 and 54 by class 4 records, map 16's crashed helicopter, map 18's land mines and map 23's shattered silicon wall, and 6 are in no class 4 record either: 35, 42, 48, 55, 77, 90. A map's own code could still draw them. One bitmap is blank, all zero bytes: 0.
- The commonest: tile 51 (2,579 squares), tile 23 (1,163 squares), tile 63 (958 squares), tile 65 (914 squares).
- Drawn off the edge of the map (the record's byte `+$33`, engine `draw_square` `$0B5E`): tile 0 on maps 17, 18, 19, 20 and 22; tile 63 on map 16; tile 75 on map 23.
- Radiation squares (class 9), drawn as tile 8 from 18:00 to 05:59 and as their layer's tile otherwise (engine `$0B80-$0B8A`): 60 on map 19, 44 on map 20.
- Loot bags (class 5), drawn as tile 5 whatever the layer holds (engine `$0B68`): 1 on map 16, 1 on map 19.
- Squares of class 4, which draw the tile in byte 1 of their record (AND `$7F`, engine `$0B8E-$0B97`) in place of the layer's: 6 on map 17, 1 on map 18, 2 on map 20, 4 on map 22.
- No layer and no class 4 record names a tile above 95, though `draw_tile` would draw one (tiles 96-127 would show the colour table and what follows it as bitmaps).

## Shared with the other sets

- Tiles 0-8 are the same bytes, bitmap and colours, in all nine sets: 0 blank, 1-6 the creatures and the loot bag 5 (the encounter figures, engine `creature_tiles` `$5BF5`), 7 the party, 8 the radiation sign.
- Tile 9, which marks the player's other parties, is the version of sets 1, 2, 3, 4, 5, 7 and 8; sets 0 and 6 have the other.
