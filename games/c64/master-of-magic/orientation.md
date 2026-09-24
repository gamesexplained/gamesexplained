# Master of Magic — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`work/master-of-magic.d64`, a 174,848-byte disk image, unpacked from the
contributor's `master_of_magic_the.zip` (it holds `Master of Magic,
The.d64`). SHA-256 of the image:
`f063d3d1ade2c1558cf4cacb7ef80fa03819d9a52cb7c8a66b28e53dea974e69`. The
disk is named `C64.COM`, id `00`, and holds one program between two
`DEL` separator entries:

| Name | Type | Blocks | Load | End |
|---|---|---|---|---|
| `M.OF MAGIC+2/REM` | prg | 157 | `$0801` | `$A2EE` |

**This is a crack, not the original.** It is release 15 of the group
Remember: "cracked from tape and documents written by HOK, +2 trained by
Jack Alien", with an intro by Jack Alien, as its own scroll text says. The
docs close with "These docs adapted from the tape cover by HOK of
REMEMBER in 1997". Everything the crackers added runs before the game and
is gone, or never called again, once the game starts at `$07F9`.

## From power-on to play

Emulator: PAL C64 (`x64sc`, 6569 VIC-II, 6581 SID), no cartridge, drive 8
a 1541.

1. Attach `work/master-of-magic.d64` to drive 8 and autostart it. The
   program's BASIC line (line 1993, `SYS π*656`, so `SYS 2060`) starts a
   decruncher; the Remember intro appears about half a minute after the
   autostart: a logo, "PROUDLY PRESENTS / THE MASTER OF MAGIC +2 AND
   DOCUMENTS / (C) 1985 BY MASTERTRONIC" and a scroller.
2. Press **SPACE**. The intro only waits for SPACE (`$10D8`, `$DC01` equal
   to `$EF`). The first page of the crackers' documents appears, ending
   "SPACE .. READ DOCS / RUN/STOP .. START GAME".
3. Press **RUN/STOP**. A multicolour bitmap appears: a figure stepping out
   of a cave, lettered "The Master of Magic". It waits for SPACE
   (`$17DF`).
4. Press **SPACE**. A second decruncher unpacks the game (a second or
   two) and the trainer asks "UNLIMITED BODYSTRENGTH ?", then "UNLIMITED
   MIND (MAGIC) ?". It reads its answers with the KERNAL's `GETIN`, so
   type them: **N**, **N** (typing `NN` into the keyboard buffer with
   `vice_keyboard_type` answers both). No trainer option was taken; the
   bytes the options would patch are checked unpatched at the entry.
5. The trainer jumps to `$07F9`, the game's own entry. The game's title
   screen follows at once: "THE MASTER OF MAGIC" over a cave picture, a
   story scroller underneath and Rob Hubbard's title music. When the
   scroller has run, the demonstration starts on its own.
6. Press **SPACE** (or fire) during the demonstration. A controls screen
   appears ("THE GAME IS CONTROLLED BY A JOYSTICK IN PORT 2 OR THE KEYS
   ... FIRE TO START OR B FOR INSTRUCTIONS").
7. Press **fire on joystick port 2**. The game proper starts: Thelric's
   parting words in the message window, the menu RUN INVENTORY EXAMINE
   CAST across the middle, and the clock at 00:00:00.
8. Press **fire** to choose RUN, then move with the stick. The clock
   runs while you move and stops in the menu.

The whole sequence is in a script: autostart, SPACE, RUN/STOP, SPACE with
a stopping checkpoint on `$3884`, type `NN` with one on `$07F9`, run.
Keys held through `vice_keyboard_matrix` for 0.4 s reach the intro and
the docs reader. At the trainer, one 0.3 s matrix press of N was followed
by the game starting without a second one, so type its answers instead;
why the press counted twice is not established.

## Snapshots

All saved without ROMs; the 64 KB RAM image starts at file offset 209,
checked against the game's own code at `$07F9` (`78 D8 A2 FF 9A`) and at
`$2653`.

| File | State |
|---|---|
| `work/handover-3884b.vsf` | stopped on the trainer's first instruction, `$3884`: the game fully unpacked, trainer and crack code still in memory |
| `work/entry-07f9.vsf` | stopped on the game's first instruction, `$07F9`, after N and N: **the loader's hand-over**, for telling loaded data from drawn |
| `work/demo.vsf` | the demonstration running |
| `work/controls-screen.vsf` | the controls screen |
| `work/play-start-menu.vsf` | a new game, the first menu, clock 00:00:00 |
| `work/play-run.vsf` | RUN chosen, the player moved up and left from the start, clock running. **The snapshot everything downstream is read from.** |

## Steady state

- **Emulator checks.** `tools.py check-emulator` on this build: 56 of 56,
  no failed checks, so none of `workarounds.md` applies.
- **Banking.** `$01` is `$36` in play: BASIC ROM out, I/O and the KERNAL
  ROM in. The entry sets `$37` first and calls the KERNAL's screen clear
  (`$E544`) and BASIC's RAM initialisation (`$E3BF`); the game later
  switches BASIC out.
- **Vectors.** In play `$0314` points at `$2653`; on the title screen and
  in the demonstration it points at `$5D08`. `$0318` keeps the KERNAL's
  `$FE47`. The hardware vectors at `$FFFA` are the KERNAL's, so
  interrupts arrive through the ROM and leave through `$0314`, and the
  play handler ends in the KERNAL's `$EA31` (keyboard scan and the
  jiffy clock) from band 0; the other two bands return directly.
- **Interrupts.** The play handler at `$2653` is a raster interrupt in
  three bands, counted in `$03B7`:

  | Band | From raster | What it sets |
  |---|---|---|
  | 0 | `$28` | character mode, VIC bank 0: screen `$0400`, characters `$3000`; background yellow; sprites from the table at `$3A00` |
  | 1 | `$8E` | background brown (the menu band); the music (`$1949`) when `$03D1` is on, else a noise burst on voice 1 when `$03CF` asks for one |
  | 2 | `$B6` | multicolour bitmap, VIC bank 2: bitmap `$A000`, screen `$A800`; background black; sprites from `$3A20`; counts frames in `$03A0` and collects sprite-background collisions into `$038D` |

  Registers that the handler rewrites cannot be sampled from outside;
  reads of `$D018` and `$DD00` land in any of the three bands.
- **Input.** `$0CC6` reads joystick port 2 from `$DC00` into `$0387`
  (fire), `$0388` (x) and `$0389` (y), then the keys from the KERNAL's
  scan: SHIFT right and the Commodore key left (`$028D`), H up and B down
  (`$C5`). `$0C94`, called just before it, toggles `$03D1` on M.
- **Where the code and data sit** (first pass, from a page census of
  `entry-07f9.vsf` against `play-run.vsf`; the sweep refines it):

  | Range | What |
  |---|---|
  | `$0340`-`$03FF`, `$0801`-`$080B` | crack's decruncher and BASIC line, overwritten or dead |
  | `$07F9`-`$2FFF` | game code, variables in page 3 |
  | `$3000`-`$37FF` | character set for the top band |
  | `$3800`-`$3903` | the crack's trainer at the hand-over; the game overwrites page `$38` in play |
  | `$3A00`-`$3A3F` | sprite register images for bands 0 and 2 |
  | `$4000`-`$BFFF` | mostly static data, some code near `$4200` and `$5C00`-`$5DFF` (title and demonstration) |
  | `$A000`-`$BF3F` | the bitmap the bottom band shows |
  | `$C000`-`$C2FF` | code, called as `$C000`/`$C003`/`$C006` (by where it is called from, the music) |
  | `$C400`-`$FFFF` | data, including the title screen's matrix and characters (`$C400`, `$F000`), under the I/O and KERNAL ROM |
  | `$D000`-`$DFFF` | RAM under I/O: never written (the emulator's fill pattern) |

- **No overlays.** The game is a single load from tape; the disk is not
  read again once the crack's intro runs, so one snapshot covers every
  state.

## The loader, in a paragraph

The disk file is the crackers' packaging round a single-load tape game.
Its BASIC line starts a copy loop at `$080C` that moves a decruncher from
`$A0F8` to `$0340` and runs it; that unpacks the Remember intro (logo,
scroller, the docs reader with its text at `$22DA` in its own layout) and
the still-packed game. After the docs, the loading picture is shown from
a bitmap at `$2000` with its colours copied from `$1800` and `$1C00`. On
SPACE, `$3F40` moves the packed game up to the top of memory, copies a
second decruncher to `$00FD`-`$01AF` and runs it; it unpacks the game and
jumps to the trainer at `$3884` with `$01` at `$37`. The trainer's two
questions patch the game only on a Y: body strength at `$24D0` (`SBC $038A`
becomes `NOP / SBC #$00`) and `$2DF8` (`LSR $4EC5` becomes `LDA`), mind at
`$2E02`, `$3A66` and `$2E93`. It ends with `JMP $07F9`. None of it is
annotated further.
