# Wizball — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The instructions from the box, as transcribed on c64.com,
  http://www.c64.com/games/no-frame.php?showid=237&show_info=1, read
  2026-09-24 (**manual**). The same text, typed by Jack Alien, is the
  document reader in Remember's crack on the contributor's disk, read from
  its memory on 2026-09-24; the two agree.
- The game's own screens: the attract sequence, the player menu, the three
  Wiztips pages, "get ready!" and play, seen in the emulator on 2026-09-24
  (**screen**).
- C64-Wiki, "Wizball", https://www.c64-wiki.com/wiki/Wizball (revision
  40696, 14 March 2023), read 2026-09-24 (**wiki**): controls, icons, the
  droplet types, a colour recipe per level, a map of the tubes, the
  BOREWIZ cheat.
- Zzap!64 issue 27 (July 1987), pages 14-15, review, 96 %, Sizzler; OCR at
  https://archive.org/details/zzap64-magazine-027, read 2026-09-24
  (**Zzap**).
- c64.com's review by Matthew Allen,
  http://www.c64.com/games/no-frame.php?showid=237&show_review=1, read
  2026-09-24 (**c64.com review**).
- Wikipedia, "Wizball", https://en.wikipedia.org/wiki/Wizball, read
  2026-09-24 (**Wikipedia**): credits, May 1987, how the C64 version
  spawns its waves.
- Remember's release notes, the scroll text of their crack (release 78,
  Jack Alien, December 1997), read from the contributor's disk on
  2026-09-24 (**Remember**): three bugs they say they fixed in the
  original, and the WIZBOREWIZ cheat.
