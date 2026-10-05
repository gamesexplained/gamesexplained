# Tile set 5 — verified technical facts

The tiles the map window draws maps 38 and 42 with, unpacked to `$D000-$DD7F` when the party enters one of them. They are all on side 3 of the disks, as the set is. Every address here is the engine's, which lies beneath, or this set's.

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
  unpack entry 5 of the tile-set directory, T35/L12, to `$D000` with a limit of
  `$DE00` (`unpack_tile_set`, `$2722`), keeping `$DD80-$DDFF`, the engine's scroll
  copier, on the stack meanwhile.
- The groups of tiles, by their labels: `blank_tile` 0; `figures` 1-6; `party_figure` 7; `radiation_sign` 8; `other_party_figure` 9; `chair_and_blanks` 10-14; `orange_blocks` 15-23; `blanks_frame_and_stripes` 24-30; `door_column_and_helicopter` 31-35; `chair_and_desk_ends` 36-40; `green_stripes_and_rings` 41-45; `desk_sides` 46-50; `purple_lattice_floor` 51; `banded_walls` 52-57; `green_and_blue_shapes` 58-59; `brown_rings_and_bars` 60-62; `red_ground` 63-66; `wall_runs_and_junctions` 67-77; `chevrons_cross_and_band` 78-85; `purple_stripes_and_pillars` 86-89; `white_and_blue_fills` 90-95. Their colours: `figure_colours` 0-9; `chair_and_block_colours` 10-23; `door_desk_and_ground_colours` 24-50; `floor_and_wall_colours` 51-77; `chevron_stripe_and_fill_colours` 78-95.

## What the maps draw with it

Counted in the tile layers of maps 38 and 42 as each comes off the disk, loaded by the game's own `enter_map`; a map changes in play.

- 2,048 squares (all 32 x 32). 49 of the 96 tiles are in a layer. Of the 47 in none, 1-6, 8-9 are drawn by the game's code (the figures, the bag, the sign, the other parties); 66 and 72 by class 4 records, the blown and battered doors of maps 38 and 42 and map 38's rubble, and 37 are in no class 4 record either: 0, 11-14, 18, 24-25, 28-30, 32-34, 37-38, 42, 44-45, 49-50, 62, 73, 75-77, 79, 81-85, 91-95. A map's own code could still draw them. 31 bitmaps are blank, all zero bytes: 0, 11-14, 24-25, 28-30, 33-34, 37-38, 42, 44-45, 50, 62, 73, 75-77, 81, 83-85, 91, 93-95.
- The commonest: tile 43 (396 squares), tile 51 (355 squares), tile 87 (301 squares), tile 56 (113 squares).
- Drawn off the edge of the map (the record's byte `+$33`, engine `draw_square` `$0B5E`): tile 43 on map 42; tile 64 on map 38.
- Radiation squares (class 9), drawn as tile 8 from 18:00 to 05:59 and as their layer's tile otherwise (engine `$0B80-$0B8A`): 16 on map 38.
- Loot bags (class 5), drawn as tile 5 whatever the layer holds (engine `$0B68`): 2 on map 38, 6 on map 42.
- Squares of class 4, which draw the tile in byte 1 of their record (AND `$7F`, engine `$0B8E-$0B97`) in place of the layer's: 1 on map 38.
- No layer and no class 4 record names a tile above 95, though `draw_tile` would draw one (tiles 96-127 would show the colour table and what follows it as bitmaps).

## Shared with the other sets

- Tiles 0-8 are the same bytes, bitmap and colours, in all nine sets: 0 blank, 1-6 the creatures and the loot bag 5 (the encounter figures, engine `creature_tiles` `$5BF5`), 7 the party, 8 the radiation sign.
- Tile 9, which marks the player's other parties, is the version of sets 1, 2, 3, 4, 5, 7 and 8; sets 0 and 6 have the other.
