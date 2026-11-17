# Galactic Games — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

Two G64 images of the original Activision disk, one for each side
(`work/side1.g64`, `work/side2.g64`; their SHA-256 sums are in `media.json`).
The directory of each side is art: boxes of graphic characters around
"PARA-PROTECT", "GALACTIC", "GAMES." and "SIDE 0" (side 1) or "SIDE 1"
(side 2). On side 1 every entry points at the boot program, which loads at
`$00AE`; on side 2 they all point at one sector that links back to itself.
Nothing suggests a crack or a trainer.

## From power-on to play

1. Start VICE through `kit/scripts/tools.py` with `work/side1.g64` attached to
   drive 8 and true drive emulation on (the G64 needs it), and type
   `LOAD"*",8,1` then `RUN`, or autostart the image.
2. The boot program starts itself and loads the rest of the boot from tracks
   19 to 22. A credits screen appears ("Design Copyright (C)1987 Tigress
   Designs", "Copyright (C)1987 Activision", "A Software Studios production in
   association with Tigress Designs"), `reference/title-credits.png`.
3. FIRE moves on: the menu program HARRY loads and a commentator types a
   welcome ("WELCOME GALACTI-SPORT FANS..."), with a spinning ball following
   the text; FIRE skips it. The menu lists the five events and the
   Galactic Championship (`reference/menu.png`).
4. Joystick up and down picks a line, FIRE loads it. The commentator
   describes the event while it loads. 100m Slither and Space Hockey are on
   side 1; for Psychic Judo, Head Throwing and the Marathon the menu asks for
   side 2 (`reference/side-prompt.png`): attach `work/side2.g64` and press
   FIRE. Each event shows its title screen until a key is pressed.

## The parts

Seven parts (`kit/skills/core/15-parts`), each with its snapshot in
`parts/<id>/work/`:

| Part | Files | Snapshot and route |
|---|---|---|
| resident | the boot (tracks 19-22, RECO) | `play.vsf`: the menu after the commentator's welcome, step 3 |
| menu | HARRY | `play.vsf`: the same moment |
| slither | PROG0 | `entry.vsf` at the title screen, `play.vsf` during play |
| hockey | PROG1 | `entry.vsf` at the title screen, `play.vsf` during play |
| judo | PROG2 | `entry.vsf` at the title screen, `play.vsf` during play |
| head | PROG3 | `entry.vsf` at the title screen, `play.vsf` during play |
| marathon | PROG4 | `entry.vsf` at the title screen, `play.vsf` during play |

Each event's `codemap.json` was recorded from its entry through its title
screen, prompts, play and RUN/STOP back to the menu
(`kit/c64/codemap.py`), and the resident's and menu's from power-on through
the menu to each event and back.

## Steady state

The resident (`$0800`-`$08FF`, `$B800`-`$FFFF`) stays from the boot to the
end; HARRY and the events load over `$0900`-`$B73F` in turn. Every part runs
on a raster interrupt through the RAM vector at `$FFFE` with the KERNAL banked
out, and points the NMI at an RTI. The events use video bank 1 with the
screen at `$4000`; the title screens use bank 3 (bitmap at `$E000`); the menu
and records screen use bank 0 with the screen at `$0400`. Nothing is
reloaded during an event; the menu is reloaded from disk after each one.

## The loader, in a paragraph

The boot program loads at `$00AE` and starts through the BASIC warm-start
vector it brings. The data it reads from tracks 19 to 22 is packed and is the
only place the resident code can come from. Every later load goes through the
resident's `$0800`, which swaps a fast loader into `$BC00`-`$BFFF`, points the
KERNAL's LOAD vector at it, writes its drive code into the 1541 with M-W and
M-E, and takes each file two bits at a time, timed against the raster. Not
annotated beyond its routines, by policy.
