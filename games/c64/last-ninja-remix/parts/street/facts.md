# The Street — verified technical facts

The level's second load, `$4E00-$FFA8`, over its title load. Every
address here is this part's. Unless marked *live*, a fact comes from the
code in `work/game.vsf`, The Street in play. The code is Central Park's
(`parts/central-park/facts.md`), reassembled at other addresses; what
follows is where things are and what differs.

## Layout

- Scenes: 129 pointers at `$4DE4`, after the scene header (`$4DA1`)
  in the title load; the first 14 lie in the title load, the rest in
  this load from `$4E00`, and one more after them that marks the end
  of the pool; the pool `$4EE8-$8555`, 94 pictures and 35 composites.
  `RelocateScenePointers` (`$8556`) starts the code, as in Central Park.
- Where Central Park's routines are: `EngineEntry` `$89F4`,
  `RenderScene` `$8599`, `CompileCollision` `$B233`,
  `DecodeSpriteMaskRle63` `$B822`, `DamagePlayer` `$AE35`.
- Frames: 115 pointers at `$BD9E`, the records `$BE84-$C7DA`.
- Packed sprites: 162 pointers at `$C7EE`, each plus `$07EE` (modulo
  65536) the address of its record, and the records `$C932-$E2C1`. The
  enemy of an area may be drawn with an extra sprite, a picture of its head and body for each pose that takes the place of the frame's first piece: the high
  nibble of the area's entry in the enemy table at `$AF6A` picks one of
  the eight pointers at `$E2C2`, none or one of two groups of 40 packed
  images, at `$E313` and `$EB4C`. The pointers that lead to the unpacked
  images are for kinds no area's enemy has. 13 unpacked images of 64
  bytes from `$F2BA` are drawn as they are by the frames whose header
  has bit 5 set.
- Panel pictures: 17 pointers at `$F5FA`, to `$3F40` in the engine and 8
  pictures at `$F61C-$F8A3`; the last, item 16's, points at `$F8A4`, the
  start of the wall buffer, and leads to no picture.
- The walls of the area on screen are compiled into the zeros from
  `$F8A4` to the end of the load.

## Rooms

- 16 areas have a scene in the title load's area slots. Exits: 40
  records in parallel tables from `$8E69`. Conditions from `$94EB`,
  walls in their packed form from `$977F`.
- Entrance animations: none.
- 15 object records from `$B9B3`, ending with `$FF` at `$BA85`; 46
  script commands through the table at `$9B31`.
- The level asks for items 1 and 10 (`required_items`, `$91F4`): with
  either missing it asks ARE YOU SURE YOU ARE PREPARED FOR THE NEXT
  LEVEL, and a YES leaves without them. Finishing takes away item 11.

## What this level adds

- The crossing lights: `AdvanceCrossingLights` (`$9A3B`), called from
  the main loop, flips the light state `$03EA` between 0 and `$FF` each
  time `$B0` reaches 50, about every four seconds, and redraws the light
  of the area on screen from the table at `$9A78`: six crossings, in
  areas 1, 4, 5, 8, 9 and 11, each with the state in which it shows red
  and its two light scenes (from `$BAC7`).
- The cars: walls in the roads of areas 1, 4 and 8 carry script commands
  35, 36 and 37 (`$9D1A`, `$9D34`, `$9D4E`). Touched while that
  crossing's light shows red (in area 4, green), and only while the
  second actor's Y (`$57`) is zero, each starts the car's animation in
  the second actor's slot and takes `$2C`, 44, from the player's energy,
  as much as a full bar holds.
- Fixed hazards: events 15, 19, 21 and 23 take 44 energy from a player
  less than 11 across and less than 7 up or down from X 124, Y 115
  (`$A3E9`), event 20 the same at X 219, Y 143 (`$A3EF`).
- Area 14: with item 19 taken (flag `$03EB`, object records 10 to 13,
  which need item 11 selected, `$BA86`), four walls carry command 38
  (`$9D68`), which lowers the player 32 pixels and leaves by transition
  variant 2.
- Area 3's first wall opens once flag `$03E9` is set
  (`OpenAreaThreeWall`, `$9168`): its end is set to its start, so it
  stops nothing.
- The entrance rules (`$9154`) set the sprite multicolours to red and
  white in the three areas with a car, and start the actors of areas 5
  and 7, whose attacks `ServiceEnemyBoundaryLatch` (`$9A05`) starts when
  the player touches the walls carrying commands 39 and 40.
