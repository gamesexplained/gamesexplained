# Commando — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`work/Commando.d64`, a 35-track D64 of 174,848 bytes, the contributor's
own copy. Its header reads `once upon a time` with the ID `-rem-`, and it
holds two files:

| File | Blocks | What it is |
|---|---:|---|
| `COMMANDO+5HI/REM` | 120 | REMEMBER's packed release: the 1985 game with the crack's instructions, menu, trainer and high-score saver |
| `COMMANDO HI /REM` | 1 | the saved high-score table: a load address and 91 bytes for `$0EED-$0F47` |

This is not the original release. It is REMEMBER's "Commando +5HD"
(CSDb release 40672, June 1997). What the crack added or changed is in
`facts.md`, "REMEMBER's changes".

## From power-on to play

1. Start VICE with `python3 kit/scripts/tools.py vice`, hard-reset, and
   autostart file 1 of the disk (`autostart` in `kit/c64/vice.py` with the
   file number 1). File 2 is data: autostarted, it stops at READY.
2. After about 30 seconds REMEMBER's screens are up. Press Space, wait a
   few seconds, then press RUN/STOP, which leaves the crack's instructions
   for its menu: T for the trainer, H for the high scores. Press H.
3. The menu asks L (load the saved table) or R (keep the table in memory
   and save it over the file). Press L. The drive loads `COMMANDO HI /REM`
   to `$0EED` and the game starts at `$0850`.
4. An execution checkpoint at `$0850`, armed before L, stops the machine
   at the game's entry. Saved without ROMs, that is `work/entry.vsf`, the
   snapshot the listing is built from (`work/scripts/to_entry.py`).
5. The COMMANDO title follows; fire on joystick port 2 starts a game.
   From `entry.vsf`, 300 frames and a press of fire reach the first area
   (`work/scripts/live.py`). `work/title.vsf` and `work/play.vsf` were
   saved on that route, at the title and in the first area.

Choosing T at step 2 asks five yes-or-no questions before step 3 and
patches the game (`facts.md`); no listing snapshot was taken that way.

## Steady state

In play the processor port reads `$36` (BASIC banked out, KERNAL and I/O
in). The IRQ vector at `$0314` points at `$4116`, which jumps through the
handler pointer at `$0406`; each raster handler sets the next (`$4119`,
`$416A`, `$41A7`, `$4266`, `$436B`). CIA 1's timer is stopped, so the
KERNAL's interrupt does not run. The NMI vector points at an RTI at
`$0A4D`. The VIC-II reads bank 3 (`$C000-$FFFF`), the screen is at
`$E000`, and the character set changes with the area (`$D018`).

The whole game is in memory at `$0850`: code, three maps, four character
sets, the sprites and the music. Nothing is loaded during play; the disk is
used only by REMEMBER's code, to load and save the high scores.

Three recorded runs of the code map (`kit/c64/codemap.py`, kept as
`codemap.json`) cover the title, play through every area with the
trainer's area skip, game overs, the name entry and the save.

## The loader, in a paragraph

The program on disk is REMEMBER's packed file. It depacks itself, shows
the crack's instructions and menu, and hands over to the game at `$0850`
from the menu or, after a name has been entered and the table saved, from
the saver at `$44E0`. The depacker was not traced.
