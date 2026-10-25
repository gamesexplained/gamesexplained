# The Office — verified technical facts

The level's second load, `$4E00-$F869`, over its title load. Every
address here is this part's. Unless marked *live*, a fact comes from the
code in `work/game.vsf`, The Office in play. The code is Central Park's
(`parts/central-park/facts.md`), reassembled at other addresses; what
follows is where things are and what differs.

## Layout

- Scenes: 122 pointers at `$4D97`, after the scene header (`$4D54`)
  in the title load; the first 52, and the low byte of the 53rd, lie in
  the title load, the rest in this load from `$4E00`, and one more after
  them that marks the end of the pool; the pool `$4E8D-$83A1`, 90
  pictures and 32 composites.
  `RelocateScenePointers` (`$83A2`) starts the code, as in Central Park.
- Where Central Park's routines are: `EngineEntry` `$8840`,
  `RenderScene` `$83E5`, `CompileCollision` `$B109`,
  `DecodeSpriteMaskRle63` `$B6F8`, `DamagePlayer` `$AD03`.
- Frames: 106 pointers at `$BBD8`, the records `$BCAC-$C5C5`.
- Packed sprites: 162 pointers at `$C786`, each plus `$0786` (modulo
  65536) the address of its record, and the records `$C8CA-$E259`. The
  enemy of an area may be drawn with an extra sprite, a picture of its head and body for each pose that takes the place of the frame's first piece: the high
  nibble of the area's entry in the enemy table at `$AE38` picks one of
  the eight pointers at `$E25A`, none or one of two groups of 40 packed
  images, at `$E2AB` and `$EA52`. The pointers that lead to the unpacked
  images are for kinds no area's enemy has. 13 unpacked images of 64
  bytes from `$F2C3` are drawn as they are by the frames whose header
  has bit 5 set.
- Panel pictures: 17 pointers at `$F603`, to `$3F40` in the engine and 5
  pictures at `$F625-$F7B9`; the last, item 16's, points at `$F7BA`, the
  start of the wall buffer, and leads to no picture.
- The walls of the area on screen are compiled into the zeros from
  `$F7BA` to the end of the load.

## Rooms

- 15 areas have a scene in the title load's area slots. Exits: 30
  records in parallel tables from `$8BCF`. Conditions from `$9246`,
  walls in their packed form from `$962E`.
- Entrance animations: arriving by exit 15 plays kind 3 for 8 of the
  player's animations (the count drops each time one ends), by exit 12
  kind 2 for 4, by exit 27 kind 3 for 8 (`$8F0D`).
- 5 object records from `$B889`, ending with `$FF` at `$B8CF`; 49 script
  commands through the table at `$9926`.
- Finishing the level needs no items and takes none away.

## What this level adds

- The code: object record 0 in area 3 (`ObjectShowCode`, `$B8EF`) prints
  the four digits at `$0297`-`$029A` in the panel's second box. After a
  GAME OVER in this level `CopyClockToCode` (`$B922`) copies the clock
  into them again.
- The helicopter in area 14: it loops four times and flies away (event
  21, `$A2CB`); taking hold of it less than 8 pixels across from it
  (object record 4, `$B8D0`) carries the player off with it
  (`CarryPlayerWithActor`, `$9869`).
- Falls: command 48 in areas 10 to 13 (`$9B12`) drops the player to Y
  `$BD` or a little past it, in steps of 8, command 47 in areas 13 and
  14 (`$9B6E`) by 48 pixels, which in steps of 8 ends after 56, and both
  kill (`FallPlayer`, `$9B7A`). Command 49 in area 9 (`$9BD9`) shuts the
  exits while it is touched.
- Walls that open: area 5's first wall once item 17 is held (`$8EA6`),
  area 9's once item 20 is held (`OpenFirstWall`, `$B919`).
