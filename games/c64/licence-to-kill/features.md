# Licence To Kill — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "Licence to Kill", https://www.c64-wiki.com/wiki/Licence_to_Kill, read 16 November 2026 (credits, the six levels and their controls, a cracked version's cheats, the Zzap!64 score).
- Zzap!64 issue 53, September 1989, review of Licence To Kill (C64 and Amiga), read as the scan's OCR text at https://archive.org/details/zzapp_64_issue_053_600dpi on 16 November 2026: the six sections, prices, the C64 ratings (Presentation 84 %, Graphics 81 %, Sound 65 %, Hookability 80 %, Lastability 80 %, Overall 80 %) and "no multiload".
- MI6-HQ, "Licence To Kill" game page, https://varnish.mi6-hq.com/sections/games/ltk, read through a research summary on 16 November 2026 (credits, release 20 April 1989).
- Wikipedia, "007: Licence to Kill", https://en.wikipedia.org/wiki/007:_Licence_to_Kill, read through a research summary on 16 November 2026.
- The game's own screens: the title credits list "COMMODORE CHRIS WEST., ATARI PAUL HARGRAVE., AMIGA BOZZ BOSWELL., IBM MARCUS GOODEY., GRAPHICS TONY WEST., SOUND DAVID WHITTAKER., MANAGEMENT JOHN KAVANAGH." and "COPYRIGHT 1989 DOMARK."

No manual was found. The controls below come from C64-Wiki and the
review, and each is to be checked against the code.

## Features

| Feature | Status | Where |
|---|---|---|
| One load: all six sections in memory at once ("no multiload", Zzap!64) | live | nothing is read from disk after the loader; the five play snapshots differ from the hand-over only in variables and screens (`orientation.md`) |
| Five level numbers, 0 to 4, in `$0398`; after the last the number wraps to 0 | traced | `$15B3`; the review's six sections are five level numbers, so one level holds two sections (diving, then the water-ski) — to confirm |
| Level 1, helicopter chase: fly up the screen after Sanchez's jeep, avoid buildings and the guards' shots; at the end, put Bond down | live (flying) / open (the end) | |
| Level 2, gunfight on foot through the boatyard: walk in four directions, hold fire and push left or right to turn the aim, release fire to shoot; oil drums for cover; collect ammunition | live (start) / open | ammunition shown in the panel as rows of bullets and "x3" magazines |
| Level 3, plane escape: Bond hangs from the helicopter on a rope and must latch onto the tail of Sanchez's plane within two minutes | live (start) / open | |
| Level 4, diving: swim and dive under boats, take harpoons from divers with fire, fire harpoons, pick up the bags of cocaine for bonus points, harpoon the seaplane's pontoon to go on | live (start) / open | |
| Level 5, water-ski: towed behind the plane, pull in the line (up/down), avoid rocks and buoys, reach the plane | open | |
| Level 6, truck chase: fly the plane over a tanker until a sign appears, jump down, bump the other tankers off the road, dodge Stinger missiles, catch Sanchez's tanker | live (start) / open | |
| Lives: three at the start, shown in the panel | live | `$108E`; decremented by six separate routines (`$20FC`, `$2D37`, `$3994`, `$3B5E`, `$8123`, `$F6A6`) |
| A countdown timer in the panel (1946, 4854, ... at the start of the levels) | live | |
| Score, six digits | live | |
| Two energy bars in the panel, red through yellow to green | live | |
| High-score table "ALL TIME TOP SECRET AGENTS", seven entries 007 to 001 with three-letter names, entered after a good score ("GREAT SCORE. INPUT YOUR NAME.") | live (table) / open (entry) | the table is not saved to disk (C64-Wiki) |
| Title: tagline "His bad side is a dangerous place to be.", logo, credits, a white dot (the gun-barrel dot of the films' openings, without the barrel) | live | |
| Music by David Whittaker: an intro tune; sound effects in play, no in-game music (Zzap!64) | open | |
| Joystick in port 1 | live | fire on port 2 does not start the game |

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
