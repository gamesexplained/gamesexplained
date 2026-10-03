# Way of the Exploding Fist — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The contributor allowed looking the game up online. On 2 October 2026
  this session's network refused every page fetch (C64-Wiki, the Internet
  Archive's Wayback Machine and search, Wikipedia: HTTP 403 from the
  proxy). What is below from the web comes from web search result
  summaries, read the same day, of these pages: C64-Wiki,
  `https://www.c64-wiki.com/wiki/The_Way_of_the_Exploding_Fist`;
  Wikipedia, `https://en.wikipedia.org/wiki/The_Way_of_the_Exploding_Fist`;
  Lemon64's manual page, `https://www.lemon64.com/doc/way-of-the-exploding-fist/665`;
  the World of Spectrum inlay (a Spectrum document);
  `https://frgcb.blogspot.com/2021/01/the-way-of-exploding-fist-melbourne.html`.
  They are second-hand: leads, weaker than a page.
- Credits, from those summaries: designed by Gregg Barnett, written by
  Beam Software, programming by Gregg Barnett and David Johnston,
  graphics by Greg Holland, music by Neil Brennan; published by Melbourne
  House, June 1985. The game carries no credits of its own.
- The game's own screens in the emulator, 2 October 2026
  (`reference/`), and the code (facts.md).

## Features

| Feature | Status | Where |
|---|---|---|
| Attract mode: the computer fights itself under `DEMO`, cycling through the backdrops | confirmed | `$1CD2`; live, `reference/demo*.png` |
| F1 starts a game; F5 abandons it and returns to the attract mode | confirmed | `$1E64`; live |
| F3 switches between `1 PLAYER` and `2 PLAYER` | confirmed | `$1EA8`, `$AE`; live, `reference/options-2player.png` |
| F7 switches between `JOYSTICK` and `KEYBOARD` control | confirmed | `$1EC5`, `$C6`; live, `reference/options-keyboard.png` |
| Fire starts a one-player game from the attract mode | confirmed | `$1E64`; live on port 2, and on port 1, which shares `$DC01` with the keyboard columns |
| 18 movements from the joystick, eight directions with and without fire | confirmed | `stick_to_move` `$286C`; live, all sixteen inputs read back as move numbers (facts.md, Controls). Which named kick or punch each fire move is was judged from screenshots only for some |
| Keyboard controls, the alternative to the joystick | traced | `$28B2`-`$29B3`: Q W E / A D / Z X C and S or left SHIFT for player 1; P @ * / L ; / , . / and : or right SHIFT for player 2. Not typed live |
| Two players fight each other, one stick each | confirmed | `$1B09`; fighter 0 on port 2, fighter 1 on port 1 (`$2851`); live |
| Scoring with yin-yang symbols: half or whole by the quality of the blow; two whole symbols win the bout | confirmed | quality is distance: `$2B70`-`$2C40` against the reach profiles at `$7200`; four halves (`$8A,X`) win (`$1D5F`); live, a whole point at a distance of 12 |
| A bout lasts 30 seconds on a counter; when time runs out the referee decides | differs | the counter (`$212F`) counts 30 units of 50 passes of the exchange loop, measured at 50 to 66 PAL frames a unit, so 30 to 40 seconds; the decision (`$1C72`, `$1F93`) goes to more halves, then more points; live, the judge's sprites at the end of a two-player game |
| Points scored per blow, shown for each player, and a high score | confirmed | `$12A5`, `$206C`, `$200A`; a high score per mode and a five-place table with names (`$146A`); live, 200 points for a whole point with move `$0C` |
| Ranks from novice to tenth dan, each opponent harder than the last | confirmed | `$B4`, `$22C3`, `$1C2D`; the computer's level rises with each bout won and sets its timing masks (`$2593`); two bout wins per rank (`$B5`) |
| The backdrop changes with progress: Fuji with a pagoda and a torii, a lake under a volcano, a dojo, a Buddha statue | confirmed | `$AF AND 3`; all four packed in memory (`$3F5F`-`$71FF`) and unpacked by `$17BB`/`$1849`; decoded and rendered from the image |
| A bonus round in which a bull charges and must be felled with one blow | confirmed | `bull_round` `$132C`, after a rank cleared on the Buddha backdrop; only move 7 (down-forward from a crouch) at a distance of `$19`-`$1D` fells it, for 3000 points; live, `reference/bull-charge.png`, `reference/bull-felled.png` |
| A computer opponent that fights back | confirmed | `ai_think` `$22CF`: blocks, nine scripted plans, attacks by distance; live, `reference/play-novice-knockdown.png` |
| A shadow under a fighter in the air | confirmed | the line-`$D9` handler draws fixed sprites from `$D480` at Y `$DA`; live, `reference/jump-shadow.png` |
| A shout ("kiai") during loading; the disk carries `m.spchtbl` and `m.tsound` | open | the game itself has a one-bit speech player (`$311A`) with four samples at `$F540`, started on attacks and hits; its samples are the disk file `m.xsprites` (at `$F540`) and its period table `m.prerun`. The loader's shout is the loader's, not read by policy; `m.spchtbl` and `m.tsound` are not in the game's memory as they stand on disk |
| Music by Neil Brennan | confirmed | the driver at `$09A5` and four songs; song 2 live in a one-player bout; tuned for NTSC, so two-thirds of a semitone flat on PAL (facts.md, Sound) |
| Sound effects on and off with DEL (the menu program's text) | confirmed | DEL flips `$CF` (`$1ED8`), which switches the speech samples off (`$3186`); live, `$CF` 0 to 1 |

## Beyond the documentation

Found in the code, not in the manual.

- Holding fire at the end of a one-player game skips the high-score
  table and leaves the new entry named `......` (`$1472`).
- A trap: if CIA 2's timer A is running when a blow scores, the game
  crashes (`$2CAE`; live).
- Past tenth dan the opponent's level is chosen at random from 7 to 10
  while the rank still reads 10TH DAN (`$1C65`).
- The one-bit speech player toggles the SID's master volume, so every
  shout is played through the volume register while the music runs.

## Open questions

- `m.tsound` (5,632 bytes) and `m.spchtbl` (768) are not in the game's
  memory as they stand on disk (searched in 16-byte pieces in both
  snapshots); they may be the loader's shout, not checked.
- Why `blow_reaction` tests CIA 2's timer A (`$2CAE`) is not known.
- Gaps of exactly `$15` lines between the fighters' tops ask two row
  changes of the same raster line (`$32EA`, `$32FD`); whether a row then
  shows a frame late was not tested.
