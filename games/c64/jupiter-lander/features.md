# Jupiter Lander — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **confirmed** (traced in the code), **live** (also
observed in the emulator), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The game's own instruction screen, read out of the binary at
  `$E874`–`$E9F1` and captured in `reference/instructions-screen.png`.
- The documentation the cracker typed into the release, four pages reached
  by pressing space at the loader. It is a transcript of the manual.
- The C64-Wiki entry for Jupiter Lander,
  <https://www.c64-wiki.com/wiki/Jupiter_Lander>, fetched 2026-09-13.

## Features

| Feature | Status | Where |
|---|---|---|
| Land the ship on one of three sites | **live** | `check_on_pad` `$E3B5`, pad tables `$E3E7`–`$E3F8` |
| Three sites carry different score multipliers, 2x, 5x and 10x | **live** | `touchdown` `$E55C`; measured 1600, 4000 and 8000 for a perfect landing |
| Vertical velocity must be low enough to land | **live** | `touchdown` `$E56E`; the limit is `$0048` |
| Score depends on the landing velocity | **live** | `touchdown` `$E581`, base is 80 minus the velocity |
| Score is multiplied by the number painted beside the pad | **live** | `touchdown` `$E586`–`$E59F` |
| A successful landing refuels the ship | **live** | `touchdown` `$E5E0`, 70 units per point scored |
| Fuel depletes while thrusting | **live** | `move_ship`; 111 per pass for the main engine, 30 for a side jet |
| Main thruster lifts the ship (F1 or fire) | **live** | `read_controls` `$EB9C`, `move_ship` `$E328` |
| Left manoeuvring thruster on A, moves the ship right | **live** | `read_controls` `$EBC9`; world X rose with A held |
| Right manoeuvring thruster on D, moves the ship left | **live** | `read_controls` `$EBC9`; world X fell with D held |
| Joystick in port 1: left, right and fire | **traced** | `read_controls` `$EB7A`–`$EB99`. Could not be exercised: see "Open questions" |
| The ship is destroyed by touching the rock | **live** | `main_loop` `$E144` reads `$D01F`, sprite-to-background collision |
| The ship is destroyed by landing too fast | **live** | `landing_too_fast` `$E624`, prints SORRY NO BONUS |
| A velocity gauge in m/s on the right of the screen | **live** | `draw_velocity_gauge` `$EC01`, `draw_hud` `$ED7C` |
| A yellow band on the gauge marks a safe landing speed | **differs** | One yellow cell at screen row 12 covers velocities 0 to 63; the code accepts up to 71 and accepts every upward velocity. See below |
| Score and high score on screen | **live** | `draw_scores` `$EE5A`; both are 4-digit BCD shown with a trailing zero |
| Fuel bar on screen | **live** | `draw_fuel_bar` `$EBD6` |
| The game ends when the tank is empty | **differs** | Running dry cuts the engines and prints OUT OF FUEL, but the game continues until the next impact (`explode` `$E4C7`) |
| The view zooms in near a landing site | **live** | `zone_for_position` `$E1C4`, `close_view_sprites` `$E3A1` |
| Difficulty increases as the game goes on | **live** | `gravity_table` `$E0DE`, indexed by the landing number, capped at 16 |
| "For a perfect landing on the 10x platform you can grab 7.000 points" (C64-Wiki) | **differs** | A perfect landing on the x10 pad scores 800, shown as **8000**. Measured live |
| Attract sequence with a demonstration flight | **live** | `attract_demo` `$E9F2` |
| Title screen with the Commodore wordmark | **live** | `draw_title_logo` `$F266`, `reference/boot-title-logo.png` |

## Beyond the documentation

Found in the code, not in the manual, each verified live.

