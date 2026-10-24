# The Basement — verified technical facts

The level's second load, `$4E00-$F8C9`, over its title load. Every
address here is this part's. Unless marked *live*, a fact comes from the
code in `work/game.vsf`, The Basement in play. The code is Central
Park's (`parts/central-park/facts.md`), reassembled at other addresses;
what follows is where things are and what differs.

## Layout

- Scenes: 121 pointers at `$4DB4`, after the scene header (`$4D71`)
  in the title load; the first 38 lie in the title load, the rest in
  this load from `$4E00`, and one more after them that marks the end
  of the pool; the pool `$4EA8-$816C`, 93 pictures and 28 composites.
  `RelocateScenePointers` (`$816D`) starts the code, as in Central Park.
- Where Central Park's routines are: `EngineEntry` `$860B`,
  `RenderScene` `$81B0`, `CompileCollision` `$B10C`,
  `DecodeSpriteMaskRle63` `$B6FB`, `DamagePlayer` `$AD06`.
- Frames: 114 pointers at `$BC8B`, the records `$BD6F-$C625`.
- Packed sprites: 162 pointers at `$C68C`, each plus `$068C` (modulo
  65536) the address of its record, and the records `$C7D0-$E15F`. The
  enemy of an area may be drawn with an extra sprite, a picture of its head and body for each pose that takes the place of the frame's first piece: the high
  nibble of the area's entry in the enemy table at `$AE3B` picks one of
  the eight pointers at `$E160`, none or one of two groups of 40 packed
  images, at `$E1B1` and `$E9D9`. The pointers that lead to the unpacked
  images are for kinds no area's enemy has. 15 unpacked images of 64
  bytes from `$F180` are drawn as they are by the frames whose header
  has bit 5 set.
- Panel pictures: 17 pointers at `$F540`, to `$3F40` in the engine and 8
  pictures at `$F562-$F7E9`; the last, item 16's, points at `$F7EA`, the
  start of the wall buffer, and leads to no picture.
- The walls of the area on screen are compiled into the zeros from
  `$F7EA` to the end of the load.

## Rooms

- 15 areas have a scene in the title load's area slots. Exits: 39
  records in parallel tables from `$89AE`. Conditions from `$8FF3`,
  walls in their packed form from `$94BF`.
- Entrance animations: none.
- 16 object records from `$B88C`, ending with `$FF` at `$B96C`; 53
  script commands through the table at `$9967`.
- Finishing the level needs no items and takes away items 13 and 14.

## What this level adds

- Area 3's hazard (`$97D2`): the code moves the second actor itself, 4
  left and 1 down a tick, and kills the player inside a reach given by
  two tables of twenty limits (`$98AB`, `$98BF`), unless the player's
  action is `$0C`.
- Area 13's actor (`$9850`) steps toward a player who comes near and
  lunges for 44 energy, until item 18 is taken (object records 13 and
  14, `$B997`, which need item 14 selected after it has turned green).
- Item 14 turns green in area 12: object records 11 and 12 (`$B96D`) set
  flag `$03EB` with item 14 selected, and kill the player who tries them
  with any other item.
- Deadly walls: command 47 in area 6 (`$9A00`) flashes the player
  through eight colours and kills them; command 48 in area 14 (`$9A3D`)
  lets the player leave only with item 17, which object record 15 gives
  with item 13 selected, opening the area's first wall (`$B987`);
  commands 49 to 53 in area 8 (`$9B8C`-`$9B9C`) are a fall that kills
  once it has gone past 30 pixels: in steps of 8 or more, after 32 or
  more.
- `CopyClockToCode` (`$B9B2`): as the level ends, after
  `SaveLevelState`, the clock's minutes and seconds are copied into
  `$0297`-`$029A`, the code that The Office shows and the Final Battle
  asks for.
