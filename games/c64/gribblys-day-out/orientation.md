# Gribbly's Day Out — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`Gribblys_Day_Out.tap`, 381,402 bytes, SHA-1
`e3fe2314f5dbfa2dabaeeae966d0f714cea116e7`. The header reads
`C64-TAPE-RAW`, version 1: a raw pulse recording of a cassette, not a
T64 archive. It holds 106 seconds of tape: 17 seconds in the Commodore
ROM loader's format, then 86 seconds of a turbo format (pulses of about
216 and 312 cycles). It is the Hewson Consultants cassette release of
1985, not a crack: no intro, trainer or menu, and the inlay's loading
instructions (SHIFT + RUN/STOP) are all it needs. The Internet Archive's
item `uta_Gribblys_Day_Out_1985_Hewson_Consultants_206` lists a
`Gribbly's_Day_Out.tap` of the same size beside the inlay scans; it was
not downloaded, so the two files are not known to be identical.

What the tape holds, decoded from the pulses by `work/py/tap.py`:

| Block | Format | Lands at | Bytes | Found in memory |
|---|---|---|---|---|
| header, `GRIBBLYS DAY OUT`, type 3 | ROM loader | tape buffer `$033C`-`$03FB` | 192 | the boot code, `$0351`-`$03F1`, rides in the header after the 16-character name |
| program | ROM loader | `$0302`-`$0303` | 2 | `$51 $03`: BASIC's main-loop vector now points at the boot code |
| one turbo block | the boot code's own | `$0C00`-`$AFFF` | 41,984 | equal byte for byte to the hand-over snapshot's `$0C00`-`$AFFF` |
| trailer | turbo | not loaded | 256 | `$39` then 255 zeros; `$39` is the XOR of the block's bytes, which the loader never reads |

## From power-on to play

1. Power-cycle the emulator (`vice_machine_reset` hard) and autostart the
   TAP with `autostart()` in `kit/c64/vice.py`. VICE presses PLAY, types
   the load and runs it, and warps through the load. The screen flashes
   coloured stripes while the turbo block loads; there is no loading
   picture. The title appeared about 95 seconds after the autostart on
   9 October 2026.
2. No trainer or menu. The title screen ("Hewson Consultants Ltd.
   Presents GRIBBLY'S DAY OUT ...") with the status panel below it
   comes up by itself.
3. Hold fire on control port 2 for one second. "Psi~energy Transfer
   Stage / Hide the Gribblets in the Cave / Eight Gribblets to rescue"
   shows for a few seconds, then play starts with Gribbly standing on the
   ground under the cave.
4. Snapshots in `work/`, all saved without ROMs:
   - `entry.vsf`: stopped on `$42C0`, the game's first instruction, by an
     execute checkpoint on `$0400`-`$9FFF` and `$C000`-`$CFFF` armed once
     the boot code had started (`work/handover.py` does it all).
   - `play-level1.vsf`: about 13 seconds of game time into the first
     level, Gribbly standing still. The disassembler and the listing are
     built from this one.

The emulator was VICE vice-mcp, release v3.13.2,
`v3.13.2-linux-x86_64-gui.zip`, PAL, which passed all 57 of
`check-emulator`'s checks on 9 October 2026. None failed.

## Steady state

`$01` = `$25` during play: RAM at `$A000`-`$BFFF` and `$E000`-`$FFFF`,
I/O at `$D000`. The game owns the hardware vectors: NMI `$FFFA` = `$7412`
(an `RTI`, so RESTORE does nothing), RESET `$FFFC` = `$42C0`, IRQ
`$FFFE` = `$745A`. `$0314` still holds the KERNAL's `$EA31`, unused.

The raster interrupt is a chain of four handlers in `$74xx`, each writing
the low byte of `$FFFE` for the next one, recorded with
`kit/c64/frame.py capture` (`work/frame-play1.json`):

| Handler | Runs at line | Does |
|---|---|---|
| `$745A` | 44 | `$D018` = `$2B`, scroll bits from `$2C`/`$2D` into `$D016`/`$D011`, background from `$35`; next `$74E0` |
| `$74E0` | 182 | next raster `$BD`, reads sprite-sprite collisions `$D01E` into `$6D`; next `$7424` |
| `$7424` | 189 | delay loop on `$6E`, then `$D011` = `$7F` (blank), `$D018` = `$19`; next `$74AF` |
| `$74AF` | 197 | delay loop on `$6F`, `$D011` = `$10`, `$D018` = `$19` for the status panel; next `$745A` at line `$2C` |

The whole game is one load: the turbo block, then nothing else is read
from tape. The start-up at `$42C0` copies `$8000`-`$9FFF` to
`$E000`-`$FFFF` and `$A200`-`$AFFF` to `$C200`-`$CFFF`, then reuses
`$8000`-`$BFFF`: in play it holds the level being played, as tile codes.
Comparing the two snapshots, `$0C00`-`$7FFF` is the same in both but for
a few hundred bytes of variables; `$E000`-`$FFFF` in play equals the
hand-over's `$8000`-`$9FFF` but for 6 bytes, and `$C200`-`$CFFF` equals
its `$A200`-`$AFFF` exactly. The play snapshot therefore holds every
byte of the program at the address it runs from, which is why it is the
one analysed. The hand-over's `$A000`-`$A1FF` is loaded but never copied
anywhere the play snapshot shows.

## The loader, in a paragraph

The ROM loader reads a header whose type 3 makes the next block load to
the address it names, `$0302`: two bytes that point BASIC's main-loop
vector at `$0351`, inside the header the ROM has just left in the tape
buffer. So when the load ends and BASIC goes back to its main loop, it
jumps into the boot code instead. That code points the NMI vector at an
`RTI`, blanks the screen, starts the motor and reads bits by timing
the gap between pulses with CIA 2's timer B, restarted at `$0107`
(263 cycles) on every pulse: a gap long enough for it to run out is a 1. It
waits for a lead-in of `$02` bytes, then `$09` down to `$01` and a `$00`,
and reads every following byte straight into `$0C00` up to `$AFFF`. It
stops the motor and jumps through the vector at `$8000`, which the block
has just loaded with `$42C0`. The block also carries the `CBM80`
signature at `$8004`, with both vectors at `$42C0`; in the play
snapshot the level occupies `$8000` and the signature is gone.
