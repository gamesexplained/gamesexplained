# Final Battle — verified technical facts

The level's second load, `$4E00-$F53F`, over its title load. Every
address here is this part's. Unless marked *live*, a fact comes from the
code in `work/game.vsf`, Final Battle in play. The code is Central
Park's (`parts/central-park/facts.md`), reassembled at other addresses;
what follows is where things are and what differs.

## Layout

- Scenes: 39 pointers at `$4DAA`, in the title load with the scene
  header (`$4D67`), and one more after them that marks the end of the
  pool; the pool `$4DFA-$7EC2`, scene 0 lies in the title load, from
  `$4DFA`, 37 pictures and 2 composites. `RelocateScenePointers`
  (`$7EC3`) starts the code, as in Central Park.
- Where Central Park's routines are: `EngineEntry` `$8361`,
  `RenderScene` `$7F06`, `CompileCollision` `$AA6D`,
  `DecodeSpriteMaskRle63` `$B05C`, `DamagePlayer` `$A65C`.
- Frames: 124 pointers at `$B714`, the records `$B80C-$C15A`.
- Packed sprites: 162 pointers at `$C1F9`, each plus `$01F9` (modulo
  65536) the address of its record, and the records `$C33D-$DCCC`. The
  enemy of an area may be drawn with an extra sprite, a picture of its head and body for each pose that takes the place of the frame's first piece: the high
  nibble of the area's entry in the enemy table at `$A79C` picks one of
  the eight pointers at `$DCCD`, none or one of two groups of 40 packed
  images, at `$E4A4` and `$DD1E`. 18 unpacked images of 64 bytes from
  `$EDD8` are drawn as they are by the frames whose header has bit 5
  set.
- Panel pictures: 17 pointers at `$F258`, to `$3F40` in the engine and 6
  pictures at `$F27A-$F45F`.
- The walls of the area on screen are compiled into the zeros from
  `$F460` to the end of the load.

## Rooms

- 2 areas have a scene in the title load's area slots. Exits: 4 records
  in parallel tables from `$86E6`. Conditions from `$91A8`, walls in
  their packed form from `$91DE`.
- Entrance animations: none.
- 5 object records from `$B1ED`, ending with `$FF` at `$B233`; 46 script
  commands through the table at `$9341`.
- `ResolveLevelCompletion` (`$8509`) asks for no items and takes none
  away; the game ends instead in the ending below, whose loop never
  returns.

## What this level adds

- Area 1, the room with five candles: object record 0 raises a panel
  (flag `$03E9`), record 1 is the lock, which asks for four digits set
  with the joystick and opens only to the code at `$0297`-`$029A`
  (`ObjectEnterCode`, `$B327`), and record 2 brings Kunitoki in and puts
  the candles out (`$B3ED`). No enemy enters area 1 until item 16 is
  held.
- The candles: taking anywhere in area 1 (record 3, `$B234`) lights or
  puts out the candle whose zone the player stands in (`$B2D7`), 500
  points each; lit candles flicker (`$925A`). Knocking Kunitoki down
  while he stands inside the candles with all five lit (`$9CFF`) starts
  the ending (`$9CC2`, `$B271`); when he gets up again they go out
  (`$A3FC`).
- The ending: `PlayEnding` (`$8CA5`) adds 50,000 to the score, 5,000 at a time in ten steps,
  and copies the score and clock into TOTAL SCORE and TOTAL TIME. Taking
  the spirit with item 16 selected (record 4, `$B430`) clears the screen
  and prints CONGRATULATIONS, YOU HAVE CAPTURED THE SPIRIT OF THE EVIL
  SHOGUN KUNITOKI, MAY IT NEVER AGAIN BE UNLEASHED (`$8D0F`);
  `EndingLoop` (`$8F58`) never returns.
