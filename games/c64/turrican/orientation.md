# Turrican — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

The original Rainbow Arts release for PAL machines, 1990: two disk sides
as G64 images, from the C64 Preservation Project's 10th Anniversary
Collection on the Internet Archive
(`https://archive.org/download/C64_Preservation_Project_10th_Anniversary_Collection`,
G64 zip, folder `t`, files `turrican_s1[rainbow_arts_1990](pal)(!).zip`
and `turrican_s2[rainbow_arts_1990](pal)(!).zip`). They are kept in
`work/` as `turrican_s1.g64` and `turrican_s2.g64`; `media.json` has
their SHA-256 hashes. No crack, trainer or intro: the boot shows the
publisher's loading picture and goes straight to the game.

Side 1's directory holds the boot program `SCHLUMPF`, its fast load
routine `HE`, the game's fast loader `\A`, the engine `+0`, the title
`4%`, the hero's sprites `FT`, the high-score table `IH` and the side
marker `CD`. Side 2 holds the side marker `CD` and the thirteen levels
and the ending, one file each, named with two characters. Every file the
game's own loader reads is packed; `media.json` says which part each one
unpacks into.

## From power-on to play

1. Start the emulator with `python3 kit/scripts/tools.py vice` and
   autostart `work/turrican_s1.g64`.
2. The boot program loads with the KERNAL and loads the high-score
   table `IH` and its own fast load routine `HE`. With the screen
   black, it reads three chains of sectors that no file holds, then
   plays a spoken sample for about fifteen seconds. It loads the game's
   fast loader `\A` with the KERNAL, shows the loading picture with
   its tune, loads the engine `+0` through the fast loader, and shows
   PRESS SPACE. Press SPACE.
3. The title loads: the logo, then pages of credits with colour bars.
   Fire in joystick port 2 starts a game. The title loads the hero's
   sprites (`FT`) and shows TURN THE DISK ! THEN PRESS SPACE. Attach
   `work/turrican_s2.g64` and press SPACE. The title loads the side
   marker `CD` until it reads side 2, then level 1-1 (`PO`), and jumps
   into the engine at `$08E3`.
4. `work/play-w1l1.vsf` is level 1-1 in play. `work/loadpic.vsf` is the
   loading picture and `work/title.vsf` the title.

## The parts

The engine stays in memory from `$0400` to `$685E` with the hero's
sprites under the I/O chips at `$D000-$E5FF`; the title, each level and
the ending load over the rest. The table gives each part's file, and the
route below reaches each one's snapshots.

| Part | File | Side |
|---|---|---|
| engine | `+0` (and `FT`, the hero's sprites) | 1 |
| title | `4%` | 1 |
| level 1-1 | `PO` | 2 |
| level 1-2 | `<>` | 2 |
| level 1-3 | `EF` | 2 |
| level 2-1 | `8=` | 2 |
| level 2-2 | `&U` | 2 |
| level 3-1 | `9M` | 2 |
| level 3-2 | `3M` | 2 |
| level 3-3 | `!6` | 2 |
| level 4-1 | `YG` | 2 |
| level 4-2 | `#:` | 2 |
| level 4-3 | `Q4` | 2 |
| level 5-1 | `12` | 2 |
| level 5-2 | `-@` | 2 |
| the ending | `)(` | 2 |

Each level's header names its own file at `$8CA5` and the next one at
`$8CA7`. The route walks the levels with the game's own next-level
state rather than playing through them:

1. From a level in play (start with `work/play-w1l1.vsf`), pause and
   write 4 into `$03F1`, the main loop's state: 4 is "next level".
2. Set an execution checkpoint at `$09A1` in `load_level` and resume:
   it stops just before the loader is called, with the file's name in
   `$ED/$EE`.
3. Move the checkpoint to `$09A4` and resume: it stops just after the
   load returns and before the level is set up. Save this as the part's
   `work/entry.vsf`.
4. Resume, run about eight seconds and save `work/play.vsf`.

Repeat from step 1 in the new level. After level 5-2 the same route
loads the ending, whose entry at `$09A4` is the same; `load_level`
then starts it at `$6C00` instead of setting a level up.

The engine's snapshots are level 1-1's (the engine's bytes are the same
in every part). The title's two snapshots are of the title running:
`work/entry.vsf` stopped in the text slide between credit pages
(`$7AF5`), and `work/play.vsf`, the same as the game folder's
`work/title.vsf`, at `$7E15`.

Every packed file was also unpacked away from the emulator, by running
the game's own unpacker (`load_file`, `$6960`) on the 6502 simulator
(`kit/cpu/cpu6502.js`) with the file's bytes in place of the drive: each
level file and the ending give exactly their part's bytes, the engine
file exactly `$0400-$685E`, and the title file 98.5 % of the title's
snapshot (the rest is what the title changes as it starts).

## Steady state

In play the processor port is `$35` (BASIC and KERNAL out, I/O in), and
the hardware vectors are the game's own: IRQ `$08CD`, NMI `$08E2`. The
interrupt entry acknowledges the video chip and jumps through `$0314`
to the handler for the band of the screen: `irq_top` at `$0A15` at
the top of the play area, the sprite multiplexer, and `irq_bottom` at
`$0C65`, which shows the panel and runs the second half of the frame's
logic. The main program only reads CTRL for the pause and runs the
main-loop state (`$03F1`). The play screens are at `$C800` and
`$CC00` in bank 3, swapped for the scroll; the panel is drawn from bank
0, its screen at `$0400`. The title runs on its own interrupt at
`$6CF3` and the ending on its own at `$6D55`.

## The loader, in a paragraph

The boot program `SCHLUMPF` takes over the KERNAL's output vector at
`$0326`, so it starts itself as soon as it is loaded. It loads `IH`
(kept at `$C800` until the engine's place for it is free) and `HE`,
whose routine at `$0880` reads three chains of sectors in a format of
the disk's own, stored encoded: the boot's code at `$5F00` and
`$C330`, the spoken sample, the loading picture and the loading tune
with its player (Romuzak V6.3, Oliver Blasnik's, kept at `$D000` and
copied to `$8000`). `$C330` plays the sample through the volume
register, loads `\A` with the KERNAL and sends its drive code
(`$6C00`), starts the tune, and loads the engine. From then on every
file is read by name through `load_file` at `$6960`, which unpacks it
as it arrives; SPACE loads the title, and `load_file` returns into it
at `$6C00`. At a game over the title shuts the fast loader's drive code
down (it asks for a file that is not there, and the drive code resets
the drive) so that the KERNAL can save the high scores; afterwards it
sends the drive code again.

`work/boot_c330.vsf` is the boot stopped at `$C330`, with the sample,
the loading picture and its tune in memory and nothing played yet.