- The Cutting Room Floor (https://tcrf.net/Wizball) and Lemon64 refused
  automated access (HTTP 403), so they were not read.

## Features

| Feature | Status | Where |
|---|---|---|
| **Goal** (manual, wiki, Zzap): Zark has drained Wizworld of colour; restore the colour of eight landscapes, each drawn in three shades of grey | open | |
| **A level is three target colours, darkest grey first** (manual); each target is mixed from red, green and blue droplets in a proportion shown in a fourth cauldron at the far right (manual, Zzap: yellow is equal red and green, orange more red than green) | open | |
| **The colour recipe of each level** (wiki: level 1 is 100 % red, then 50 % red + 50 % blue, then 50 % green + 50 % blue, and so on for all eight) | open | |
| **Cauldrons** (manual): droplets collected fill the red, green and blue cauldrons at the bottom of the screen | live | the three cauldron outlines and the target at the bottom of `reference/play-level1.png`; drawing routine not yet found |
| **Colour on three landscapes at a time** (manual, hints): only three landscapes have aliens, one with red spheres, one green, one blue; completing a landscape clears its aliens, except on level eight | open | |
| **Level access** (manual, Zzap): level four opens when level one is complete, level five when level two is, and so on | open | |
| **Tubes between levels** (manual, wiki, Wiztips three): tubes and craters take the Wizball up or down a level; arrows near each tube say which. The wiki gives a map of which level has a tube up and which a tube down | open | |
| **Spin control** (manual): stick left puts left-hand spin on the Wizball, right puts right-hand spin; at first it only bounces | open | |
| **Thrust and anti-grav** (manual, icon 1): thrust lets the Wizball move left and right; anti-grav stops the perpetual bouncing and gives full control | open | |
| **Pearls and the icon bar** (manual): certain aliens leave a green pearl; each pearl collected lights the next of the seven icons at the top; wiggling the stick left and right takes the lit icon's feature | open | |
| **What leaves a pearl** (Zzap: "a molecule or eight aliens"; c64.com review: "every eighth alien shot") | open | |
| **The seven icons** (manual, Wiztips one): 1 thrust or anti-grav; 2 beam or double; 3 catelite; 4 blazers; 5 wiz spray or cat spray; 6 smart bomb; 7 shields | live | the icon bar in `reference/play-level1.png` and the legend in `reference/wiztips-one.png`; code not yet found |
| **Beam and double** (manual): beam is a "supa-beam" weapon; double gives Wiz and Cat fire in two directions | open | |
| **Blazers** (manual): stronger fire for Wiz and Cat, "use sparingly" | open | |
| **Wiz spray and cat spray** (manual): multi-directional fire; Wiz and Cat cannot both have a spray | open | |
| **Smart bomb** (manual): destroys every sprite on screen | open | |
| **Shields** (manual): Wiz and Cat are protected for a limited time | open | |
| **Catelite** (manual, Wiztips two): the cat follows Wiz; in one-player games holding fire and moving the stick steers the cat (and leaves the Wizball without control); in the two-player team game the cat has the other joystick | open | |
| **Only the cat collects droplets** (manual, Wikipedia) | open | |
| **The cat has nine lives** (Zzap), refilled in the Wiz-lab if it is still alive; it squeals when close to dying (Zzap) | open | |
| **Droplet types** (Wiztips two, wiki, Zzap): red, green and blue chemical; mutant cat (purple: the cat ignores the controls and leaps about until it dies); filth raid (light blue: sirens, flashing lights, fast ships that shoot); bonus Wizball (white: an extra life); indestructacat (grey: the cat gets 128 lives); freaky bits (black: most of the scenery goes black until a number of aliens are shot) | live (the legend) | `reference/wiztips-two.png`; code not yet found |
| **Bonus stage after each colour** (manual, Zzap): in space, aliens in formation; extra lives by shooting Wiz's lookalike, "if the image makes a noise" (manual); Zzap's OCR reads "shooting 255 of them gains an extra life", uncertain | open | |
| **Ending the bonus stage early** (wiki reader's review): a deliberate collision ends it and costs no life | open | |
| **Wiz-lab** (manual, Zzap): after a bonus stage, choose one weapon or control to keep from birth on every later Wizball, or 1,000 points times the Wiz-level number; the Wizball is left at a parking meter while Wiz stirs his pot and the cat drinks milk | open | |
| **A finished level is shown in colour** while its bonus is counted (Zzap) | open | |
| **Scoring** (manual): aliens 10-500; pearl 100; droplet 150; completing a colour 2,000; completing a level 7,500; aliens killed in the bonus wave 40 each; Wiz points in hand level × 1,000 | open | |
| **An extra Wizball every 100,000 points** (manual) | open | |
| **Keyboard** (manual): RUN/STOP pauses and resumes; ↑ raises the firing volume; = lowers it; Q quits the game while paused | open | |
| **Game options** (manual, screen): one player; two players taking turns; two-player team (Wiz and Cat on separate sticks); three players (a team against one); four players (two teams) | live (the menu) | `reference/title-player-menu.png`; selection code not yet found |
| **The port is chosen by pressing fire** (manual, Zzap's "intelligent joystick sensing") | open | fire on port 2 started a game (live); port 1 not yet tried |
| **Attract sequence** (screen, Zzap): the title and high-score table, then the player menu over a starfield, in turn; SPACE shows Wiztips | live | `reference/title-high-scores.png`, `reference/title-player-menu.png` |
| **Wiztips** (screen): three pages, one per press of SPACE: getting started, cat control, general hints | live | `reference/wiztips-one.png`, `-two.png`, `-three.png`; text not yet found in memory |
| **High-score tables** (screen): one for one-player games and one for the others; top entry "sensi soft" at 50,000, then JOP and "KRX NIF" at 20,000, the rest 20,000 with no name | live | `reference/title-high-scores.png`; name entry not yet seen |
| **"Get ready!"** (screen): rings circle the words until fire is pressed | live | `reference/get-ready.png`; the screen's loop is `$691C`-`$6963`, and its exit test is bit 4 of what `$91FA` returns |
| **Continue game feature** (Wiztips three) | open | |
| **Hiding beneath the horizon gives immunity to alien bullets** (Wiztips three) | open | |
| **BOREWIZ** (wiki: type it on the player-selection screen and the Wizball is invulnerable except in the bonus stage; Remember: type WIZBOREWIZ on the title screen to switch collisions off) | open | |
| **Colour spheres shoot on later levels** (Wikipedia) | open | |
| **Waves come in groups** (Wikipedia): four or five on the landscape at a time, at least one of them colour spheres | open | |
| **Completing all eight levels** leads somewhere the reviews do not describe (Zzap: "that's for you to find out") | open | |
| **Scenery**: parallax scrolling (wiki category); a small Mount Rushmore on level three (Zzap) | open | |
| **Music and sound** (Zzap, wiki): Martin Galway's title tune, a high-score tune and jingles, and sound effects | open | |
| **Remember's bug 1**: "matrix in level 5" | open | |
| **Remember's bug 2**: shields still active after quitting and restarting the game | open | |
| **Remember's bug 3**: with the spray, the icon at the top showed the Catelite's sprite | open | |

## Beyond the documentation

Found in the code, not in the manual.

- The initialisation at `$EC00` reaches the CIA registers only through
  indexed addresses (`$DC8E,X` with X = `$7F` is `$DD0D`), apparently to
  hide what it does from anyone reading it (orientation.md).

## Open questions
