# Kane — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`Kane.tap` from the Internet Archive item `uta_Kane_1985_Mastertronic_7916`
(the Ultimate Tape Archive's dump of Mastertronic's original 1985 cassette),
760,374 bytes, SHA-256
`d6c066a6cdc3380026ace9cd5ecd7c4af98cf90851fb48b3b23777b328c48093`. Its
header reads `C64-TAPE-RAW`, version 1: a raw pulse dump of the tape, not a
file container. The same item has a second dump of the cassette,
`Kane_a1.tap`, which was not used.

The tape holds one file in Commodore's own format, `KANE`, type 3 (an
absolute load), `$029F`-`$03BF`, recorded twice as the format does, and
then three files in the loader's own faster format, which `KANE` asks for by
name: `DATA1`, `DATA2` and `DATA3`. Nothing on the tape is a crack or a
trainer: the original release.

## From power-on to play

1. Start the emulator (`python3 kit/scripts/tools.py vice`), hard-reset
   the machine and autostart `work/Kane.tap` (`autostart()` in
   `kit/c64/vice.py`). VICE presses PLAY and types the load. The machine is
   PAL (VICE's default C64C, x64sc).
2. The loader shows stripes in the border while it reads, then the title
   screen appears, about five and a half minutes after the autostart at
   normal speed (331 seconds to the hand-over, 25 October 2026). Nothing is
   chosen on the way.
3. The hand-over: a stopping checkpoint on `$02ED`, the loader's
   `JMP $0C00`, armed a couple of seconds after the autostart. At that stop
   the machine was saved as `work/entry.vsf`.
4. Run on from there: the title ("Welcome to KANE", "Press Fire To Start",
   "F1 For Practice", "F7 For Score Table") comes up at once; saved as
   `work/title.vsf`.
5. Fire on joystick port 2 starts a game: the canyon of stage 1 is drawn
   and play begins within two seconds. Saved after about ten seconds of
   play as `work/play-ducks.vsf`.
6. Each other stage is reached through the game's own practice menu: on
   the title, F1, then `1` (level 1, of 1, 2 or 3), then F1 (bow and
   arrow), F3 (horse ride 1), F5 (shoot out) or F7 (horse ride 2).
   `work/practice-menu.vsf` is the menu after `1`.

The listing is built from `work/entry.vsf`: the start-up code and data
there (`$4000`-`$40BF`, which the start-up copies into the stack page) are
overwritten once the game runs.

## Steady state

Interrupts: the KERNAL's IRQ path through `$0314`, which the game keeps
switched in (`$01` = `$36` in play: BASIC banked out, I/O and KERNAL in).
The game's raster handlers chain, each writing the next one's address into
`$0314`. A frame recorded in the canyon (`kit/c64/frame.py capture`,
watching `$0314`-`$0315`):

| Line | Handler | Writes |
|---|---|---|
| 2 | `$3B09` | `$DD00` = `$C6` (VIC bank 1, `$4000`-`$7FFF`), `$D011` = `$3B` (bitmap, display on), `$D016` = `$D8` (multicolour), `$D018` = `$19` (screen `$4400`, bitmap `$6000`); next handler `$39D9` |
| 216-217 | `$39D9` | `$D021` black, `$D011` = `$1B` (text), `$DD00` = `$C7` (VIC bank 0), `$D016` = `$C8`, `$D018` = `$13` (screen `$0400`, characters `$0800`); next handler `$3B09` |

The title screen runs on `$346A` (the vector read in `work/title.vsf`) and
the start-up installs `$1F4C` first (`$0C28`). The BRK vector `$0316` is
`$3B61` and the NMI vector `$0318` is `$3162` once the game runs, and the
`CBM80` signature at `$8004` with both vectors at `$8000` and `$8002`
pointing to `$0C00` makes a reset restart the game. RESTORE does nothing:
the NMI vector points at a lone RTI, so the KERNAL's own check is never
reached.

The game is one load: nothing is read from the tape after the hand-over.

## The files on the tape, and where they land

Found by stopping the loader after each file and comparing memory
(`work/ld-*.vsf`):

| File | Loads to | What becomes of it |
|---|---|---|
| `KANE` | `$029F`-`$03BF` | the loader: the code at `$02A8`, the three file names at `$02F0`, the fast-load routine behind the LOAD vector at `$0378`, and the vectors `$0300`-`$0333` |
| `DATA1` | `$3FD0`-`$9FFF` | a copy routine at `$3FD0`, which the loader calls straight after this file: it banks out every ROM and copies `$4000`-`$9FFF` to `$A000`-`$FFFF`, 24 KB of graphics |
| `DATA2` | `$0801`-`$40FF` | the program; it overwrites the copy routine. `$4100`-`$7FFF` still holds `DATA1`'s bytes, the twin of `$A100`-`$DFFF`, until the game draws its screens there |
| `DATA3` | `$8000`-`$9FFE` | the rest of the program and its tables, over `DATA1`'s tail |

## The loader, in a paragraph

`KANE` is read by the KERNAL at its normal speed. It loads over the page of
vectors at `$0300`, so it takes control at the next interrupt through the
IRQ vector at `$0314`, which it points to `$02A8`. It points the KERNAL's
LOAD vector (`$0330`) at a routine of its own at `$0378` that reads the
faster format, a bit per pulse, timing each pulse with CIA 2's timer A and
flashing the border as it goes, and then calls the KERNAL's LOAD for `DATA1`, `DATA2` and `DATA3` in
turn, with the copy at `$3FD0` between the first two, and jumps to `$0C00`.
