# Thrust — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "Thrust", https://www.c64-wiki.com/wiki/Thrust, read 17
  October 2026: controls, the reactor and bonus rules, an extra life every
  10,000 points, levels repeated four times with variations; title and
  in-game screenshots saved as `reference/c64wiki-*.gif`.
- Wikipedia, "Thrust (video game)",
  https://en.wikipedia.org/wiki/Thrust_(video_game), read 17 October
  2026: the BBC Micro original by Jeremy C. Smith (Superior Software,
  1986); the C64 version on Firebird's budget label, released before the
  BBC one; music by Rob Hubbard; the six-level cycle and its variations;
  messages after levels 24, 48 and 72 (quoted for the BBC version only).
- REG-Vault, "Thrust (1986, Commodore 64)",
  https://www.regvault.org/game/c64/thrust, read 17 October 2026: links a
  scan of the C64 manual. The scan is images in a PDF, and this run had
  no tool to read it, so nothing below comes from the manual.
- The game itself, in `work/play.vsf` and the states in `reference/`.
  Controls were tested from `play.vsf` (ship hovering, nothing moving) for
  25 frames with and without each key, reading the sprite registers.

## Features

| Feature | Status | Where |
|---|---|---|
| Title picture: the ship towing the pod past a planet, signed "Bob" | live | the loading picture, with "TCI" added by the crack (`reference/title-loading-picture.png`; the original is `reference/c64wiki-title.gif`); shown by the first depacker, before the game runs |
| Attract mode: a demo pilot flies level 1 and tows the pod | live | `reference/attract-towing-pod.png`, `reference/attract-level1.png` |
| Space starts a game from attract mode | live | lives read 3, then 2 once the ship appears |
| The ship materialises out of a yellow cross | live | `reference/ship-materialising.png` |
| A rotates anticlockwise, S clockwise | live | the ship is sprite 7. From pointer `$00` (nose up), 25 frames of S gave `$0B` and 25 of A gave `$15`, which is 11 steps each way if the set is 32 frames (not counted yet) |
| Shift thrusts | live | left Shift, 25 frames: sprite 7 rose from line 134 to 120, fuel 1035 to 1030 (`reference/thrust.png`). The code takes either Shift (`thrust_keys`, `$95CB`) |
| Return fires | live | one red dot leaves the nose and travels up (`reference/bullet.png`); held for 10 frames, only one bullet was seen |
| Space raises the shield, which costs fuel | live | 25 frames: the ship becomes a green circle, fuel 1035 to 1027 (`reference/shield.png`) |
| The shield stops the ship from firing | open | |
| Space also works the tractor beam: hover over fuel or the pod with the shield up | open | |
| Collecting fuel from fuel tanks | open | a tank marked FUEL stands on level 1 |
| The pod (Klystron pod) on a stiff rod; ship and pod swing under gravity and inertia | open | towed in attract mode (`reference/attract-towing-pod.png`); the rod is drawn red |
| Leaving the planet's atmosphere with the pod completes the level | open | |
| Gravity and inertia act on the ship | live | with no input from `play.vsf`, sprite 7 was still on line 134 after 25 frames and on line 148 after 50: the ship hangs for a moment after it appears, then falls |
| Touching the cave walls with the ship or the pod destroys it | open | |
| Gun turrets (limpet guns) fire at the ship and die to one shot | open | one stands on level 1 |
| Shooting the reactor (power plant) disables the guns for a while | open | the domed building on the right of level 1 |
| Too many shots set the reactor critical: the planet blows up 10 seconds later | open | |
| Escaping a critical reactor with the pod scores a 2,000-point bonus | open | |
| Doors opened by shooting a switch, on later levels | open | |
| Six levels, then repeated with reversed gravity, then with invisible walls (seen with the shield up), then both | open | |
| A message after levels 24, 48 and 72 | open | the C64 wording is not known |
| Fuel runs out: the game ends | open | |
| Three lives (two in reserve), an extra life every 10,000 points | open | three seen at the start |
| Status bar: fuel, lives and score | live | at the top, in its own screen split (`orientation.md`) |
| F1 sound off, F3 sound on | traced | `sound_keys` (`$977D`): F1 stores `$FF` in `$A2`, F3 stores 0. Not heard: the emulator's sound was not listened to |
| F5 pause, F7 continue | live | `pause_keys` (`$975F`) runs on about two passes in three, so F5 must be held: 5 frames were missed, 10 paused the game (thrust then moved nothing) until F7. Needs `$27` = 0 |
| Music by Rob Hubbard | open | not heard yet |

## Beyond the documentation

Found in the code, not in the manual.

| Feature | Status | Where |
|---|---|---|
| The BBC Micro version's key page, with its MODE 7 and teletext codes, kept in the C64 program | traced | `bbc_keys_text` (`$B9DD`), printed by `show_bbc_keys_page` (`$B74B`), which nothing traced so far calls; the crackers added their credit to it |
| Level messages "Mission Complete", "No Bonus", "Planet Destroyed", "Reverse Gravity", "Invisible Landscape" | traced | `$9516` |
| A high score table, "Top Eight Thrusters", with name entry ("Congratulations", "Please enter your name") | live | the table shows between games (`reference/high-score-table.png`); name entry not reached |
| "Out of fuel" message | traced | `$B9D0` |
| RUN/STOP is tested | traced | `$B269`, `$B3E0`; what it does is not read yet (the BBC page lists ESCAPE to quit) |

## Open questions

- The C64 manual (REG-Vault's scan) was not read: the controls above
  come from C64-Wiki, the game's own response and the key tests in the
  code.
- `key_pressed` answers from `$B49F` instead of the keyboard while
  `$63` is non-zero. `$63` read 0 through attract mode and in play, so
  how the demo pilot is steered is not known.
- This image is TCI's crack. Whether TCI changed anything besides the
  title picture and the packing is not known.
