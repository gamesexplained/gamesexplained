# Bobsled — verified technical facts

File `B`, `$1000`-`$A6FE`, over the menu. Its start-up copies the sound
engine from `$9D00`-`$A6FF` to `$C000`-`$C9FF`, where it runs
(`copy_engine`, `$1062`); the listing shows those bytes at `$9D00`, their
labels ending in `_src`. Every address here is this part's. Unless
marked *live*, a fact comes from the code in `work/entry.vsf`.

## The course

- 177 stretches of four bytes, then `$FF` (`bs_course`, `$4759`): the far
  view's piece, the near view's, the bend and the map's dots. A stretch
  lasts while the distance's high byte stays the same.
- Eight bends: right-hand ones from stretches 9, 42, 75, 122 and 154,
  which throw the sled up the left wall, and left-hand ones from 21, 60
  and 107. The chute runs under a bridge at stretches 90 to 98 and 137 to
  145. The last seven stretches, near pieces 42 to 48, are the finish
  straight, where the sled steers itself to the middle (`steer_self`,
  `$43CC`).
- The map's trail is 400 dots (`map_dots`, `$88A4`), plotted a stretch's
  share at a time (`plot_dots`, `$4720`).

## The sled

- Speed is 24 bits at `$31`-`$33`, starting at `$180000`. Each frame
  gravity adds 10 to the middle byte on a straight and 2 in a bend, and
  friction takes the sled's distance in whole places from the bend's line
  (`speed_step`, `$43DA`). It is held at `$27FFFF` at most, and a speed
  under `$010000` becomes `$020202`.
- The sled has 31 places across the chute, 0 high on the left wall to
  30 high on the right (`sled_places`, `$4AC6`). Left steers `$68`/256 of a
  place a frame, right `$80`/256; down or fire with neither brakes, `$10`
  off the middle byte a frame while the speed is at least `$0B0000`
  (`steer`, `$4382`). A bend pushes the sled towards its wall
  (`bend_push`, `$4439`).
- Ten frames in a row at a wall, place 0 or 30, is a crash
  (`check_walls`, `$42D3`). The wreck tumbles through five frames; every
  three frames the speed's high byte drops by one, and at 0 the run ends
  with a time of 99.99 (`crash_step`, `$4305`). The course moves on while
  the speed lasts, so a wreck that slides over the finish records the
  clock's time instead (*live*: a crash at stretch 166 at speed `$27`
  recorded " 02.99").

## The clock

`clock_tick` (`$4B80`) counts 60 frames a second, six frames to a tenth,
and shows the frames as a hundredths digit: 0, 2, 4, 5, 7 and 9
(`clock_frames`, `$4C1E`). It stops at 99.99. The time is stored turned
over, so the menu ranks a shorter time higher (`record_time`, `$4DCD`).

## Sound

- The six-slot engine at `$C000`, the same as the other events'.
- The runners' rumble, sound 8, steps through machine code
  (`$C80F`, from the file's `$A50F`) every frame: a random pitch, and a
  random length from 1 to 8 stored through `($F0),3`. The engine's slot
  pointer is at `$80`, not `$F0`, so the length is never set and the byte
  goes to `$878A`, in the far view's sky, a speck in far pieces 21 to 25
  (*live*: `$878A` took values from 1 to 8 during a run).
- The crash's whistle, sound 28 (`snd_crash_whistle_src`, `$A65E`),
  plays on the SID's third voice, and its own mode command sets bit 7 of
  `$D418`, which takes that voice out of the output: the whistle is never
  heard. The bit stays set until the sounds are stopped (*live*: `$C0C8`,
  the engine's copy of `$D418`, held `$8F` after a crash).
- `S` with joystick 2 held down switches every sound off and on
  (`snd_s_key`).
