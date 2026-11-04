# Stunt Car Racer — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`stunt_car_racer[microprose_1989](pal).zip` from the C64 Preservation
Project's 10th Anniversary Collection on archive.org
(`C64_Preservation_Project_10th_Anniversary_Collection_G64.zip`), holding
one G64, saved as `work/stunt-car-racer.g64` (309,954 bytes, SHA-1
`0540264fca9bd8583c4bfcc9a6f422b2ac25f5c9`). It is the original MicroProse
release for PAL machines, not a crack. The directory, headed `DISK` with
id `D1`, holds one program, `*` (3 blocks, 593 bytes, loading at
`$0302`), and eight empty SEQ entries that each claim 257 blocks; the
game itself is on 330 sectors from track 2 to track 32 that no
directory entry names. Loading `$` and the empty entries is how the disk
hides its contents from a casual look.

## From power-on to play

1. `python3 kit/scripts/tools.py --platform c64 vice` (VICE 3.14.0 with
   the MCP server, `kit/skills/c64/tool-vice-mcp`). A hard reset, then
   `vice_autostart` on the G64. Drive emulation stays on (the loader is
   its own).
2. The loader shows a copyright screen, then the loading picture (`reference/copyright.png`,
   `reference/loading-picture.png`). Set an execute checkpoint on `$4000`
   once the autostart is 15 seconds in; it stops at the game's start-up,
   the loader's last jump. That is the hand-over, saved as
   `work/entry.vsf`.
3. Run on. The menu "Single Player League / Multiplayer" appears a few
   seconds later (`reference/menu.png`); `work/menu.vsf` is saved there.
   The menus are driven by the joystick in port 2: up and down move the
   bar, fire chooses. The keyboard is read only for names.
4. Fire (Single Player League), wait about 5 seconds, type a name (`ACE`
   was used), RETURN, wait 3 seconds: the league table. Fire: the main
   menu. Fire on Practise, fire on Division 4, fire on Little Ramp, wait 5
   seconds for the track preview, fire, wait 10 seconds: the crane lifts
   the car. Hold fire for 3 seconds to drop it, then save
   `work/play-practice.vsf`. Hold up (accelerate) for 6 seconds and save
   `work/play.vsf`.
5. The game never touches the disk after the hand-over except for Load
   and Save. Those refuse to work on the game disk itself ("DIR NOT
   loaded" and "Problem encountered" on 4 November 2026); a blank disk
   formatted by VICE (`work/saves.d64`) takes the saves.

`kit/c64/codemap.py ... zap` from `work/entry.vsf`, then the route above,
a race and a season in warp mode, a Hall of Fame, a save and a load,
recorded `codemap.json`.

## Steady state

- Interrupts: the IRQ vector at `$FFFE` points to `$CDAA` and the NMI
  vector at `$FFFA` to `$9A32`, both set by the start-up and never
  changed. The KERNAL and BASIC ROMs are out for good: `$01` is `$35`
  (I/O in, no ROMs) in play, and `$34` (all RAM) while the game reads or
  writes the RAM under the I/O area, with interrupts off.
- Video: bank 1 (`$4000`-`$7FFF`). Multicolour bitmap mode. The screen
  is at `$5C00` with its sprite pointers at `$5FF8`; the two bitmaps are
  at `$4000` and `$6000`, and the 3D view is drawn into each in turn. The
  interrupt chooses which is shown at raster line 62 (`$D018` = `$70` for
  the bitmap at `$4000`, `$78` for the one at `$6000`) and puts `$78`
  back at line 197 for the dashboard, which lives only in the bitmap at
  `$6000`.
- The start-up (`$4000`-`$42A8`) runs once and is then overwritten by
  the bitmaps, so `work/entry.vsf` is the only image that holds it and
  the listing is built from it. It copies the game's tables from
  `$4F00`-`$56FF`, `$7B00`-`$7FFF` and `$AE00` into the RAM under the I/O
  area (`$D000`-`$DDFF`), and others to `$5800`-`$5BFF`, `$57C0`,
  `$7F40` and `$C000`-`$C2FF`.
- The game is one load. Nothing is loaded per track.

## The loader, in a paragraph

`*` loads at `$0302`, over BASIC's warm-start vector, so the BASIC loop
jumps into it as soon as the load ends (at `$0330`). It decrypts its own
code with an exclusive-or loop and then reads the game's sectors with a
routine of its own, showing the loading picture, and jumps to `$4000`.
Not annotated further, by policy.
