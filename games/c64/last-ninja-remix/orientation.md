# Last Ninja Remix — orientation

How to get from a copy of the game to the states the listings are built
from. Someone else must be able to follow this exactly.

## The image

Two disk images from archive.org, one item each, cracked by The Force
with Ikari+Talent's trainer (TOSEC: `Last Ninja Remix, The (1990)(System
3)(Side A)[cr Force][t +2 I+T]` and the same with `(Side B)`):

- https://archive.org/details/Last_Ninja_Remix_The_1990_System_3_Side_A_cr_Force_t_2_IT,
  SHA-1 `5597c4896f0a6ada501fb13ad94359063a8c1e29`, saved as
  `work/side-a.d64`
- https://archive.org/details/Last_Ninja_Remix_The_1990_System_3_Side_B_cr_Force_t_2_IT,
  SHA-1 `22f881cff073a4797580f95ca6225903a0bfaa99`, saved as
  `work/side-b.d64`

Side A holds `LAST NINJA REMIX` (The Force's intro), `NINJA INTRO /I+T`
(System 3's intro, the engine, and Ikari+Talent's intro and trainer,
packed together), `01.CENTRAL PARK` and `02.THE STREET`. Side B holds
`03.THE SEWERS` to `07.FINAL BATTLE`. This is not the original release:
the crackers' intros come first, and the trainer adds code of its own to
the end of the engine's interrupt (`$1F52-$1F6B`): a level skip on the ←
key, which is always on (`CoordinateLevelLoad` turns it off for the Final
Battle, at `$171D`), and two `BIT` instructions it turns into `STA`s when
its options are turned on. Every snapshot was taken with both options
off, so the only trainer code that acts in them is the level skip, and
only when ← is pressed; the engine's listing marks the trainer's code. A
second crack, X-Rated's (`[cr X-Rated][h LXT][t +30 X-Rated]` in the same
collection), was used only to compare bytes: its interrupt goes from the
clock straight to restoring `$01`.

The game's manual is the archive.org item
`Last_Ninja_Remix_The_1990_System_3`.

## From power-on to play

On a PAL C64 in VICE (`kit/c64/INSTALL.md`), hard reset, then:

1. Autostart `work/side-a.d64`, file `LAST NINJA REMIX`, and wait 30
   seconds for The Force's intro.
2. Hold port 1 fire for 60 frames; wait 600 frames for Ikari+Talent's
   intro. Hold Space for 60 frames; wait 600 frames for the trainer.
   Leave F1 (unlimited lives) and F3 (unlimited power) at NO. The trainer
   says LEFT ARROW TO SKIP LEVEL whatever the options are.
3. Press F7. System 3's intro starts: its first instruction is `$0800`,
   where `parts/intro/work/entry.vsf` stops. The logo comes first, then
   the temple (by frame 505) and the city (by 1,535); once the city has
   been shown, port 2 fire or the second button ends the intro, which
   otherwise goes back to the logo (by 1,790). Its hand-over (`$0340`)
   loads `NINJA*`, which unpacks the engine; `parts/engine/work/entry.vsf`
   stops on `MachineSetup` (`$0E00`).
4. The engine loads `01*`. The title card is drawn and the tune plays
   (`work/central-title.vsf`, the loader waiting at `$111D`). Press Space;
   the second segment loads and the level's credits appear. Port 2 fire, held for 60 frames, starts play;
   port 1 fire does not. 120 frames later, Central Park in play, is
   `work/central-game.vsf`.

Warp is safe during the loads only; switch it off before play or any
timing.

## The parts

Sixteen parts (`kit/scripts/parts.py`), in the order the game uses them:
System 3's intro, the engine, then for each level its title load and its
play load. A level is one file that the engine's loader unpacks
backwards in two segments; `work/watchload.py` records each segment's
range at `$103B` and stops at the loader's return, `$10F8`.

| Part | Snapshot | How it was reached |
|---|---|---|
| `intro` | `work/entry.vsf` | F7 at the trainer, stopped on `$0800` |
| `engine` | `work/entry.vsf` | after the intro's fire, stopped on `$0E00` |
| `<level>-title` | `work/title.vsf` | the title card on show, the loader at `$111D` |
| `<level>-title` | `work/entry.vsf` | the first segment in, the loader at `$1108` about to call `$4E00` (`work/title_entry.py`) |
| `<level>` | `work/entry.vsf` | the second segment in, the loader at `$10F8` |
| `<level>` | `work/game.vsf` | 300 frames on, port 2 fire for 60 frames, then 120 frames: the level in play |

From one level in play to the next (`work/nextlevel.py`): hold the ←
key, then push the stick left and press fire to answer YES to ARE YOU
SURE YOU ARE PREPARED FOR THE NEXT LEVEL. Before The Sewers the engine
asks for side two (INSERT SIDE TWO, PRESS SPACE): attach
`work/side-b.d64` and press Space once fire is released. The game's own
joystick sequence (`discoveries.html`, "Secret: a joystick sequence ends
any level") does the same without the trainer.

The levels are Central Park, The Street, The Sewers, The Basement, The
Office, The Mansion and The Final Battle (`central-park`, `street`,
`sewers`, `basement`, `office`, `mansion`, `final-battle`). Each level's
snapshots are in its parts' `work/` folders under the names above; the
game folder's `work/` keeps the same captures as `<tag>-entry.vsf`,
`<tag>-title.vsf` and `<tag>-game.vsf`.

## Steady state

In play `$01` is `$35`: RAM everywhere, with the I/O at `$D000-$DFFF` and
no ROM. The hardware IRQ vector `$FFFE` points at the engine's
`GameplayIrqDispatcher` (`$1E15`), and both NMI vectors at the `RTI` at
`$1582`. The video chip sees bank 0: screen `$0400`, multicolour bitmap
`$2000`. The engine (`$1000-$1FFF` and the status panel in the bitmap)
stays in memory through every level; each level file replaces
everything from `$3FF3` up. The engine keeps pages 0 to 3 at
`$0C00-$0FFF` while a level loads and puts them back after. `facts.md`
has the whole memory map.

## The loader, in a paragraph

The engine's own loader (`LoadAndExpandLevelFile`, `$1000`) reads the
level file through the KERNAL and unpacks it as it reads, from the end
backwards: literal runs come straight from the disk and matches are
copied from bytes already written, with bit widths from a table at
`$17E6`. It changes the border colour as it reads. The first segment
ends with the title card, which the loader calls at `$4E00`; it then
plays the level's tune until Space or fire, and unpacks the second.
