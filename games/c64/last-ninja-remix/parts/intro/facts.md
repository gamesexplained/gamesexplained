# System 3's intro — verified technical facts

The opening sequence, unpacked from `NINJA INTRO /I+T` and started by
the wrapper at `$53C0` (`JSR $0800`, then `JMP $0340`). Every address
here is this part's. Unless marked *live*, a fact comes from the code in
`work/entry.vsf`, stopped on `$0800`.

- `IntroStart` (`$0800`) maps RAM with the I/O (`$01` = `$35`, kept
  throughout), points the IRQ at `$106C` and the NMI at an `RTI`
  (`$1345`), selects video bank 1 (bitmap `$6000`, screen `$4000`) and
  starts the tune.
- `IntroMainLoop` (`$089B`) calls eight steps a pass, each returning at
  once unless its moment has come: the logo (`$08D6`), the tile channels
  (`$0C19`), the lightning's colours (`$0CF4`), the figure (`$0D7E`), the
  lamps (`$0DB9`), the lightning (`$0DD7`), the vision (`$0E0B`) and the
  city (`$0EEB`).
- The scenes: the logo, LAST NINJA REMIX over a badge with a red ball
  and PRESS FIRE!, for 500 frames; the temple, a seated figure on an
  altar between two lamps with kneeling ninjas in front, 250 frames; the
  figure rises (sprite sequence 1), the lamps go out at its thirteenth
  step, and five flashes of lightning come, 50 frames apart, the second
  redrawing the kneeling ninjas with their heads raised (`$0CB2`); a
  vision of a figure in the window, then a fade to white; the city at
  night with the masked ninja, 250 frames; and the logo again.
- `IntroIrq` (`$106C`) comes twice a frame, at lines `$2F` and `$F7`, and
  waits four lines before its work: from line `$33` the tune, the timers,
  the keys and the credits (`$10C3`), from line `$FB` the sprites and the
  fade to white (`$10D0`).
- Moving pictures are tiles: four channels step through scripts
  (`$17A6`), each step a tile copied into the bitmap (`DrawTile`,
  `$0C79`): the lamps' flames, their smoke, the lightning and the vision.
  The sprites are eight, set by formations (`SetFormation`, `$121E`), each
  with its own animation (`AnimateSprites`, `$125B`), from 63 sprite
  images at `$4400-$53BF`.
- The pictures are stored in pieces and copied into the bitmap: the logo
  in columns 10 to 29 from `$BC43` (`$0985`), the temple whole from
  `$E000` (`$0B5A`), the city in cell rows 4 to 20 from `$903D`
  (`$0F60`), each with its colours.
- Fire on port 2 or the second button leaves the intro (`$0905`-`$0927`),
  once the city has been shown (`fire_allowed`, `$4C`).
- The hidden credits: holding L on the logo (`ScanKeys`, `$1105`, and
  `$1187`) starts a scroller in columns 14 to 25 of cell row 22, the
  badge's SYSTEM 3 strip, between the S and the 3, one character every fourth frame from the PETSCII text
  at `$8002` to its closing `$24`, with the font at `$8425`. While it
  runs the logo stays. The text credits the intro to Stan Schembri
  (programming) and Robin Levy (graphics) and ends with thanks to the
  people at System 3.
- `StartLightning` (`$0DD7`) guards against starting a flash while one
  runs by comparing channel 0's script with 6 where channel 2 runs the
  lightning, so the guard never holds; the 50-frame timer keeps the
  flashes apart instead.
- The tune's driver (`MusicInit` `$B000`, `MusicPlay` `$B003`): three
  voices, each with an order list of patterns; a note is two bytes (its
  length in ticks, its pitch, and its instrument in four bits split
  across them), a tick every eighth frame, the voices ticking on
  different frames. Instruments are 47 bytes from `$B272`: two sounds a
  voice swaps between, vibrato, a pulse sweep, the filter for voice 2 and
  a bend that reads four more bytes from the pattern (one as the note
  starts, the frames before the bend, and three when the bend begins).
- `HandOverToGame` (`$0340`) puts the ROMs back, resets the I/O through
  the KERNAL and loads `NINJA*` (`$03A6`).
- Left over: `OldLoaderStub` (`$0B9F`), which loads a file named L2 to
  `$A000` and copies it to `$D000`, and which nothing calls; a
  `JMP $0800` at `$1346`; source text over the screen, which each
  picture clears before it is shown; and five stretches packed with a
  run-length code (a `$CB`, a count and a byte stand for a run of that
  byte, any other byte for itself), each of which unpacks to bytes held
  elsewhere in the snapshot: `$53C6-$5710` to the source text at
  `$7BF1-$7FFF`, `$5711-$5FFF` to `$8000-$8B2D` (the credits, their font
  and most of the second drawing of the kneeling ninjas), `$AD4D-$AFFF`
  to `$67DA-$6B39`, `$CBE3-$CFFF` to the city's bitmap at `$96DE-$9B5D`,
  and `$FF40-$FFF9`, with the interrupt vectors' six bytes after it, to
  the temple's at `$F9DA-$FF3F`. None of them is unpacked: the copy of
  the temple at `$0B5A` carries the 186 bytes from `$FF40` past the end
  of the bitmap on show, and no other code reads any of them.

## Live tests

- L on the logo: the scroller ran (`$3D` = `$80`), 803 characters in
  3,210 frames, and the temple did not begin while it ran.
- Fire on port 2 held 100 frames on the logo's first showing: the intro
  went on; with `$4C` set to 1, port 2 fire and the second button each
  ended it at `$0B85`.
- The scenes' times: the temple by frame 505, the city by 1,535 and the
  logo again by 1,790.
