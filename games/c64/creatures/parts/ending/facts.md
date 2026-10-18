# The ending — verified technical facts

Side B's `CJ`, stage 10, loaded to `$5800-$8CFF` after torture chamber 3
and started at `$7D6A`: a text screen, then three animated scenes. Every
address here is this part's; routines named with an address outside it
are the engine's (`parts/engine`). Unless marked *live*, a fact comes
from the code in `work/entry.vsf`, stopped at `$7D6A`.

## The text screen

- `ending_start` (`$7D6A`) brings in the engine's text characters from
  `$D000` (memory swap 6) and inverts them, so each letter is a hole that
  shows the background, then prints "GAME COMPLETE" in big letters, three
  paragraphs (`text_story_1-3`, `$7BE7`, `$7C74`, `$7CD6`) and "THE END".
- "WHY NOT USE THE CHEAT MODE NEXT TIME" (`text_cheat_hint`, `$7D2D`)
  is printed only when the cheat is off: the code at `$7DE6` looks for
  its three NOPs at engine `$1CA0`.
- Until fire, the background cycles through eight colours, which the
  letters show.
- *Live*, 14 October 2026: `reference/ending-text.png`, made with the text
  font poked in, since the route's snapshot had none at `$D000`.

## The scenes

- Fire starts the ending's tune (`ending_tune`, `$88C5`) and the scenes
  in turn (`end_scenes`, `$8018`), each with its own raster routines
  that split the screen into bands of colour and play the music
  (`frame_music`, `$8009`).
- The village (`scene_village`, `$8022`): Clyde walks in, turns and
  beckons three times, and walks off to the right; the posse of seven
  fuzzies follows, and one straggles across alone.
- The rave (`scene_rave`, `$8074`): Clyde waits by his shack, beckons four
  times, the gang walks in from the left into the shack and Clyde follows.
  Sprite 0, orange stripes behind the log wall and in front of the other
  sprites, hides the fuzzies as they pass the gaps in the logs (*live*:
  turning it off showed them).
- The pair (`scene_pair`, `$8092`): after 250 frames of the shack, Clyde
  and his friend come out, the gang leaves to the left, the two turn to
  each other and five hearts rise between them, each bursting into a
  sparkle; then they walk back in.
- A small animation engine runs each sprite (`anim_all`, `$8249`): kind 0
  still, 1 a loop, 2 back and forth, 3 forward once, 4 backward once.
- `ending_exit` (`$7E6B`) sets the stage to `$FF` with end_flag 1, so the
  game reloads from stage 0 and goes to the high-score check, as after
  the last life.
- *Live*, 14 October 2026: `reference/ending-village.png`,
  `reference/ending-rave.png`, `reference/ending-hearts.png`, and the
  return to the high-score check.
- *Live*, 14 October 2026, from `work/entry.vsf` with fire on the text
  screen: the scenes' loops made 1,060 passes in the village, 499 in the
  rave and 893 for the pair, one a frame, about 21, 10 and 18 seconds.
- The raster interrupt comes through the KERNAL's entry at `$FF48`, since
  the ending keeps the ROM in (`$01` = `$36`): it pushes A, X and Y and
  leaves A 0 and X the stack pointer. `raster_irq` (`$81AC`) saves the
  registers as it finds them, drops the ROM's three pushes (`$81C7`) and
  puts its own back, so the interrupted code gets 0 in A and the stack
  pointer in X. In the page's run of the ending, which matches the
  emulator's pass for pass (`test_end.js`), every interrupt came in a
  wait loop that loads A again and uses neither X nor Y, so nothing is
  lost.

## What nothing uses

- In the file, `frame_music` is DEC `$D020`, a delay and INC `$D020`, a
  band in the border; `ending_start` rewrites it as a call of engine
  `music_frame` before the scenes start.
- `$7E83-$7FFF` are sprite shapes that 377 of 381 bytes match level 1.1's
  file at the same place, and `$751D-$77FF` code and tables that match no
  other file: both left in memory when the file was saved.
- Two sections of the ending's tune, `$8BED` and `$8C36`, are never
  called.
