# Licence To Kill — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "Licence to Kill", https://www.c64-wiki.com/wiki/Licence_to_Kill, read 16 November 2026 (credits, the six levels and their controls, a cracked version's cheats, the Zzap!64 score).
- Zzap!64 issue 53, September 1989, review of Licence To Kill (C64 and Amiga), read as the scan's OCR text at https://archive.org/details/zzapp_64_issue_053_600dpi on 16 November 2026: the six sections, prices (C64 £9.99 cassette, £14.99 disk), the C64 ratings (Presentation 84 %, Graphics 81 %, Sound 65 %, Hookability 80 %, Lastability 80 %, Overall 80 %), "no multiload", and a reviewer's surprise at "how Quixel has managed to cram so much into a one-load 64 version".
- MI6-HQ, "Licence To Kill" game page, https://varnish.mi6-hq.com/sections/games/ltk, read through a research summary on 16 November 2026 (credits, release 20 April 1989).
- Wikipedia, "007: Licence to Kill", https://en.wikipedia.org/wiki/007:_Licence_to_Kill, read through a research summary on 16 November 2026.
- The game's own screens: the title credits list "COMMODORE CHRIS WEST., ATARI PAUL MARGRAVE., AMIGA BOZZ BOSWELL., IBM MARCUS GOODEY., GRAPHICS TONY WEST., SOUND DAVID WHITTAKER., MANAGEMENT JOHN KAVANAGH." and "COPYRIGHT 1989 DOMARK."

No manual was found. The controls below come from C64-Wiki and the
review, and each is to be checked against the code.

## Features

| Feature | Status | Where |
|---|---|---|
| One load: all six sections in memory at once ("no multiload", Zzap!64) | live | nothing is read from disk after the loader; the five play snapshots differ from the hand-over only in variables and screens (`orientation.md`) |
| Five level numbers, 0 to 4, in `$0398`; after the last the number wraps to 0 | traced | `level_complete` (`$157A`); level 4 (number 3) holds two sections, the diving and then the water-ski, switched by `$8E6D` (`level4_start`, `diving_loop`) |
| Level 1, helicopter chase: fly up the screen after Sanchez's jeep, avoid buildings and the guards' shots; at the end, put Bond down | live (flying) / traced (the end) | the map ends with an $FF row and the scroll stops (`stop_scrolling`, `$0AB9`); `move_player` (`$133D`) judges the landing inside X `$66`-`$CC` |
| Level 2, gunfight on foot through the boatyard: walk in four directions, hold fire and push left or right to turn the aim, release fire to shoot; oil drums for cover; collect ammunition | live (start) / traced | `gunfight_controls`, `fire_aimed_shot` (`$1BDE`); crate and magazines in `touch_enemies` (`$8746`); touching an enemy costs a life |
| Level 3, plane escape: Bond hangs from the helicopter on a rope and must latch onto the tail of Sanchez's plane within two minutes | live (start) / differs | `catch_plane`; the level is lost when the fuel runs out (`$036C`), and the countdown starts at 2,000, 80 seconds |
| Level 4, diving: swim and dive under boats, take harpoons from divers with fire, fire harpoons, pick up the bags of cocaine for bonus points, harpoon the seaplane's pontoon to go on | live (start) / traced | `diving_collisions` (`$89BC`), `harpoon_seaplane` starts the water-ski; bags are character `$72` (`copy_tile_row`) |
| Level 5, water-ski: towed behind the plane, pull in the line (up/down), avoid rocks and buoys, reach the plane | traced | part of level number 3 (`$8E6D` set); a sprite collision loses a life, reaching the top of the screen ends the level (`diving_loop`, `$80F9`) |
| Level 6, truck chase: fly the plane over a tanker until a sign appears, jump down, bump the other tankers off the road, dodge Stinger missiles, catch Sanchez's tanker | live (start) / traced | `jump_to_tanker` (`$F81A`), `trucks_collide` (`$3EAA`), `move_stinger` (`$FF79`) |
| Lives: three at the start, shown in the panel | differs | `$108E` starts at 3 (`$19F6`) but the game ends only when it goes below 0, so play goes on at 00: four attempts (live, `facts.md`). Five routines take a life (`$20FC`, `$3994`, `$3B5E`, `$8123`, `$F6A6`); a sixth, `$2D37`, is jumped over |
| A countdown timer in the panel (1946, 4854, ... at the start of the levels) | live | `count_down_timer` (`$8EC8`): one unit every other frame, 25 a second (live); starts at 2,000, 5,000, 2,000, 3,000 and 5,000 (`start_timer`); what is left is a bonus |
| Score, six digits | live | |
| Two energy bars in the panel, red through yellow to green | differs | on level 1 the upper bar is Bond's energy (`draw_energy_bar`, `$304F`) and the lower the jeep's hits left (`draw_hits_bar`, `$3002`) |
| High-score table "ALL TIME TOP SECRET AGENTS", seven entries 007 to 001 with three-letter names, entered after a good score ("GREAT SCORE. INPUT YOUR NAME.") | live (table) / traced (entry) | `name_entry` (`$91B1`); table at `$F401`, names `$F42B`; the table is not saved to disk (C64-Wiki) |
| Title: tagline "His bad side is a dangerous place to be.", logo, credits, a white dot (the gun-barrel dot of the films' openings, without the barrel) | live | |
| Music by David Whittaker: an intro tune and sound effects (Zzap!64's C64 ratings: "Nice intro tune and good spot effects"; the "no in-game music" line is in its Amiga box) | traced | five tunes at `$CADB`: the title's, one that starts with the water-ski, the game over, the opening of levels 1, 4 and 5, and one nothing plays; 24 effects at `$C6C2` (`facts.md`, Sound) |
| Joystick in port 1 | live | fire on port 2 does not start the game; RUN/STOP pauses and Q quits from the pause (live, `pause_keys` `$8F15`) |

## Beyond the documentation

Found in the code, not in the manual.

- Both disks supplied are freezer-cartridge backups of two different builds
  of the program (`orientation.md`).

## Open questions

- Which level number holds which of the six sections, and how a section
  ends.
- What the second build (`license.g64`) changes besides moving the code.
- What the "GREAT SCORE. INPUT YOUR NAME." line on the title is for when no
  score has been made.
