# Squirm — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- Mastertronic Collectors Archive, "Game Review: Squirm (Commodore 64,
  Mastertronic)", https://mastertronic.co.uk/game-review-squirm-commodore-64-mastertronic/,
  read 30 October 2026. The fullest description of this version.
- MobyGames' description of Squirm, as quoted in the metadata of the
  Internet Archive item `d64_Squirm_1984_Mastertronic`
  (https://archive.org/details/d64_Squirm_1984_Mastertronic), read 30
  October 2026. MobyGames' own page answered with a browser check. It
  mentions a glow worm and lights going out, which the Collectors
  Archive's review of the Commodore 16 conversion describes as that
  version's additions.
- Mastertronic Collectors Archive, "Game Review: Squirm (Commodore 16 and
  Plus/4, Mastertronic)",
  https://mastertronic.co.uk/game-review-squirm-commodore-16-and-plus-4-mastertronic/,
  read 30 October 2026. About the conversion, by the same programmer; used
  only to name features worth looking for here.
- The cassette inlay, scanned by the Ultimate Tape Archive
  (https://archive.org/details/uta_Squirm_1984_Mastertronic_9165), read 30
  October 2026: loading instructions only, no instructions for play.
- C64-Wiki has no page for the game (30 October 2026).
- The game's own screens: the title names the joystick port, the
  "MYSTERY BONUS" and "10 POINTS FOR" the eggs.

## Features

| Feature | Status | Where |
|---|---|---|
| A maze on one screen, seen from above; a new maze each level | live | three maze screens at `$16D2`, `$1A1A`, `$1D62`, chosen in turn by `$2682` (`$390E`) |
| The player moves like Pac-Man: keeps going until the stick turns it or a wall stops it | live | `$306E` with `$3014`/`$2FF9` |
| Joystick in port 1 | live | every read is `$DC01` |
| Keyboard control | live | no routine of its own: `$DC01` reads keyboard row 7 as well as port 1, so 1, ←, CTRL, 2 and SPACE act as up, down, left, right and fire (`$306E`); each moved the player, and SPACE started a game |
| The Queen Squirm lays eggs; collect them for 10 points each | live | the worm at `$2648` and the one at `$2676` leave an egg (`$46`) where their tail was; an egg under the player adds 1 to the tens digit (`$3C04`) |
| 255 eggs complete a level (the review); 250 or 200 (MobyGames) | live (255) | `$3C09`: the count `$2690` reaching `$FF`; with the count poked to 254, one egg ended the level |
| A rising tone with each egg | confirmed | `$3C0F` writes the egg count to voice 1's pitch |
| Guard squirms; touching a squirm or the queen costs one of three lives | confirmed | `$3C2C`: the head `$43` or a body `$44` under the player |
| Guards eat the eggs | confirmed | a worm may step onto an egg (`$3C93`), and the guards' tails leave a space |
| Guards respawn at random if eaten by the queen | differs | a worm whose four tries in one step are all blocked has its head put back on its own start cell (`$3377`); nothing is random, and no worm eats another |
| Exits at each end of the maze lead to the other side | live | no code of its own: positions are screen addresses, so a step left from column 0 lands on column 39 of the row above (`$304E`), and the mazes leave those cells open; left from the start cell (12, 0) arrived at (11, 39) |
| Bonus run after the eggs: limited time, eat the squirms for points, no going back over your own path | live | `$3780`: the timer counts 900 down once an interrupt, 901 interrupts in all; bodies 100, heads 200, eggs 10; the player leaves character `$00`, a wall, behind it |
| From level 2, bonus treasures worth a random 10 or 100 | confirmed | `$39DF`; the value depends on `$2684` at the moment of collection, which steps 1, 2, 3 every pass: nothing, 10 or 100 |
| A title theme that "almost feels like it plays at random" | confirmed | `$3BB2`: 100 steps of two tables on voices 1 and 2, high byte of the pitch only |
| Glow worm; lights go out (MobyGames) | differs | not in this version: nothing darkens the maze. Its colour RAM is written in play only by `colour_maze` (`$35E8`) as a level starts, the walls' colours `$D022`/`$D023` only by `new_game` (`$3B5C`) and the death flash (`$3AD0`-`$3AF2`), and the five worms are the only creatures (`$2648`-`$267F`). The C16 review names both as additions of that version |
| Two players taking turns (MobyGames) | differs | one player only: the score is one row of digits on the top line (`$0414`), the lives one byte (`$2685`, written only at `$3B9D` and `$3C34`), and the title starts one game on fire |
| Fire for a second speed (the C16 review) | differs | fire alone stops the player (`$3060`); the game's speed is `step_delay`, which only the level cycle changes (`$3A72`) |
| U and B keys to pick the level (the C16 review) | differs | not in this version: the only key read through the KERNAL is F1 (`$C5`, read once at `$3C67`), and `$DC01` sees only keyboard row 7, which holds neither U nor B; every game starts on level 1 (`$3BEB`) |
| A life for each level completed (the C16 review) | differs | not in this version: lives are set to 3 at `$3B9D` and only lowered (`$3C34`); the references search finds no other write |

## Beyond the documentation

- **Pause.** F1 during play silences the sound and waits for fire alone (`$3C67`, `$3C73`).
- **Fire stops the player.** Fire with no direction parks the player where it stands (`$3060`).
- **A high-score table with name entry**, kept in the screen that shows it (`$1042`).
- **The game speeds up.** After the fourth level of each cycle the step delay `$2689` shortens by a jiffy (`$3A72`), from six jiffies a step on level 1 to none at all from level 25. *Live* for the first step.
- **Level 19 is followed by level 10.** The level counter sets its tens digit to 1 instead of adding 1 (`$3887`), so the number runs 10 to 19 over and over. *Live*.
- **The worms change colour as they move.** Every open cell of the maze has its own colour, set by its position from a counter that steps 1 to 7 on every cell, and nothing recolours a cell, so whatever is drawn takes the colour of the cell it is on (`$35E8`).
- **The worms catch the player by moving onto it.** Their test of a free cell takes the player's character as free (`$3C93`); an older version of the test, still in memory and never run, did not (`$32D5`).
- **The death sounds different on the two SID chips.** The fall lowers the noise's pitch with `DEC $D401`, which reads the chip's fading data bus instead of the pitch: on an 8580 the pitch steps down a row at a time, on a 6581 it jumps to the top after the first step (`$3A8F`). *Live* on both in VICE.
- **A new high score wipes the score from the top line.** Writing the new HI redraws the status lines from their templates, whose score is 000000 (`$3258`). *Live*.

## Open questions

None that the code leaves open. The rows marked differs come from descriptions of the Commodore 16 conversion or from MobyGames' description, which mixes the two versions.