| Finding | Evidence |
|---|---|
| **A ship that arrives climbing scores more than a perfect stop.** The bonus is an 8-bit `80 − velocity`, so a velocity of −16 gives a base of 96. Landing at −16 on the x10 pad shows `960 X 10= 9600`, above the 8000 of a perfect stop. | `touchdown` `$E581`; measured by entering `touchdown` with the velocity poked |
| **The safe speed is 8 units wider than the yellow cell, and the boundary is one pixel wide.** The yellow cell covers velocities 0 to 63; the landing test accepts up to 71. The needle moves in steps of 8, so 71 (lands, 900 points) and 72 (SORRY NO BONUS) are one eighth of a character apart, and both are below the yellow. | `draw_velocity_gauge` `$EC01` and `touchdown` `$E56E`; markers read out of screen column 39 for 13 velocities |
| **The last 255 units of fuel can never be spent.** `move_ship` clears both thrust flags when the fuel high byte is zero, so the low byte is frozen. | With fuel `$01FF` and F1 held, the ship lifted and the tank fell to `$00B2`. With `$00FF` it did neither |
| **Every score on screen is ten times the number the game counts.** The status line prints four BCD digits and then a fixed `0` that is part of the static template. | `hud_text_template` `$ED2C`, `draw_scores` `$EE5A`, `draw_bonus_line` `$E738` |
| **There is no frame sync and no interrupt during play.** The only `cli` is in the attract entry; play runs with interrupts masked and times itself with a counting loop. | `attract_entry` `$E7A9`, `start_game` `$E093`; a checkpoint on the interrupt handler took 0 hits over 5 seconds of play |
| **The flashing PUSH F1 TO START prompt is the only thing the interrupt does**, apart from watching for F1. | `irq_tick` `$EB46` writes 18 colour cells at `$DBCA`, exactly the 18 characters at screen `$07CA` |
| **A pad is a single line in the world, matched exactly.** A ship descending faster than one world unit per pass can step over it, and then dies on the rock instead of being told it landed too fast. | `check_on_pad` `$E3B9` compares both bytes of Y for equality |
| **The zoom is four hand-drawn pictures, not a scaled one.** Each view has its own run-length stream; the only thing actually scaled is the sprite, doubled through `$D017` and `$D01D`. | `view_stream_lo`/`_hi` `$ECD4`, `close_view_sprites` `$E3A1` |
| **The explosion is the lander.** `explode` increments the sprite pointer seven times from the lander shape, so frame 0 of the fireball is the ship itself. | `explode_frame_loop` `$E473` |
| **The character set and the sprites share one 2 KB block.** Glyphs `$80`–`$FF` are the sprite bitmaps seen as 8×8 cells, and nothing ever selects them. | `$D018`=`$1E`, sprite pointers `$F0`–`$FF` resolve into `$3C00`–`$3FFF` |
| **A Commodore badge is carved into the rock in all four views**, as terrain data rather than as an overlay. | glyphs `$0C`–`$0F` appear in all four decoded streams |
| **The crash fuel penalty is clamped.** Impact speed shifted right by four comes off the fuel high byte, but any speed above `$01FF` costs the same 31 high bytes. | `explode` `$E498`; `$0200` and `$0300` both cost `$1F00` |

## Open questions

- **The joystick path is traced but not observed.** `read_controls`
  (`$EB7A`–`$EB99`) reads `$DC01` with `$DC00` set to `$FF` and maps bits 2,
  3 and 4 to left thrust, right thrust and up thrust, which is the standard
  port 1 wiring. It could not be exercised: `vice_joystick_set` and
  `vice_joystick_tap` produce no change at `$DC00` or `$DC01` in this
  vice-mcp build, with either port and with the fire button, and the server
  exposes no joystick device resource to turn one on. The keyboard path
  through the same routine is confirmed live. What would settle it is a
  build with a working joystick, or a monitor-level write into the CIA's
  latched port value.
- **Why the two `nop`s at `$E7AD`.** They sit between the title logo call
  and a `sta $d020`, so the border takes whatever the logo routine left in
  the accumulator. Two bytes is exactly the width of an `lda #$xx`. It may
  be a patch by the cracker or it may be original; nothing in the image
  decides it, and there is no clean copy here to compare against.
- **What the original cartridge looked like.** Everything here is the
  Remember crack. The engine's own layout at `$E000`–`$F450` with all three
  hardware vectors pointing into it is consistent with an 8 KB cartridge
  mapped where the KERNAL sits, but the loader was not annotated and no
  cartridge dump was compared.
