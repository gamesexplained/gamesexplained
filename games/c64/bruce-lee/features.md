# Bruce Lee — features

What the game is documented to do, with its status against the program. Statuses: **open** (documented, not found yet), **traced**, **confirmed**, **live** (observed in the emulator), **differs**. "Absent" is not a status.

Sources:

- The game's own text page (a manual-style page the Remember crack shows before the game; screen text read from the emulator, 10 November 2026): twenty secret chambers, "dazzling graphics and animation", "unique multiple player options", and the story of a fortress where Bruce Lee seeks infinite wealth and the secret of immortality from the Wizard.
- C64-Wiki, "Bruce Lee", https://www.c64-wiki.com/wiki/Bruce_Lee, read 10 November 2026 (game modes, joystick, scores, enemies, cheat).
- Wikipedia, "Bruce Lee (video game)", https://en.wikipedia.org/wiki/Bruce_Lee_(video_game), read 10 November 2026 (credits: Ron J. Fortier code, Kelly Day graphics, John A. Fitzpatrick music; the Atari 8-bit original of 1984, ports the same year; the second loop).
- The game's own screens in the emulator, the same day.

## Features

| Feature | Status | Where |
|---|---|---|
| Twenty chambers, each one screen, reached by crossing screen edges or through doors | open | the C64-Wiki says screens switch at the borders |
| Collecting every lantern in a chamber opens doors to other chambers | open | C64-Wiki |
| Climbing nets up, down and sideways | open | C64-Wiki |
| Joystick in port 2: left and right walk, up jumps or climbs, down lies flat or climbs down, fire with no movement punches, fire while running kicks, kick in mid-jump | live (walk, jump, kick, duck and fire seen in room one) | joystick read through `$DC00`/`$DC01` |
| The black Ninja, knocked out by two kicks, attacks with a stick | open | C64-Wiki |
| Yamo, the green sumo-style fighter, needs three kicks, can kick in the air | open | C64-Wiki; green figure live in room one |
| Traps in chambers (the Wikipedia page names mines, moving walls and an electrified comb) | open | |
| Falls counter on the status line (`FALLS 04`), five lives | open | the status text `FALLS` is at `$4498`; whether four more falls end the game is not tested |
| Score, top score, status line with `1UP` in a two-player game | live | |
| Two-player modes: one player against the computer, two players alternating as Bruce, Bruce against a player-controlled Yamo | open | menu `F3` and `F5` live; the modes themselves not tried |
| Menu keys: `F3` one or two players, `F5` computer or opponent, `F7` begin | live | menu snapshot |
| Joystick orientation messages for joysticks 1 and 2, left-handed and right-handed | open | strings at `$44CF`-`$4548` |
| Pause with SPACE and the PAUSED text | open | string at `$4580` |
| Score table: landing on an enemy 50, kick 75, punch 100, lantern 125, enemy beaten 200 (Ninja) or 450 (Yamo), entering a new room 2000, the Wizard 3000 | open | C64-Wiki |
| The Wizard's chamber and the end of the game, `CONGRATULATIONS` | open | string at `$4752` |
| The second pass: enemies come back at once when killed and one safe room loses its safe spots | open | C64-Wiki, Wikipedia |
| Music in the menu only, sound effects in play | open | C64-Wiki; the player's credit string is at `$E314` |
| `GAME OVER` | open | string at `$4598` |

## Beyond the documentation

- The disk is a crack by Remember with a one-line `SYS` stub, a packed program, an intro, a text page and two trainer questions. The crack's code sits in front of the game and copies the game's start-up block to `$0400` (`orientation.md`).
- The sound routines are credited in the game's own memory, at `$E314`: "Micropearl Music Player, copyright 1983 John A. Fitzpatrick".

## Open questions

- What the two trainer options change in the game, and whether the code is otherwise the original's. C64-Wiki says the original's unlimited-lives cheat is `POKE 5472,99` (`$1560`), not checked here.
- Every row marked open above. A Bronze run stops after the sweep.
