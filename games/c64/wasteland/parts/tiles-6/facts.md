# Tile set 6 — verified technical facts

The tiles the map window draws map 12 with, unpacked to `$D000-$DD7F` when the party enters it. It is on side 3 of the disks, as the set is. Every address here is the engine's, which lies beneath, or this set's.

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
  unpack entry 6 of the tile-set directory, T35/L12, to `$D000` with a limit of
  `$DE00` (`unpack_tile_set`, `$2722`), keeping `$DD80-$DDFF`, the engine's scroll
  copier, on the stack meanwhile.
- The groups of tiles, by their labels: `blank_tile` 0; `figures` 1-6; `party_figure` 7; `radiation_sign` 8; `other_party_figure` 9; `bushes_and_crater` 10-13; `diagonal_road_edges` 14-15; `blue_block_edges` 16-18; `flags_tufts_and_cacti` 19-21; `pond_shores` 22-23; `rubble_and_corner_marks` 24-27; `purple_cracked_blocks` 28-29; `road_edges_and_ground` 30-36; `blue_cracked_blocks` 37-40; `purple_wall_pieces` 41-43; `road_corners` 44-47; `pond_water` 48-51; `blank_and_entrances` 52-60; `road_edges` 61-64; `purple_building_walls` 65-76; `blue_building_walls` 77-88; `ground_and_fills` 89-95. Their colours: `figure_colours` 0-9; `ground_and_shore_colours` 10-36; `building_and_road_colours` 37-64; `wall_colours` 65-88; `ground_fill_colours` 89-95.

## What the maps draw with it

Counted in the tile layers of map 12 as it comes off the disk, loaded by the game's own `enter_map`; a map changes in play.

- 4,096 squares (64 x 64). 78 of the 96 tiles are in a layer. Of the 18 in none, 1-9 are drawn by the game's code (the figures, the bag, the sign, the other parties); 12 by a class 4 record, map 12's land-mine crater (map-12 `$4E91`), and 8 are in no class 4 record either: 13, 27, 32, 48-50, 52, 95. A map's own code could still draw them. 6 bitmaps are blank, all zero bytes: 0, 13, 27, 32, 52, 95.
- The commonest: tile 90 (680 squares), tile 0 (337 squares), tile 62 (314 squares), tile 64 (310 squares).
- Drawn off the edge of the map (the record's byte `+$33`, engine `draw_square` `$0B5E`): tile 35 on map 12.
- No layer and no class 4 record names a tile above 95, though `draw_tile` would draw one (tiles 96-127 would show the colour table and what follows it as bitmaps).

## Shared with the other sets

- Tiles 0-8 are the same bytes, bitmap and colours, in all nine sets: 0 blank, 1-6 the creatures and the loot bag 5 (the encounter figures, engine `creature_tiles` `$5BF5`), 7 the party, 8 the radiation sign.
- Tile 9, which marks the player's other parties, is the version of sets 0 and 6; sets 1, 2, 3, 4, 5, 7 and 8 have the other.
