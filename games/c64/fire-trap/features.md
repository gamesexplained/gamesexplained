# Fire Trap — features

What the game is documented to do, with its status against the binary.
Statuses: **open** (documented, not found yet), **traced** (in the code,
could not be exercised), **confirmed** (in the code and consistent with the
emulator), **live** (observed directly in the emulator), **differs**.

Sources:

- A retro blog's comparison of the Data East arcade game and its home versions
  (frgcb.blogspot.com, "Firetrap, Data East, 1986"), read second-hand through
  a research subagent on 10 November 2026. It gives the premise, the
  home-version controls, the items and the C64 credits.
- MobyGames' release page for Firetrap, read the same way on the same date:
  the C64 version is by Source Software House, published by Electric Dreams
  Software, floppy, 1987.
- The game's own screens and stored text, read from the snapshot on
  10 November 2026. The manual, the C64-Wiki page and magazine reviews could
  not be fetched (the sites refused automated reads), so nothing here comes
  from them.

## Features

| Feature | Status | Where |
|---|---|---|
| Electric Dreams logo with the word PRESENTS | live | `work/entry.vsf` run; text at `$CFBA`; `reference/title-electric-dreams-logo.png` |
| Title screen with the Source Software House credits (`(C)1987 ELECTRIC DREAMS SOFTWARE ... CODING, GRAPHICS AND MUSIC BY SOURCE THE SOFTWARE HOUSE LIMITED`) | live | text at `$BED8`; `reference/title-credits.png` |
| High-score table, TODAY'S BEST FIREFIGHTERS, five ranks with name, score and stage | live | text at `$BED8`; `reference/high-score-table.png` |
| Attract loop of logo, title, high scores and a demonstration stage, repeating | live | `$1012`-`$1046`; stage 1 and stage 2 both demonstrated |
| Get Ready screen with a small map of the building, START at the bottom and FINISH at the top | live | `reference/stage1-get-ready.png` |
| Vertical scrolling climb up a burning skyscraper, the firefighter held at one side of the screen | live | `$16DA`, `$17B0`; `reference/stage1-demo-play.png` |
| Status line: STAGE, POINTS, TIME (counting down from 999), lives (hose icon and a count of 4) and HIGH | live | text at `$C06C`; `reference/stage1-demo-play.png` |
| Window fires that grow, then throw down falling debris | traced | `$2195`, `$223A`, `$2322` |
| Water spray fired by the firefighter, up to six shots at once, at most two the same way | traced | `$1F88`, `$2048` |
| Joystick control: up and down climb, left and right move, fire sprays; the game acts on joystick port 2, and when it is idle the keys Q, Z, comma, full stop and space stand in | live | `$2A31`, `$FFAA`; each direction and fire held in the emulator |
| Sixteen stages (the stage number runs 1 to 16 and wraps) | traced | `$10B8`-`$10C0`, `$13D0`-`$13D6` |
| Stage colour schemes (blue building, green building) | live | `reference/stage2-demo-play.png` |
| Player hit by fire or debris: falls, loses a life | traced | `$1CD4` |
| Name entry for a high score on a letter grid with RUB and END | traced | strings at `$FC43` and `$FF0A` |
| Money bags for bonus points | open | documented by the blog; pickup kinds 0 and 1 score 1,000 and 2,000 points (`update_pickups`, `$3524`) and are the likely money bags, but their look on screen is not confirmed |
| Weapon upgrades that fire left, right and up at once | traced | `$1A75` sets flag `$78`, and the spray then fires three ways (`$1B11`-`$1B27`); the pickup is not yet seen on the screen |
| Suit upgrades | open | a second pickup state at `$1A93` starts a countdown in `$74`; whether it is a suit is not confirmed |
| Parachutes given to people and pets that are rescued | open | people at windows are freed when the firefighter reaches their window, for 300 points; they rise, then fall drawn as two sprites, which may be the parachute (`$36DC`); not seen in play |
| Rescue at the top of each building, then the descent | traced | the end-of-stage states at `$1B34`, `$1B4D`, `$1BB2`, `$1C01` and `$1C32` play a run of pictures, then the firefighter floats down; the rescued person is not yet seen on the screen |
| Extinguisher range of about two windows | open | the blog's description of this version |
| Music and sound effects | traced | the sound driver at `$8000`-`$843B`; tunes and effects chosen through `$B4` and `$B5` |

## Beyond the documentation

- The game runs its logic every fourth video frame: the stage loop at `$13AB`
  waits for the frame counter to reach 4 before it runs the next tick, so the
  game updates at about 12.5 times a second on a PAL machine.
- The sprites are multiplexed from a table at `$0900`: each routine that
  places an object adds a four-byte record there and the raster handlers draw
  them.
- A raster-interrupt list engine (`$29BE`, `$2944`) runs the screen: each frame
  walks a short table of handler address and raster line pairs, so the screen
  is split at different lines in the title and in play.

## Open questions

- The C64 manual and magazine reviews could not be read, so the controls,
  scoring values and the time limit are known only from the code and the
  emulator.
- Which kinds the pickup table at `$09B8` holds, and so whether the C64 version
  has the blog's money bags and suits.
- What the stage number 0 displayed after the last stage means (the stage number in `$4C` runs 1 to 16 and wraps back to 1, so a 0 may be a display quirk).
