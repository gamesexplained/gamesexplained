# The intro: facts

File 1 of the copy studied. Every fact names the routine or table it
comes from, in this part's listing.

## Memory

| Range | What |
|---|---|
| `$0800`-`$17FF` | sprite shapes: `$20` the rolling dot, `$22`-`$39` Bond walking (eight frames of three stacked sprites), `$3A`-`$3F` Bond turning, `$40`-`$45` the six pieces of the Domark logo, `$46`-`$48` the sparkles; `$21` and `$49`-`$5F` are never pointed at |
| `$1800`-`$1BFF` | the credits' character set, 128 glyphs, copied to `$4800` |
| `$2000`-`$3F3F` | the gun barrel, a multicolour bitmap, copied to `$6000` |
| `$8000`-`$801A` | `copy_tune_start`: copies the tune to `$E000` and starts the intro |
| `$8500`-`$8EFF` | the tune, the James Bond theme (heard by the contributor): three note lists |
| `$9000`-`$9B9F` | the credits: printer, 85 entries (`credit_lines`), their strings, the title rows |
| `$A000`-`$AA82` | `speech_play` and its samples |
| `$B000`-`$B9FF` | a hires fragment with "A VIEW TO A KILL" lettering that nothing shows |
| `$C000`-`$CEFF` | the intro's code, its interrupt handler at `$CC00` and the music driver (`$C640`-`$C7B5`, state at `$C600`) |

## Start and interrupts

- The hand-over at `$8020` blacks the border and background, calls GETIN
  once, ignores the result and jumps to `$8000`, which copies the tune from
  `$8500`-`$8EFF` to the RAM under the KERNAL at `$E000`-`$E9FF` and jumps
  to `intro_init` (`$C5A0`).
- `irq_handler` (`$CC00`, installed at `$C5B5`) takes the raster interrupt
  only (`$D01A` = 1) and dispatches on `$0313`: 0 music only, 1 the gun
  barrel (`irq_mode1`, `$CC30`), 2 the credits (`irq_mode2`, `$CCD0`). Every
  mode ends in `irq_music` (`$CCF7`), and every interrupt goes on to the
  KERNAL's `$EA31`.
- Nothing in the part reads the joystick or loads another part (`opcodes.py
  --refs $DC00`, `$DC01`). At the end (`$C4A7`-`$C4B5`) it puts `$0314` back to
  `$EA31`, silences the SID and loops in `sparkle_loop` (`$C476`) for good.

## The running order

In frames of a whole-part run in `kit/c64/cpu6502.js` (no bad lines, so the
real machine runs a little longer):

| Frame | What |
|---:|---|
| 14 | two white dots roll across the screen (`rolling_dots`, `$C000`) |
| 226 | the barrel is wiped in from the right (`white_wipe`, `$C100`) |
| 269 | it scrolls left while Bond walks in (`barrel_step`, `$C809`; `bond_step`, `$C200`) |
| 551 | the gunshot (`gunshot`, `$CABC`) |
| 559 | blood runs down (`blood_step`, `$C840`) |
| 782 | the screen shakes (`shake`, `$C900`) |
| 1053 | the speech (`speech_play`, `$A000`) |
| 1163 | the picture dissolves (`speech_and_fade`, `$CA80`; `bitmap_mask`, `$CA50`) |
| 1215 | the Domark logo flies together from six sprites (`logo_assemble`, `$C430`) |
| 1485 | "D O M A R K / presents you / as / JAMES BOND 007" (`title_print`, `$90A0`) |
| 1850 | the credits begin to scroll (`credits_scroll`, `$C54E`) |
| 5171 | the end, about 103 s in |

- The barrel scrolls by fine scroll one pixel every two frames, over two
  VIC banks double-buffered: `scroll_copy` (`$CD00`) and `swap_bank`
  (`$C170`) move the picture two cells per swap, and `barrel_colour`
  (`$CE00`) whitens the columns as they come in.
- The gunshot is voice 3's noise at frequency `$BAAA`, played with
  interrupts off. The blood is an EOR of one bitmap line with `$55` every
  second frame, turning white pixel pairs red, 192 lines in all.
- 85 credit entries are stored and 84 printed (`CMP #$54` at `$C4A3`), a new
  line every 40 frames.

## Music

- A three-voice driver of pulse waves (`$C640`-`$C7B5`). A note is three
  bytes, frequency high, frequency low and length (`voice_step`, `$C723`).
- The notes step after three frames, then two, in turn: 20 steps a second
  on PAL (`tune_tick`, `$C6AB`). Vibrato adds 0, 4, 8 or 12 to the low
  frequency byte each frame (`$C798`). Voice 1 alone goes through the
  low-pass filter (`$C66D`-`$C67E`).
- The driver reads its notes with `$01` = 0, all RAM (`$C773`), and
  restarts the tune when voice 1 reaches `$E1EC` (`$C786`). One pass is
  5,106 ticks, about 102 s.
- `music_save` (`$C1B0`) and `music_restore` (`$C1C0`) park the driver's
  state at `$9F00` during the gunshot and the speech.
- The driver's bytes `$C621`-`$C7FE` are the same, at the same addresses,
  in City Hall, and City Hall's `$E000`-`$E977` is this tune.

## Speech

`speech_play` (`$A000`) plays one bit at a time by switching the SID's
volume, `$D418`, between 0 and 15. Its data is a length word at `$A090`
and samples at `$A092`-`$AA81`; in the simulator it ran 2,149,012 cycles
(about 2.2 s, some 9,400 bits a second) with 20,355 writes to `$D418`.
`$A453`-`$A715` is zeros, a silence of about 0.6 s. It runs with BASIC
banked out (`$01` = `$36`, `$CA90`).

## Left from an older crack

- `$8020`-`$802D` is a patch of 14 bytes over the start of another group's
  title and menu routine. The rest of it is still in the file and never
  runs: its code (`$802E`, `$80A5`), its title screen at `$8100`-`$84FF`
  ("THE DYNAMIC-DUO PRESENTS … BROKEN BY THE DARK-ANGLE & THE EXECUTOR")
  and its menu at `$8F00`-`$8FFF` ("1) SEE OPENING 2) PARIS-CHASE 3) CITY
  ESCAPE 4) SILICON MINE 5) FINALE"), whose loader asks for files named
  `P*`, `C*`, `S*` and `F*`.
- Other code nothing reaches: `$9A00` (it sets the BRK and NMI vectors to
  `$9A2A`, ten bytes past its own return), `$9D00`, `$C4BB`, `$C500`,
  `$C5C3`.

## The credits that sometimes never scroll

`credits_setup` (`$CB50`) writes `$97` to `$D011`, whose top bit is bit 8
of the raster line the interrupt is asked for: line `$1F0`, which a PAL
screen never reaches. The only thing that clears it is the read, AND and
write of `$D011` at `$C540`, and a read of that bit gives the line the
beam is on. If `$C540` runs while the beam is below line 255, the bit is
written back set, no raster interrupt comes again, and the credits, the
music and everything else driven from `irq_handler` stop.

Live, 30 September 2026, four boots with the start moved by a tenth of a
second each time: three read `A` = `$17` at `$C545` and scrolled the
credits (100 calls of `credits_scroll` in 15 s); one read `$97`, at raster
line 38 after the store, and `credits_scroll` never ran.
