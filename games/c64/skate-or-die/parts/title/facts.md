# Skate or Die!: Title — facts

The title program: file `$00` at `$4000`-`$51FE` (entered at `$4000` by the
boot), which loads file `$01` (the packed picture) and file `$02` (the
samples), plays Rob Hubbard's title music with a fourth, sampled channel, and
hands over to the shop (file `$03`) through an NMI.

"Traced" means read from the code; "simulated" means observed by running the
title from its hand-over snapshot (`work/entry.vsf`, PC `$4000`) in the kit's
6502 machine (`kit/c64/machine.js`, CIA timers on), with each `load_file`
call served from the disk's own files (`GAME/work/files/<nn>.bin`) by a hook
at `$F230`. The scripts are in `GAME/work/agent-title/` (`sim.js`,
`simlen.js`, `simvib.js`, `simkey.js`).

## Snapshots

- `work/play.vsf` is the title waiting for fire with the music playing (PC
  `$4022`, copied from `GAME/work/sod-title.vsf`). The snapshot first placed
  there, kept as `work/play-loading.vsf`, was stopped inside the loader (PC
  `$F5AE`) while file `$02` was arriving: only `$1000`-`$1A35` of the samples
  were in memory, and neither the raster interrupt nor the music had started.
  The disassembler session for this part was started on that earlier
  snapshot, so its memory still holds the old bytes at `$1A36`-`$30EF`, the
  vectors and the driver's variables; annotations are by address and the
  listing is built from the new `play.vsf`. (traced: registers and memory of
  both snapshots)

## Loads

| Call | File | To | What |
|---|---|---|---|
| `$4166` | `$01` | `$A000` | packed picture, `$117F` bytes |
| `$420C` | `$02` | `$1000`-`$30EF` | seven 4-bit samples, `$20F0` bytes |
| `$4079` | `$03` | `$0880` | the shop, loaded on fire |

No other file is loaded (traced: the three `JSR $F230` are the only calls of
the loader in `$4000`-`$5156`; simulated: the hook saw exactly these three).

## Start-up and screen

- `$4000`: screen blanked (`$D011` bit 4 off), `$01 = $25` (RAM at
  `$A000`-`$BFFF` and `$E000`-`$FFFF`, I/O in). (traced)
- `load_title_picture` `$4160`: `rle_unpack` `$4338` expands file `$01` from
  `$A000` to `$1000`-`$370F`. Format: a count byte `n < $80` is followed by
  `n + 1` literal bytes; `n >= $80` by one byte written `n - $7F` times. The
  result is 8000 bytes of bitmap (copied to `$A000`), 1000 colour-RAM nibbles
  (to `$8400`) and 1000 screen bytes (to `$8000`, and again to `$8800` as a
  pristine copy). (traced; simulated: `$8400`-`$87E7`, `$8800`-`$8BE7` and
  `$A000`-`$BF3F` equal the title snapshot byte for byte)
- `show_title_picture` `$41CD`: border and background black, colour RAM from
  `$8400`, VIC bank 2 (`$DD00` bits 0-1 = `%01`), `$D018 = $08` (screen
  `$8000`, bitmap `$A000`), `$D016 = $18` (multicolour), `$D011 = $3B`
  (bitmap on). The picture is on screen while the samples load. (traced)
- To draw the picture from the listing: bitmap `$A000`-`$BF3F` (8 bytes a
  cell, cells in screen order, 2 bits a pixel), screen `$8800`-`$8BE7`
  (high nibble = `%01` colour, low nibble = `%10`), colour `$8400`-`$87E7`
  (low nibble = `%11` colour), background 0 (black). (traced; rendered from
  the snapshot this way, it shows the title screen)

## Raster interrupt and colour animation

- `install_title_irq` `$4114`: CIA 1 interrupts off (`$DC0D = $7F`), raster
  compare line `$FB`, vector `$FFFE` = `title_irq` `$414C`. (traced)
- `title_frame` `$4093`, every frame: `music_play`, then the frame counter
  `$11` drives four effects (traced):
  - "ELECTRONIC ARTS" (row 0, columns 12-26): colour RAM white/yellow,
    swapping every 32 frames (`strip_colours` `$435F`).
  - The three credit lines (Michael Kosaka, Stephen Landrum, David Bunch;
    rows 19-21, columns 3-16): white, light grey and grey roll down the rows,
    a step every 8 frames (`names_colours` `$4363`).
  - The EA logo (rows 19-21, columns 32-39): a highlight sweeps across, a
    column every 2 frames (`ea_sweep_colours` `$436A`).
  - The "SKATE OR DIE!" logo: the words SKATE, OR and DIE! turn from white
    with a brown shadow to brown with a white shadow one after another, 16
    frames apart, then back one after another (`logo_word_on` `$423E`,
    `logo_word_off` `$42BC`, rectangles at `$455E`, nibbles at `$437A` and
    `$446C`); 128 frames a cycle. The call is skipped on frames where
    `$11 & 15 = 0`. (traced; simulated frames rendered)

## Leaving the title

- Fire on either joystick (`$DC00` bit 4, `$DC01` bit 4) ends the wait at
  `$4022`. (traced) SPACE also ends it, because the snapshot leaves CIA 1
  port A at `$7F` (keyboard row 7 selected) and SPACE is row 7, column 4.
  (simulated: SPACE pressed with port A `$7F` reached `$0880`; Q and B did
  not)
