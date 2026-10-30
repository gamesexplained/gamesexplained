# Cliff diving: facts

File `G` of side 1, unpacked at `$1000`; the travelogue sets it at La
Quebrada in Acapulco, Mexico. Every fact names the routine or table it
comes from, in this part's listing.

## Memory

| Range | What |
|---|---|
| `$1000`-`$2B4A` | the code: the states of a dive, the interrupts, the scroll, the poses' lists |
| `$3000`-`$3FFF` | the cliff's map, 40 characters a row, about 102 rows from the top to the sea (`cd_cliff_map`) |
| `$4800`-`$4FFF` | the character set: cliff, sky and sea |
| `$5000`-`$52FF` | the letters of the text row |
| `$5300`-`$6FFF` | the sprite shapes that stay; `$7000` takes one of three sets copied in |
| `$8000`-`$8FFF` | the poses: a count of sprites, then four bytes for each |
| `$9000`-`$9FFF` | the cliff's colour map, as the map |
| `$A000`-`$C0FF` | the three sprite sets (`cd_set0` at `$A000`, 14 pages; `cd_set1` at `$AE00`, the splash, 12; `cd_set2` at `$BA00`, the pelican's extra turns, 7) |
| `$C100`-`$CC5A` | the music driver and its tracks |
| `$E000`-`$F680` | the colour scroll, 5760 bytes of `LDA`/`STA` written at the start |

## The dive

- Six levels, 0 the highest, chosen with up and down (`cd_choose_level`,
  `$1457`). A dive starts with the most it can score and loses points:
  106, 96, 86, 76, 66 and 56 (`cd_level_score`, `$2879`).
- Fire starts the dive, and the stick at that moment sets the push off
  the cliff: left `$0170`, right `$00F0`, neither `$0130`, in 256ths of a
  pixel a frame; up makes the jump rise higher, `$FF90` against `$FFB0`
  (`cd_wait_dive`, `$1612`).
- In the flight the stick sets the body position: down straightens the
  diver, up tucks; a new push costs 5 points, and holding it steps every
  6 frames at no further cost (`cd_body`, `$20C6`). The position sets the
  drag (`cd_drag`, `$1F35`, `$0100` tucked to 0 straight), the most fall
  speed (`cd_fall_limit`, `$1F45`, `$0214` to `$02A0`) and the drift away
  from the cliff (`cd_drift`, `$1F55`, `$38` to 0 a frame). The wind
  pushes toward the cliff.
- The cliff's rock under the diver's sprite (a character of 2 or more)
  is a crash (`cd_cliff_under`, `$1A91`). An entry with the body not
  straight (pose `$66`) is a bad entry and a fault (`cd_entry`, `$16E1`).
- A clean entry loses the sea's level less `$AC` in lines (none with the
  sea at its highest) and half the pixels between the diver's x and
  `$BC`.
- Under the water the diver must turn up with left once 16 deep and
  above y `$A0`; each frame of left too early or too low costs a point,
  and each frame without it after depth `$1A` costs a point
  (`cd_water`, `$1F65`). Touching the bottom (y `$BA` or more, with a
  collision of sprite 3 with the scenery) is a fault, with tune 5
  (`cd_underwater`, `$17D5`).
- Each player's joystick is the first port with anything pressed on the
  level's choice (`$154C`).

## The sea and the wind

- The sea rises and falls: its acceleration turns round every 240
  frames, 120 the first time (`cd_waves`, `$13D2`). Its acceleration is
  random, 64 to 127 plus 0 to 31.
- The wind, 40 to 71 plus 0 to 15, is random for each dive; the arrow's
  length and the wind's sound follow it (`cd_wind_bars`, `$15E1`).

## The pelican and the gull

- A pelican sits on a rock at the sea and looks up, ahead or down at the
  diver (poses 61, 62 and 63, `cd_pelican`, `$25CB`). After the dive it
  plays one of three lists by how the dive went (`cd_pelican_lists`,
  `$266C`).
- At the end, now and then, a random number below 32 picks one of three
  extra turns by its low three bits; in one the pelican flies off left
  and does not come back for the rest of the level (`cd_extras`,
  `$1AE5`).
- A clean dive that scores exactly 101, only possible from level 0, sends
  a gull flying across from the right (`$1870`; `cd_gull_list`, `$273F`;
  wingbeats, poses 76, 77 and 78, `cd_gull_poses`, `$278B`). *Live*,
  30 October 2026: the end of a dive called with scores 101, 100, 102,
  99 and 1 started the gull's list for 101 only, and not for 101 after a
  fault.

## The screen

- The cliff scrolls a row at a time between two screens
  (`cd_scroll_screen`, `$1B41`); its colours scroll through 5760 bytes of
  `LDA`/`STA` pairs written to `$E000` at the start (`cd_scroll_colours`,
  `$1DC8`).
- Sprite sets are copied into `$7000` when needed (`cd_sprite_set`,
  `$10B3`), by the main loop, while everything else runs in the
  interrupts.
- The water's surface has an interrupt of its own: below it the
  multicolours turn blue and two sprites dark grey (`cd_irq_water`,
  `$1379`).

## Sound

The events' music driver. Tunes: 1 the splash, 2 the wind, 3 the waves,
4 now and then, 5 the bottom, 6 the cliff, 7 the start, 8 a level
chosen.

## Leftovers

A smooth scroll from one level to another (`cd_smooth_scroll`, `$28F4`;
`$2799`-`$27CB`) is skipped by the `JMP` at `$2796`; the pose list at
`$24FB` is never started.

## Registers

The processor port (`$01` = `$35`); the VIC-II's raster interrupts
(lines `$61`, the water, `$EF` and `$FA`), vertical scroll, extended
colour and multicolour, sprites with their collisions, and colours;
the SID's voices, filter and volume, and voice 3's oscillator; CIA 1's
port for the joysticks; CIA 2's port A for the VIC bank.

## Strings

In screen codes: "SELECT LEVEL", "PRESS YOUR BUTTON", "PRACTICE
AGAIN?", YES, NO, "SCORE", "FAULT" and "CONTESTANT" in the text row.
