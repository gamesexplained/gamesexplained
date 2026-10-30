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
| Keyboard control | open | MobyGames says joystick or keyboard. The only key read is F1 (`$C5`); the stick's port 1 shares `$DC01` with the keyboard's columns |
| The Queen Squirm lays eggs; collect them for 10 points each | confirmed | the worm at `$2648` and the one at `$2676` leave an egg (`$46`) where their tail was; an egg under the player adds 1 to the tens digit (`$3C04`) |
| 255 eggs complete a level (the review); 250 or 200 (MobyGames) | confirmed (255) | `$3C09`: the count `$2690` reaching `$FF` |
| A rising tone with each egg | confirmed | `$3C0F` writes the egg count to voice 1's pitch |
| Guard squirms; touching a squirm or the queen costs one of three lives | confirmed | `$3C2C`: the head `$43` or a body `$44` under the player |
| Guards eat the eggs | confirmed | a worm may step onto an egg (`$3C93`), and the guards' tails leave a space |
| Guards respawn at random if eaten by the queen | differs | a worm that finds all four ways blocked five times running is put back at its own start cell (`$3377`); nothing is random |
| Exits at each end of the maze lead to the other side | open | |
| Bonus run after the eggs: limited time, eat the squirms for points, no going back over your own path | confirmed | `$3780`: the timer counts 900 down once an interrupt; the player leaves char `$00`, a wall, behind it |
| From level 2, bonus treasures worth a random 10 or 100 | confirmed | `$39DF`; the value depends on `$2684` at the moment of collection, which steps 1, 2, 3 every pass: nothing, 10 or 100 |
| A title theme that "almost feels like it plays at random" | confirmed | `$3BB2`: 100 steps of two tables on voices 1 and 2, high byte of the pitch only |
| Glow worm; lights go out (MobyGames) | open | no code found that darkens the maze; the C16 review names both as additions of that version |
| Two players taking turns (MobyGames) | open | no second score or player variable found yet |
| Fire for a second speed (the C16 review) | differs | fire alone stops the player (`$3060`) |
| U and B keys to pick the level (the C16 review) | open | no key but F1 is read |
| A life for each level completed (the C16 review) | open | |

## Beyond the documentation

- **Pause.** F1 during play silences the sound and waits for fire alone (`$3C67`, `$3C73`).
- **Fire stops the player.** Fire with no direction parks the player where it stands (`$3060`).
- **A high-score table with name entry**, kept in the screen that shows it (`$1042`).
- **The game speeds up.** After the fourth level of each cycle the step delay `$2689` shortens by a jiffy (`$3A72`).

## Open questions