- Then: `music_stop`, one `music_play`, colour RAM and screen restored from
  `$8400`/`$8800`, raster interrupt off, file `$03` loaded to `$0880`,
  `$FDFF = 0`, NMI vector `$FFFA` = `$0880`, CIA 2 timer A restarted
  (`$DD0E = 1`), and the CPU spins at `$4090`. The NMI that the timer raises
  enters the shop at `$0880`, whose first instructions reset the stack.
  (traced; simulated: the run reached `$0880` with file `$03` loaded)
- `$FDFF`: the shop (file `$03`, `$0F6E`, `$0F83`) compares it with `$55` and,
  when it differs, loads file `$0B` (the event manager) to `$C000`
  (`$0F8A`-`$0F90`). The title's 0 makes the shop install it. (traced from
  the file's bytes)
- Nothing is handed back through `$FE00`: the event manager is not in memory
  during the title (`$F730`-`$FFF9` holds a RAM copy of the KERNAL). (traced:
  the title snapshot's `$F730` area does not match file `$0B`)

## Music driver

- Entry points (traced; simulated): `music_init` `$4576` (JMP `$50DA`), no
  arguments; `music_play` `$457C`, once a frame (PAL, 50 Hz); `music_stop`
  `$4579` (JMP `$50EB`). Init stops CIA 2 timer A, clears `$D417`, sets the
  NMI vector to `sample_nmi` `$5106` with CIA 2 timer A NMIs enabled
  (`$DD0D = $81`), and requests a reset (`$4B17 = $40`) that the next play
  carries out.
- **One tune.** No tune number is passed or read: the three voice tracks
  come from `$4C1B`/`$4C1E` (`$4C61`, `$4CBE`, `$4D5E`) and the sample track
  from `$4A18` (`$4D60`). (traced)
- Tempo: notes are read on "ticks" 2 and 3 frames apart in turn (a 5-frame
  counter `$4B14` that skips one frame, with a tick reload of 1), 2.5 frames
  a tick, 20 ticks a second. (traced; simulated: tick gaps 2,3,2,3,...)
- Length: voices 0 and 1 and the sample track are each 4864 ticks, so the
  tune repeats every 12160 frames, 243.2 s (4 min 3 s). Voice 2 is the drum
  pattern `$03` repeated (64 ticks). (traced from the data; simulated: all
  three tracks restart together at frames 12225, 24385, 36545 of the run)
- Format (traced): track bytes `< $80` pattern number, `$80`-`$FE` transpose
  (`& $7F`), `$FF` repeat. Pattern command byte: bits 0-4 ticks - 1, bit 5 no
  release, bit 6 rest, bit 7 an instrument byte follows; then a note byte
  (bit 7 tie). Eight instruments of 16 bytes split over `$4B9B` and `$4BDB`;
  two pulse programs (`$4B57`, `$4B5E`); two drum programs (`$4B70`,
  `$4B89`, instruments 2 and 6); frequency table `$4A2C` (note 1 = `$0116`,
  C-0).
- Vibrato depth grows with the note's age: the age `$4B40` is added to the
  high byte of the step (`$47CA`). (traced; simulated: note `$43` swings
  about plus or minus `$58` at age 3-5 frames and about `$130` at age 29)

## Samples

- The title music plays samples: a fourth channel of 4-bit values written to
  the SID volume register `$D418` by the NMI handler `sample_nmi` `$5106`,
  run by CIA 2 timer A. (traced; simulated: 173,244 NMIs and 176,098 `$D418`
  writes in 3000 frames)
- Two values a byte, high nibble first (parity of `$06`), `$1F` end mark;
  pointer self-modified in the `LDA` at `$5110`. Each of the seven samples
  loops from its loop point until its event's duration ends, when
  `music_play` stops the timer (`$4965`). (traced)
- Samples (start, loop, end mark) (traced, `$49F1`-`$4A13`, end marks found
  in the data):

  | # | start | loop | end mark |
  |---|---|---|---|
  | 0 | `$1000` | `$1100` | `$13F0` |
  | 1 | `$13F8` | `$14F8` | `$17E1` |
  | 2 | `$17E4` | `$18E4` | `$1BF6` |
  | 3 | `$1BF8` | `$1CF8` | `$1FEF` |
  | 4 | `$1FF4` | `$20F4` | `$23D9` |
  | 5 | `$23E0` | `$24E0` | `$27E5` |
  | 6 | `$27E8` | `$2FE8` | `$30EC` |

- Pitch comes from the timer: sample events give CIA 2 timer A values from
  `$91` to `$1C8` (NMI every 146 to 457 cycles, 6.7 kHz down to 2.2 kHz).
  (traced from the patterns)
- `music_play` also writes `$D418 = $0A` at the start of every call. (traced)

## Open questions and oddities

- `$4B1E`/`$4B21`: a note's portamento bytes are read and stored, but only
  `$4B21`'s being non-zero is used (to skip the vibrato); no slide is
  performed. No pattern of this tune uses them. (traced)
- Unreached data in the file: pattern `$11` (`$4F03`), track fragments
  `$4D88`-`$4DD0`, bytes `$4B61`-`$4B6F`, a sample-like tail `$4A1B`-`$4A2B`,
  single bytes `$4369` and `$4379`, unused variable slots in `$4B0D`-`$4B52`,
  and the NMI stub `$5151` (`LDA #0 / INC $D020 / RTI`) that nothing points
  at. (traced: no reference found by a scan of every instruction in the
  program's code)
- The sample loop flag is 1 for every sample, so the NMI's own stop at the
  end mark (`$512A`) never runs. (traced)
- The sample nibble phase `$06` is never reset, so a sample can start on its
  low nibble. (traced)
- `$4022` accepts fire from either port and SPACE (above). Other keys in
  column 4 would need a different keyboard row selected. (simulated for
  SPACE, Q and B only)
