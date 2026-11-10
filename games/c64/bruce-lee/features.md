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
| Twenty chambers, each one screen, reached by crossing screen edges or through doors | traced | rooms 0-19 (`$29`); exits are screen characters 2-5 with a destination and arrival per room (`$2E89`, `$4B5E`-`$4C9D`) |
| Collecting every lantern in a chamber opens doors to other chambers | traced | lantern lists `$4CE2`; each room's frame routine opens its passages when its lanterns, or particular ones, are taken (`$4EC4`) |
| Climbing nets up, down and sideways | traced | climbing needs bit 2 of the terrain flags, a pixel of colour %11 in a coloured character (`$1DEC`, `$5431`); action `$17` moves along a net (`$2187`) |
| Joystick (port 1 for Bruce; the C64-Wiki says port 2): left and right walk, up jumps or climbs, down lies flat or climbs down, fire with no movement punches, fire while running kicks, kick in mid-jump | live; **differs** on the port: Bruce reads port 1 (`$DC01`), port 2 is the second player's | `$169D` (`facts.md`, "Controls") |
| The black Ninja, knocked out by two kicks, attacks with a stick | traced | health at most 7 and a kick costs 7, and an enemy is beaten when his health goes below zero, so two kicks from full (`$0DF8`, `$2B4E`); drawn in black (`$2719`) |
| Yamo, the green sumo-style fighter, needs three kicks, can kick in the air | traced | health at most `$14` (20), a kick costs 7: below zero after three kicks (`$0CD5`, `$2B4E`); enemy flying kicks `$22F3` |
| Traps in chambers (the Wikipedia page names mines, moving walls and an electrified comb) | traced | mines `$3228`, moving sections `$4086`-`$40B4`, moving hazard `$2C70`, deadly characters `$2E89` |
| Falls counter on the status line (`FALLS 04`), five lives | traced | 4 falls at the start, 9 with a human Yamo (`$0F72`); the game ends when a fall is lost with none left (`$1818`) |
| Score, top score, status line with `1UP` in a two-player game | live | |
| Two-player modes: one player against the computer, two players alternating as Bruce, Bruce against a player-controlled Yamo | traced | `$42C9` two players, `$42CA` human Yamo; players swap after each fall (`$1818`); a human Yamo idle for 7 x 256 frames is handed to the computer (`$173F`) |
| Menu keys: `F3` one or two players, `F5` computer or opponent, `F7` begin | live | menu snapshot |
| Joystick orientation messages for joysticks 1 and 2, left-handed and right-handed | live | left-handed mode turns the stick a quarter turn (`$169D`, `$4A85`) |
| Pause with SPACE and the PAUSED text | traced | `toggle_pause`, `$1A42`; the game also pauses itself after 128 x 256 idle frames and cycles the colours (`$1628`) |
| Score table: landing on an enemy 50, kick 75, punch 100, lantern 125, enemy beaten 200 (Ninja) or 450 (Yamo), entering a new room 2000, the Wizard 3000 | traced | every value found (`$2B4E`, `$2F04`, `$0A0E`, `$3D04`); also 500 for each drop in room 13 (`$3E7C`) |
| The Wizard's chamber and the end of the game, `CONGRATULATIONS` | traced | room 18 (`$3CDC`), the treasure room 19 (`$4272`), which leads to the second loop |
| The second pass: enemies come back at once when killed | traced | `$40` is set by room 19; it cuts the enemies' waits to 3 (`set_yamo_wait`, `$0D46`, and the Ninja's at `$0D88`) |
| The second pass: one safe room loses its safe spots (C64-Wiki) | open | not looked for |
| Music in the menu only, sound effects in play | traced | the tune is played only from the menu's interrupt (`$152C`); effects from `frame_work` (`$15A8`) |
| `GAME OVER` | traced | `game_over`, `$188E` |

## Beyond the documentation

- The disk is a crack by Remember with a one-line `SYS` stub, a packed program, an intro, a text page and two trainer questions. The crack's code sits in front of the game and copies the game's start-up block to `$0400` (`orientation.md`).
- The sound routines are credited in the game's own memory, at `$E314`: "Micropearl Music Player, copyright 1983 John A. Fitzpatrick".

## Open questions

- What the two trainer options change in the game, and whether the code is otherwise the original's. C64-Wiki says the original's unlimited-lives cheat is `POKE 5472,99` (`$1560`), not checked here.
- The second loop's safe spots (C64-Wiki) were not looked for.
