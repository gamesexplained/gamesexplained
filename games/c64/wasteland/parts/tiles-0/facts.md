# Tile set 0 — verified technical facts

The tiles the map window draws map 0 with, unpacked to `$D000-$DD7F` when the party enters it. It is on side 1 of the disks, as the set is. Every address here is the engine's, which lies beneath, or this set's.

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
  unpack entry 0 of the tile-set directory, T35/L12, to `$D000` with a limit of
  `$DE00` (`unpack_tile_set`, `$2722`), keeping `$DD80-$DDFF`, the engine's scroll
  copier, on the stack meanwhile.
- The groups of tiles, by their labels: `blank_tile` 0; `figures` 1-6; `party_figure` 7; `radiation_sign` 8; `other_party_figure` 9; `town_icons` 10-15; `open_ground` 16-32; `landmarks` 33-45; `green_mountains` 46-59; `water_and_fills` 60-63; `red_mountains` 64-69; `bar_corner_pieces` 70-72; `river_and_lake_banks` 73-76; `river_bridge_and_jeep` 77-86; `white_bars` 87-95. Their colours: `figure_colours` 0-9; `town_icon_colours` 10-15; `open_ground_colours` 16-32; `landmark_colours` 33-45; `green_mountain_colours` 46-59; `water_fill_colours` 60-63; `red_mountain_colours` 64-69; `bar_corner_colours` 70-72; `river_and_lake_bank_colours` 73-76; `river_colours` 77-86; `white_bar_colours` 87-95.

## What the maps draw with it

Counted in the tile layers of map 0 as it comes off the disk, loaded by the game's own `enter_map`; a map changes in play.

- 4,096 squares (64 x 64). 58 of the 96 tiles are in a layer. Of the 38 in none, 1-9 are drawn by the game's code (the figures, the bag, the sign, the other parties); 43, the ruins of Base Cochise, by a class 4 record that module 4 puts on (2,3) (map-00 `$4D50`), and 28 are in no class 4 record either: 0, 10, 15, 24, 34, 39-41, 44-45, 60-61, 63, 70-72, 83-85, 87-95. A map's own code could still draw them. 8 bitmaps are blank, all zero bytes: 0, 10, 24, 34, 44, 70, 83, 85.
- The commonest: tile 31 (543 squares), tile 25 (474 squares), tile 27 (473 squares), tile 32 (464 squares).
- Drawn off the edge of the map (the record's byte `+$33`, engine `draw_square` `$0B5E`): tile 27 on map 0.
- Radiation squares (class 9), drawn as tile 8 from 18:00 to 05:59 and as their layer's tile otherwise (engine `$0B80-$0B8A`): 36 on map 0.
- Squares of class 4, which draw the tile in byte 1 of their record (AND `$7F`, engine `$0B8E-$0B97`) in place of the layer's: 2 on map 0.
- No layer and no class 4 record names a tile above 95, though `draw_tile` would draw one (tiles 96-127 would show the colour table and what follows it as bitmaps).

## Shared with the other sets

- Tiles 0-8 are the same bytes, bitmap and colours, in all nine sets: 0 blank, 1-6 the creatures and the loot bag 5 (the encounter figures, engine `creature_tiles` `$5BF5`), 7 the party, 8 the radiation sign. On map 0 the map's code exchanges tile 7's bytes with tile 86's, the jeep, for the ride along the road, and back (map-00 swap_tiles `$4FCD`).
- Tile 9, which marks the player's other parties, is the version of sets 0 and 6; sets 1, 2, 3, 4, 5, 7 and 8 have the other.
