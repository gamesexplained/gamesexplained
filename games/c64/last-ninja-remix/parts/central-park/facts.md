# Central Park — verified technical facts

The first level's second load, `$4E00-$FEFF`, over its title load. Every
address here is this part's. Unless marked *live*, a fact comes from the
code in `work/game.vsf`, Central Park in play. The engine underneath is
`parts/engine`; the later levels' code is this level's, reassembled at
other addresses, and their facts give only what differs.

## Layout

- Scenes: 118 pointers at `ScenePointers` (`$4E27-$4F12`), each with bit
  15 set for a picture and clear for a composite, the rest an offset from
  the scene base `$4DE4`; the pool `$4F15-$8A0D`, 85 pictures and 33
  composites, end to end. `RelocateScenePointers` (`$8A0F`) subtracts
  the relocation word from every pointer once, then writes an `RTS` over
  its own first instruction: as loaded `$8A0F` is `LDA #$00`, in play
  `RTS`.
- The level's code from `$8A0F`, with its tables among it; animations
  `$C2C4-$C4C1` (32 scripts) and eleven more between the frames; frames:
  106 pointers at `FramePointers` (`$C4C2-$C595`) to the frame records.
- Packed sprites: 162 pointers at `SpriteSourcePointers`
  (`$CE54-$CF97`), each plus `$0E54` the address of its record, and the
  records `$CF98-$E927`, part of them in the RAM under the I/O; two
  groups of 40 more at `AuxCompressedSpriteGroup1` (`$E979`) and
  `AuxCompressedSpriteGroup2` (`$F1B2`), each word an offset from its
  group, biased by `$C000`. The enemy of an area may be drawn with an extra
  sprite, a picture of its head and body for each pose that takes the place of the frame's first piece: the high nibble of the area's entry in
  `enemy_area_selector` (`$B67F`) picks one of the eight pointers at
  `AuxSpriteGroupPointers` (`$E928`), none or one of the two groups. The
  other five pointers lead to the unpacked images at `$F920`, kinds no
  area's enemy has; frames whose header has bit 5 set draw those images,
  14 of 64 bytes, as they are.
- Panel pictures: 17 pointers at `UiImagePointers` (`$FCA0`) to the
  pictures of the items, four cells by two (size byte `$42`), at
  `$FCC2-$FEF8` and the engine's `$3F40`; the last, item 16's, points at
  `$FEF9`, the start of the wall buffer, and leads to no picture.
- The walls of the area on screen: `CompileCollision` (`$B950`) writes
  them from `$FEF9`, six bytes a wall, at most 29 and a two-byte end, up
  to `$FFA8`.

## Rooms

- 18 areas. Each has a list of the pictures an actor passes behind
  (pointers at `$99D4`; four bytes each: a scene, a depth, a column and a
  row) and a list of walls in a packed form (`area_collision_source_00`,
  `$9D8A`, and on), which `CompileCollision` expands into fixed records
  when the player enters: chains of segments with a start, ends and
  slopes, and an optional script command a wall sets when touched.
- Exits: 37 records in parallel tables from `transition_area` (`$9330`),
  the first giving the area each leads to; `$FF` (exits 34 and 36) leads
  out of the level, to the check for the items it needs (`$02AF`).
- Entrance animations: one, at `$96A6`: arriving by exit 2 plays kind 1
  with a count of 15, one taken off each time the player's animation ends
  (`$A08A`): 13 steps of 8 in Y, one last animation, then the end.
- `RenderScene` (`$8A52`) draws the area's scene tree into the 30 by 18
  cell window, clipped, with the colour swaps and mirroring its records
  ask for.

## Objects, scripts and enemies

- 15 object records of 14 bytes from `object_record_00` (`$C0D0`),
  ending with `$FF` at `$C1A2`: the area, a box the player must stand in,
  scene and routine pointers, the item, how it is taken and the heading
  the player must face. The engine that reads them steps 14 bytes at a
  time and compares the area, the item and the position.
- Script commands: 46 handlers through `ScriptDispatchReturnTable`
  (`$A11E`), entered with an `RTS` on an address built from the table; a
  wall's command byte picks one.
- Enemy energy: `RebuildEnemyMeterFromElapsedTicks` (`$B3D6`) sets an
  area's enemy back to `min(44, max(0, ((now - then) mod 65536) / 32 - 2))`
  from the tick pair `$F0:$E2` and a time kept for the area
  (`$0175,X` and `$0187,X`); `$91F4` starts all 30 at 44.
- `DamagePlayer` (`$B54A`) takes A from the player's energy `$0229`,
  stopping at zero; only at zero does it set the death latch `$B6` and the
  falling action.
- `TestProjectileCollisionBox` (`$B767`): a projectile hits when it is
  less than 6 across and less than 8 up or down from its target.
- To finish the level the player needs items 2, 3, 4 and 9
  (`NextLevelRequiredObjectSlots`, `$96FB`); finishing takes away items
  5, 6 and 7.

## Sprites

- `DecodeSpriteMaskRle63` (`$BF3F`) unpacks a record into the cache at
  `$02C0-$02FE`: `$68` escapes the next byte, `$69` to `$6F` stand for one
  to seven zeros, every record gives exactly 63 bytes.
- `SelectSpriteSlotBuffer` (`$BEC1`) picks a slot's buffer from the bases
  `$0C00`, `$0C40`, ... `$0DC0`, adding `$0200` for the other half, so the
  frame being built is never the one on show.

## Live tests

- The sprite decoder, run on records 0, 1, 100, 159, 160 and 161 and the
  first and last of both extra groups, returned 63 bytes each, matching an
  independent unpacking, with the RAM under the I/O read for the records
  there.
- `DamagePlayer` with energy and damage (10, 3), (10, 0), (10, 10),
  (10, 11), (0, 0), (0, 3), (255, 254) and (255, 255): the result was the
  difference stopped at zero, and the death latch was set only for a zero
  result.
- `TestProjectileCollisionBox` on ten pairs either side of each limit:
  hits for less than 6 across and 8 up or down, misses at the limits.
- `CompileCollision` for all 18 areas: 264 records, matching an
  independent expansion byte for byte; the largest area gives 29 walls.
- `RebuildEnemyMeterFromElapsedTicks` on sixteen cases at the floor, the
  steps, the cap and the counter's wrap: the formula above.
- The first command of each of the eleven late animations, run to
  `$A8C3`: the control, delay, frame and next pointer each matched the
  parsed record.
