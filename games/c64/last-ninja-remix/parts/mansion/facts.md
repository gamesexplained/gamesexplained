# The Mansion — verified technical facts

The level's second load, `$4E00-$FB68`, over its title load. Every
address here is this part's. Unless marked *live*, a fact comes from the
code in `work/game.vsf`, The Mansion in play. The code is Central Park's
(`parts/central-park/facts.md`), reassembled at other addresses; what
follows is where things are and what differs.

## Layout

- Scenes: 130 pointers at `$4DAA`, after the scene header (`$4D67`)
  in the title load; the first 43 lie in the title load, the rest in
  this load from `$4E00`, and one more after them that marks the end
  of the pool; the pool `$4EB0-$87E2`, 106 pictures and 24 composites.
  `RelocateScenePointers` (`$87E3`) starts the code, as in Central Park.
- Where Central Park's routines are: `EngineEntry` `$8C86`,
  `RenderScene` `$8826`, `CompileCollision` `$B520`,
  `DecodeSpriteMaskRle63` `$BB36`, `DamagePlayer` `$B11A`.
- Frames: 106 pointers at `$C0B6`, the records `$C18A-$CAC0`.
- Packed sprites: 162 pointers at `$CAE5`, each plus `$0AE5` (modulo
  65536) the address of its record, and the records `$CC29-$E5B8`. The
  enemy of an area may be drawn with an extra sprite, a picture of its head and body for each pose that takes the place of the frame's first piece: the high
  nibble of the area's entry in the enemy table at `$B24F` picks one of
  the eight pointers at `$E5B9`, none or one of two groups of 40 packed
  images, at `$E60A` and `$EE7B`. 10 unpacked images of 64 bytes from
  `$F601` are drawn as they are by the frames whose header has bit 5
  set.
- Panel pictures: 17 pointers at `$F881`, to `$3F40` in the engine and 6
  pictures at `$F8A3-$FA88`; the last, item 16's, points at `$FA89`, the
  start of the wall buffer, and leads to no picture.
- The walls of the area on screen are compiled into the zeros from
  `$FA89` to the end of the load.

## Rooms

- 16 areas have a scene in the title load's area slots. Exits: 26
  records in parallel tables from `$9011`. Conditions from `$965F`,
  walls in their packed form from `$9984`.
- Entrance animations: arriving by spawn record 2 plays kind 1 for 15
  of the player's animations (the count drops each time one ends), by
  record 10 kind 5, which only this level has
  (`AdvanceBoundarySequence`, `$9CCA`): it clears the sequence at once
  and starts animation `$C091`, so its count of 2 is never used
  (`$931E`).
- 6 object records from `$BCC7`, ending with `$FF` at `$BD1B`; 57 script
  commands through the table at `$9D6E`.
- Finishing the level needs no items and takes away item 15.

## What this level adds

- The arrival: the level starts with the player hanging from the
  helicopter (`$92C4`); down or fire lets go (`$9C1F`), and only over X
  `$16` to `$30` does the drop land (`$9BD7`); elsewhere the player
  falls and dies.
- The alarm: walls in areas 3 and 9 carry command 47 (`$9E0F`), which
  sets `$03EA`: the lamps in areas 2, 3, 7, 8 and 9 flash
  (`FlashAlarmLamps`, `$9C5C`, a call The Mansion adds to the main loop)
  and enemies' blows take four times the energy. Object record 2 in area
  8 switches it off (`$BD3A`), but bit 7 of `$03EA` stays set, so the
  blows stay four times as strong.
- The lights: area 10 is drawn dark, with area 11's scene, while flag
  `$03EB` is clear (`$9358`), and the player is drawn brown on it
  (`$B91B`); the switch in area 9 (object records 3 and 4, `$BD1C`,
  `$BD22`) turns them on and off, 500 points each time.
- The rope: command 56 in area 4 (`$9F2F`) climbs the player down with
  item 15 selected, when they face neither heading 3 nor heading 5 and
  `$70` is zero; otherwise it drops them to their death, a fall of 48
  pixels which in steps of 8 ends after 56.
  Commands 48 to 55 in areas 0 and 1 (`$9F65`-`$9FC5`) are falls, most
  of them deadly.
- Area 12: its first wall kills (command 57, `$9E1A`) until object
  record 5 (`$BD28`) moves the area's actor and opens it, for that visit
  only: the walls are compiled afresh on each entry, and nothing opens
  it again.
