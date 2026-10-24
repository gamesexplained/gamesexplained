# The Sewers — verified technical facts

The level's second load, `$4E00-$F34A`, over its title load. Every
address here is this part's. Unless marked *live*, a fact comes from the
code in `work/game.vsf`, The Sewers in play. The code is Central Park's
(`parts/central-park/facts.md`), reassembled at other addresses; what
follows is where things are and what differs.

## Layout

- Scenes: 85 pointers at `$4C95`, in the title load with the scene
  header (`$4C52`), and one more after them that marks the end of the
  pool; the pool `$4D41-$759E`, scenes 0 to 9 lie in the title load,
  below `$4E00`, 62 pictures and 23 composites. `RelocateScenePointers`
  (`$759F`) starts the code, as in Central Park.
- Where Central Park's routines are: `EngineEntry` `$7A3B`,
  `RenderScene` `$75E2`, `CompileCollision` `$A091`,
  `DecodeSpriteMaskRle63` `$A680`, `DamagePlayer` `$9C8B`.
- Frames: 128 pointers at `$AB6C`, the records `$AC6C-$B6C3`.
- Packed sprites: 162 pointers at `$B6C4`, each plus `$F6C4` (modulo
  65536) the address of its record, and the records `$B808-$D197`. The
  enemy of an area may be drawn with an extra sprite, a picture of its head and body for each pose that takes the place of the frame's first piece: the high
  nibble of the area's entry in the enemy table at `$9DC0` picks one of
  the eight pointers at `$D198`, none or one of three groups of 40
  packed images, at `$D1E9`, `$D999` and `$E1C1`. The pointers that lead
  to the unpacked images are for kinds no area's enemy has. 25 unpacked
  images of 64 bytes from `$EA32` are drawn as they are by the frames
  whose header has bit 5 set.
- Panel pictures: 17 pointers at `$F072`, to `$3F40` in the engine and 7
  pictures at `$F094-$F2CA`; the last, item 16's, points at `$F2CB`, the
  start of the wall buffer, and leads to no picture.
- The walls of the area on screen are compiled into the zeros from
  `$F2CB` to the end of the load.

## Rooms

- 15 areas have a scene in the title load's area slots. Exits: 31
  records in parallel tables from `$7DCE`. Conditions from `$840C`,
  walls in their packed form from `$8593`.
- Entrance animations: arriving by exit 0 plays kind 4 for 10 of the
  player's animations (the count drops each time one ends), by exit 11
  kind 3 for 8 (`$80DA`).
- 8 object records from `$A811`, ending with `$FF` at `$A881`; 46 script
  commands through the table at `$890E`.
- Finishing the level needs no items and takes away items 10 and 12.

## What this level adds

- The water: `AnimateWater` (`$8821`), called from the main loop by a
  call Central Park's does not make, steps the water of the area on
  screen through scenes 82, 83 and 84 every six ticks, by writing the
  scene number into that area's placement (the table at `$8864`,
  placements from `$A8B5`).
- The traps: in area 4 (`$874F`) a falling block starts when the player
  is between X `$30` and `$7F`, and in area 10 (`$879B`) one crosses the
  room over and over; each takes 2 energy a pass from a player in its
  reach, unless the player's action is `$0C`.
- The guard in area 14 (`$87D5`, his walks chosen by event 12 at
  `$91F7`) kills the player who passes him (`$8804`) until item 10 is
  thrown at him after it has been used in area 13 (`ObjectUseItem10`,
  `$A888`, which sets flag `$03EB`, so item 10 flies as projectile kind
  7 and draws red in the panel).
- Area 5: with item 12 selected, object records 4 to 6 (`$A882`) set
  item 20's flag `$03EC`; then walls carrying command 41 (`$8B6D`) lower
  the player through the opening.
