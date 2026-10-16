# Rick Dangerous — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "Rick Dangerous", https://www.c64-wiki.com/wiki/Rick_Dangerous, read 12 October 2026
- Wikipedia, "Rick Dangerous", https://en.wikipedia.org/wiki/Rick_Dangerous, read 12 October 2026 (covers every version; its level list and story are not checked against the C64 game)
- The manual, one sheet for every machine, MicroProse Software 1989: a scan served by RegVault at https://api.regvault.org/api/v1/game/c64/e0cb9e399fed0aecee772be39481c5ea/manual, read 12 October 2026 (the PDF holds two page images and no text; read as pictures)
- The game's own screens, observed in VICE on 12 October 2026: the tape's loading screen, the Hall of Fame, the title screen and the story screen before level one

Credits from the sources: game © Core Design Ltd (manual, loading screen);
published by Firebird (loading screen, C64-Wiki), a label of MicroProse
Software, whose copyright the manual carries; C64 programming Stuart Gregg
and music Dave Pridmore (C64-Wiki); design Simon Phipps (Wikipedia, for the
series); manual design and graphics Artistix (manual).

## Features

| Feature | Status | Where |
|---|---|---|
| Joystick in port 2 (C64-Wiki) | live | fire on port 2 leaves the Hall of Fame, the title and the story screen |
| Stick left/right walks; up jumps; up-left/up-right jumps that way (manual) | live | `$0E64` sets the speed from the stick, `$0D27` the jump (speed -5.5, sound 7); live: up lifted Rick from Y 139 to 128 in 8 frames (`live4.py`) |
| Stick down ducks; down-left/down-right crawls (manual) | traced | `$0CB7` and `$0D6A` set `$4A` and the crawl frames from `$4326` |
| Fire + left/right jabs with the stick, to press buttons or stun enemies (manual) | traced | `$0CDE` puts the stick out (`$2B73`-`$2B75`, sound 2); traps with bit 6 set go off at it (`$1D1F`), enemies are stunned for 25 steps (`$1C84`) |
| Fire + up fires the gun the way Rick faces (manual) | live | `$2A17`; the bullet is a character moving a cell a step (`$2ABA`); live: fire and up took a bullet (6 to 5) and one flew (`live4.py`) |
| Fire + down lights and drops a stick of dynamite (manual) | live | `$2BAA`: a 34-step fuse, then ten steps of explosion (`$2BF8`); live: fire and down took a stick (6 to 5), its fuse at 30 after 8 frames |
| The gun holds a limited number of bullets, six to a magazine (manual; C64-Wiki gives six) | confirmed | `$2D32`, set to 6 at `$09F6` at every level start and after every life lost; six bullets in the panel at the start of level one |
| Dynamite: six sticks at the start (C64-Wiki) | confirmed | `$2D33`, set to 6 at `$09F6` with the bullets; six sticks in the panel at the start of level one |
| A killed enemy may leave a bonus that refills the bullets (manual) | differs | `$1519` only scores and plays a sound; objects start only from the room object lists (`$3CCE`, called from `$3C49` alone). Bullets come from boxes placed in rooms (type 17, `$19FA`) |
| Dynamite triggers traps, blows away walls and enemies, and kills Rick if he stays near it (manual) | confirmed | traps with bit 4 go off in the blast (`$1CFE`), Rick and the boxes inside its box are hit (`$2C55`), enemies by their own test (`$2C8A`) |
| The gun often triggers a trap rather than just killing (manual) | traced | traps with bit 5 of their flags go off at a bullet in their zone (`$1D10`) |
| Run/Stop toggles pause (manual, C64-Wiki) | live | `$40E0`; no main-loop step in 100 frames until pressed again |
| Up-arrow key quits to the start (manual, C64-Wiki) | differs | ← ends the game (`$0A95`, keyboard row 7 bit 1), live on 12 October 2026; ↑ did nothing in play |
| Four levels, 80 rooms, 74 traps and enemies (C64-Wiki) | differs | four levels confirmed; the C64 version holds 34 room records, each a tall map that scrolls, and 363 object records. The wiki's counts are not the C64 data's |
| Levels: Amazon cave and the Goolu tribe, Egyptian pyramid, Schwarzendumpf castle, missile base (Wikipedia; the manual names an Aztec temple, an Egyptian tomb and an enemy fortress) | open | the story texts at `$AD00` name South America and the Goolu tribe, the pyramids of Egypt, Schwarzendumpf Castle and a secret missile base, in that order; the rooms themselves not read |
| A story screen before each level | confirmed | five texts at `$AD00`-`$B253`, four levels and the ending; level one's and level two's seen live (`reference/story-south-america.png`) |
| The first room: a boulder rolls after Rick (Wikipedia, the manual's drawing) | open | the first room's traps were not identified one by one |
| Lives shown as hats in the panel | confirmed | `$2D34`, six, set at `$08C0` in the title loop before every game and taken one at a time at `$0AE9`; six hats at the start of level one |
| Hall of Fame of eight scores, 1000 to 8000 | live | `reference/hall-of-fame.png`; the names include DANGERSTU and JELLY (the font's T and I differ only in the top bar) |
| Music by Dave Pridmore (C64-Wiki; HVSC MUSICIANS/P/Pridmore_Dave/Rick_Dangerous.sid) | confirmed | a three-voice player (`$5042`) and seven tunes (`$5732`): the four levels, the ending, the title and game over; the composer's name is not in memory |

## Beyond the documentation

Found in the code, not in the manual.

| Feature | Status | Where |
|---|---|---|
| A cheat: the Hall of Fame name BBOOIINNGG sets `$53`; then 2 refills bullets, dynamite and lives to six and C= skips to the next level | live | `$2155`, `$0A6D`, `$0A87`; the keys tested with `$53` poked, the name not typed |
| The Hall of Fame name FLUFOMATIC unlocks a level select on the title screen | live | `$2146` sets `$37`; `$27C9` then lists the levels reached (`$51`); tested with `$37` poked. A game started from it skips the ending |
| A rude name is replaced by SNIGGER | traced | `$2103`, eleven words at `$2181`; not typed in |
| At power-on, NOBBY or JEZEBEL may replace a Hall of Fame name, chosen by the raster line | traced | `$226A` |
| Joystick port 1 right and down act as the 2 and ← keys | live | the keyboard row 7 shares `$DC01` with port 1; port 1 down ends the game |
| Collisions are worked out in software | traced | the code never reads `$D01E` or `$D01F` |

## Open questions and answers

- Points never earn a life: `$2D34` is written only at `$08C2` (the start), `$0A80` (the cheat) and `$0AE9` (a death), by `opcodes.py --refs`.
- Which trap in the first room is the boulder of the manual's drawing.
