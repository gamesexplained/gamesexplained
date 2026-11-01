# The Detective — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`DETECTIV.T64`, 50,726 bytes, a T64 tape image (header text
`C64 tape image file`, tape name `ASS PRESENTS:`). Its directory holds two
entries, both of type `$82` (PRG):

| # | Name | Load | End | Bytes | Offset in the file |
|---|---|---|---|---|---|
| 1 | `THE DETECTIVE` | `$0801` | `$B50F` | 44,302 | 128 |
| 2 | `DETECTIVE DOX` | `$0801` | `$2099` | 6,296 | 44,430 |

This is a cracked release, not the original tape. The first file is the
game, packed three times over by the crackers. It prints
`SPREAD BY TRIANON IN 1987!` at the foot of the screen while it unpacks,
and one stage carries the text `THE DETECTIVE GAME - WRITTEN BY SAM...`
in the bytes it copies to `$0400`. The second file is a separate
program, by its name the crackers' instructions ("docs"). The game never
loads it; autostart loads only the first file.

The game's own title screen reads `© A.P.S. SOFTWARE 1986`,
`THE DETECTIVE GAME`, with the author's signature underneath.

## From power-on to play

1. Hard reset, then autostart `DETECTIV.T64` (`vice.py autostart()`;
   it loads the first file, `LOAD` then `RUN`).
2. The BASIC line is `SYS 2061`: `DEC $01 : JMP $B4D1`. The first
   unpacker copies itself into screen memory (`$0400`-`$05FF`, so the
   screen fills with garbage), prints the Trianon line, and unpacks. Two
   more stages follow, each jumping back through `$0812`. No input is
   needed; it takes about 15 seconds of emulated time.
3. The game's title screen appears (the "Investigation" panel, Inspector
   Snide). Hold fire on joystick port 2 for a second: play starts in
   the hall ("YOU ARE IN THE HALL").
4. Snapshots in `work/`:
   - `entry.vsf`: the hand-over, stopped on the game's first
     instruction, `$2000`. To make it: a stopping checkpoint on `$0812`
     (RAM only, so it cannot fire inside BASIC's ROM), autostart, and once
     it stops, a stopping checkpoint on `$2000`, then run. A checkpoint
     on `$BD0A` set before the load fires early, inside BASIC's own ROM
     code, while it reads the `SYS` number.
   - `play-hall.vsf`: steady play, in the hall, a few seconds after fire,
     with Snide and one other character on screen.

**The listing is built from `entry.vsf`.** The two snapshots differ in
13,102 bytes, and the hand-over holds authored data the game overwrites
once it runs:

- `$4000`-`$47FF` holds the title's character set at the hand-over. In
  play it has been moved to `$EA00`-`$F1FF` (byte for byte equal), and
  another set is at `$4000`.
- `$0C00`-`$1BFF` holds data at the hand-over that play overwrites; in
  play it begins with the same bytes as the screen at `$7C00`.

No page of either snapshot is the emulator's power-on fill; `$F900`-`$F9FF`
is the only page of zeros in both.

## Steady state

- **Processor port.** The game sets `$01` to `$35` at `$2080`: RAM
  everywhere, I/O at `$D000`, so the KERNAL and BASIC are banked out.
- **Vectors.** RAM `$FFFE` = `$2967` (IRQ), `$FFFA` = `$294A` (NMI).
  `$0314` and `$0318` still hold the KERNAL's defaults (`$EA31`, `$FE47`)
  and are not used.
- **The raster interrupt** (`$2967`) runs three stages in turn: an index
  at `$B0` counts 0, 1, 2, picks a routine from the table at `$2999`
  (`$29B1`, `$2A8B`, `$2ACC`) and sets the next line from `$299F`
  (`$0A`, `$A9`, `$B9`). A recorded frame of play (`work/frame-hall.json`)
  shows its writes: on line 11 the room picture (multicolour text,
  sprites on, character set `$4000`), on line 170 the text panel
  (sprites off, character set `$4800`), on line 186 the panel's colours.
  No handler writes the vector; there is one handler.
- **The NMI** (RESTORE key, `$294A`) restarts the game at `$2067` when
  `$0F` is not zero and `$76` is zero; otherwise it returns.
- **Video.** Bank 1 (`$DD00` = `$x6`), screen at `$7C00`.
- **Entry.** `$2000` is a jump table: `JMP $2048` (start-up), `JMP $2747`,
  `JMP $289E`, `JMP $32CE`. `$2048` clears zero page and the stack page,
  sets the video bank and `$01`, and calls the set-up routines.
- The game is one file, and one part: no part of it is loaded later
  (`15-parts` does not apply).

## Emulator

`own build of github.com/barryw/vice-mcp, release v3.13.2, commit
1e83aab134`; `check-emulator` passed 57 of 57 on 1 November 2026, so
none of `workarounds.md` applies.

## Files mapped onto memory

| File | Lands whole? | What it is |
|---|---|---|
| `THE DETECTIVE` | no | packed; its bytes appear nowhere in memory once unpacked |
| `DETECTIVE DOX` | not loaded | the crackers' instructions, a program of its own |

## The loader, in a paragraph

There is no loader beyond the KERNAL's tape load: the crackers joined the
game into one file and packed it. Three stages unpack it. The first, run
from `$0812`, copies 512 bytes of decoder to `$0400`-`$05FF`, moves the
packed data up to the top of memory and decodes it; its exit sets `$01`
to `$36` and jumps to `$BD0A`, a stub that points the decoder at the
next stream and jumps back to `$0812`, where the first stage has put a
second decoder of 256 bytes. A later stage copies a mover to `$0100`
and runs it. The last jump lands on `$2000` with the stack pointer at
`$F2`. How each decoder encodes its data was not studied, by policy.

## Other releases compared

The contributor had two more cracked copies, both disk images, which
were run to the game's first instruction and compared with
`work/entry.vsf` byte for byte on 1 November 2026 (`work/unpack3.py`,
`work/cmp3.py`, `work/cmp4.py`). Neither is used for anything else.

| Image | Program | How it starts | Against `entry.vsf`, `$2000`-`$FFFF` |
|---|---|---|---|
| `Detective Game, The (1986)(Argus Press)[a].d64`, disk name `BLENDO75` | `DETECTIVE`, `$0801`-`$B50F`, 44,304 bytes | the same Trianon packer; the file differs from the tape's in 21 bytes near its end | identical; only the screen and zero page below `$0800` differ |
| `Detective Game, The.d64`, disk name `C64.COM` | `DETECTIVE / WOW`, `$0801`-`$BB46`, 45,895 bytes, between two decoy entries | a "WOW" intro that waits for Space, then the game at `$2000` | the program code and tables are the same; the differences are the state of a game in progress (the variables at `$1C40`-`$1FFF`, the character sets at `$3FF0`-`$47FF` and `$EA00`-`$F1FF` as play arranges them, the sprite shapes the game mirrors in play, the buffer at `$4E00`, the screen, two bytes at `$9161` the code changes; most of the character sets, the mirrored shapes and those two bytes are as in `work/play-hall.vsf`), as if this crack was made from a frozen machine; and seven bytes at `$BAB5`, where an answer's text "SORRY, " reads `01 FC E2 01 FC E2 01` |

The "WOW" copy was made by another group from another starting point,
a machine frozen in play, and still holds the same program as the tape
analysed here. The seven bytes at `$BAB5` are that copy's damage, not a
change in the tape: in the tape they are the plain text the answer
prints, and in the WOW copy they are not text at all. No uncracked
original was available, so a change made before all three cracks
cannot be ruled out.
