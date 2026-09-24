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
| **Goal** (manual, wiki, Zzap): Zark has drained Wizworld of colour; restore the colour of eight landscapes, each drawn in three shades of grey | traced | eight levels of three colours in `$B1D1`; `$776D` puts each finished colour over one grey (`$B27D`-`$B27F`) |
| **A level is three target colours, darkest grey first** (manual); each target is mixed from red, green and blue droplets in a proportion shown in a fourth cauldron at the far right (manual, Zzap: yellow is equal red and green, orange more red than green) | traced | `$776D`: the first colour replaces `$D022`, dark grey. The fourth cauldron is drawn in the target colour and filled to the mix `$B12E` = sum of min(units, recipe) (`$9E2C`); recipes `$B2C0`: yellow 10/10/0, orange 15/5/0, as Zzap says |
| **The colour recipe of each level** (wiki: level 1 is 100 % red, then 50 % red + 50 % blue, then 50 % green + 50 % blue, and so on for all eight) | live (level 1's first colour) | `$B1D1`: level 1 red, purple, cyan, as the wiki says; the full list in `facts.md`. On level 1 the target colour `$B51A` was 2 (red) and 20 red units completed it |
| **Cauldrons** (manual): droplets collected fill the red, green and blue cauldrons at the bottom of the screen | live | sprites `$B9`-`$BC` in the bottom border (`$8B46`), filled a row a frame (`$9E81`); units `$B12B`-`$B12D`, at most 20 |
| **Colour on three landscapes at a time** (manual, hints): only three landscapes have aliens, one with red spheres, one green, one blue; completing a landscape clears its aliens, except on level eight | traced | `$9F5F` makes alien lists for the highest open level `$B1CE` and the two below it only, sphere colours from `$B18B`. A level done out of order, or any of the top three once `$B1CE` reaches 7, keeps its aliens |
| **Level access** (manual, Zzap): level four opens when level one is complete, level five when level two is, and so on | differs | `$A9C6`: `$B1CE` = 2 + the levels done counted from level 1 with no gap, so level five needs levels one and two; tubes go up only as far as `$B1CE` (`$81D3`) |
| **Tubes between levels** (manual, wiki, Wiztips three): tubes and craters take the Wizball up or down a level; arrows near each tube say which | traced | `$8389`-`$83A6`: a mouth `$C2`/`$C3`/`$C6`/`$C7` goes up if the arrow `$BE` is within three characters to its right; `$81C9` moves the level. Level 1's three tubes all go up (its map, offline) |
| **Spin control** (manual): stick left puts left-hand spin on the Wizball, right puts right-hand spin; at first it only bounces | live | `$80F8` (spin ±6 a frame to ±48), `$818E` (speed from spin, at bounces only until thrust); holding left and right on port 1 rolled the landscape both ways |
| **Thrust and anti-grav** (manual, icon 1): thrust lets the Wizball move left and right; anti-grav stops the perpetual bouncing and gives full control | live | `$7379`; with both (a continued game) the stick moved the Wizball from line 73 to 199 and rolled it left |
| **Pearls and the icon bar** (manual): certain aliens leave a green pearl; each pearl collected lights the next of the seven icons at the top; wiggling the stick left and right takes the lit icon's feature | live (the pearl) | pearl: state 5, frame `$78`, colour 5 (`$A93C`); collected at `$7E63` for 100 points, lighting the next icon (`$72AA`); four stick reversals within 10 frames each take it (`$723D`, `$72D2`) |
| **What leaves a pearl** (Zzap: "a molecule or eight aliens"; c64.com review: "every eighth alien shot") | differs (live) | the ninth kill since the last pearl (`$A9AA` = 9; spheres do not count) and every molecule (type 1). A poked hit with the counter at 8 gave a pearl, at 0 an explosion |
| **The seven icons** (manual, Wiztips one): 1 thrust or anti-grav; 2 beam or double; 3 catelite; 4 blazers; 5 wiz spray or cat spray; 6 smart bomb; 7 shields | live | the handlers in that order through `$B549`; the icon bar in `reference/play-level1.png` |
| **Beam and double** (manual): beam is a "supa-beam" weapon; double gives Wiz and Cat fire in two directions | differs | beam: arcs above and below the Wizball, three steps of four frames (`$8592`, `$85F2`). Double alternates the Wiz's shot direction at each press (`$84B6`) and does nothing to the cat's shots |
| **Blazers** (manual): stronger fire for Wiz and Cat, "use sparingly" | traced | `$731A` sets `$B236`; Wiz and cat shots use characters + 3 and colour 12 (`$84E3`, `$888D`) |
| **Wiz spray and cat spray** (manual): multi-directional fire; Wiz and Cat cannot both have a spray | traced | `$7325`: one flag `$B238` says who has it; a fan of three shots (`$850A`) |
| **Smart bomb** (manual): destroys every sprite on screen | traced | `$7394` sets every alien slot's hit flag and flashes the background; the grey bonus object (type 7) shrugs it off; the icon is not used up |
| **Shields** (manual): Wiz and Cat are protected for a limited time | live | `$73B0`, `$7EA5`: 40 units, one per 50 frames, 8 per collision (both measured), off below 5 |
| **Catelite** (manual, Wiztips two): the cat follows Wiz; in one-player games holding fire and moving the stick steers the cat (and leaves the Wizball without control); in the two-player team game the cat has the other joystick | traced | `$8640` (follows the Wizball's position eight frames late); `$697D`: fire held 10 frames hands the stick to the cat while the Wiz fires by itself |
| **Only the cat collects droplets** (manual, Wikipedia) | traced | only the cat's test handles droplets (`$88C2`); the Wizball's handles pearls (`$7E7C`) |
| **The cat has nine lives** (Zzap), refilled in the Wiz-lab if it is still alive; it squeals when close to dying (Zzap) | traced | nine hits (`$8657`, `$B26C`); the lab resets the count unless it is negative (`$ABD3`); on its last life the cat flashes and its shots play sound 4 |
| **Droplet types** (Wiztips two, wiki, Zzap): red, green and blue chemical; mutant cat (purple); filth raid (light blue); bonus Wizball (white); indestructacat (grey: 128 lives); freaky bits (black) | traced | all six by the droplet's colour at `$88C2`/`$8902`; which special comes when: `$A763` against five random thresholds (`$A772`-`$A776`) |
| **Bonus stage after each colour** (manual, Zzap): in space, aliens in formation; extra lives by shooting Wiz's lookalike, "if the image makes a noise" (manual); Zzap's OCR reads "shooting 255 of them gains an extra life", uncertain | live (the stage) | 22 frames after a colour completed, `$646F` ran and the formation flew under "colour completed" (`reference/colour-completed.png`); the lookalike (bonus type 19) gives a Wizball when shot (`$A7E2`); no noise test was found |
| **Ending the bonus stage early** (wiki reader's review): a deliberate collision ends it and costs no life | traced | `$65DA`-`$65F5`: a hit ends the stage with the tally only |
| **Wiz-lab** (manual, Zzap): choose one weapon or control to keep from birth on every later Wizball, or 1,000 points times the Wiz-level number; the Wizball is parked while Wiz stirs his pot and the cat drinks milk | differs (points) | `$AB20`; the choice is icons 1-5 into `$B116` (`$B076`), replayed every life; with none taken, (9 - level) x 1,000 (`$ADBB`), not level x 1,000. The lab and its icons were reached live |
| **A finished level is shown in colour** while its bonus is counted (Zzap) | traced | `$AE11`: the finished landscape scrolls by itself paying 10 points a frame; the colour was not checked live |
| **Scoring** (manual): aliens 10-500; pearl 100; droplet 150; completing a colour 2,000; completing a level 7,500; aliens killed in the bonus wave 40 each; Wiz points in hand level × 1,000 | differs | every landscape alien 50 (all 18 types; one kill measured live), bonus-stage aliens 0-150; pearl 100; a droplet 50 for the sphere plus 50 when caught; colour 2,000 (100 a unit in the lab); level about 7,500 (10 a frame of the scroll); bonus wave 40; clearing a landscape's list 1,000 (not in the manual) |
| **An extra Wizball every 100,000 points** (manual) | traced | `$71BB`: when the 100,000s digit changes |
| **Keyboard** (manual): RUN/STOP pauses and resumes; ↑ raises the firing volume; = lowers it; Q quits the game while paused | live | pause and Q live (`$6EB7`, `$6ED7`); the volume keys traced (`$BA82`: the shot sound's sustain, 0-15) |
| **Game options** (manual, screen): one player; two players taking turns; two-player team; three players (a team against one); four players (two teams) | live (the menu) | `reference/title-player-menu.png`; records `$B2AC` |
| **The port is chosen by pressing fire** (manual, Zzap's "intelligent joystick sensing") | live | fire on port 1 or 2 at "get ready!" makes it the Wiz's (`$6965`, `$B240`), every turn |
| **Attract sequence** (screen, Zzap): the title and high-score table, then the player menu over a starfield, in turn; SPACE shows Wiztips | live | title 750 frames, menu 650, Wiztips 1,280 (`$8F75`, `$9017`, `$944D`) |
| **Wiztips** (screen): three pages, one per press of SPACE | live | pages `$41A5`-`$4552`, table `$4199` |
| **High-score tables** (screen): one for one-player games and one for the others; top entry "sensi soft" at 50,000 | live | `$BDB9` and `$BE37`; "sensi soft" is the best side's ten-character message (`$B6AA`), not a name |
| **"Get ready!"** (screen): rings circle the words until fire is pressed | live | `$6893`, loop `$691C`-`$6963`; the rings are sprite `$0C` |
| **Continue game feature** (Wiztips three) | live | keys 0-5 on the title or menu (`$AF85`) up to the first unfinished level of the last game (`$AF7D`); with `$AF7D` poked, key 4 started level 5 with levels 1-4 done and four weapons |
| **Hiding beneath the horizon gives immunity to alien bullets** (Wiztips three) | traced | bullets are freed over any character of `$80` or more, which the ground and the scenery are made of (`$9AD6`); not tested live |
| **BOREWIZ** (wiki: type it on the player-selection screen and the Wizball is invulnerable except in the bonus stage; Remember: type WIZBOREWIZ on the title screen to switch collisions off) | live | `$AF85` on the title and menu; `$BB07` stops a hit ending the life except while `$B874` is set (`$7EF4`); WIZBOREWIZ works because only the last seven keys count |
| **Colour spheres shoot on later levels** (Wikipedia) | traced | `$A027`: aimed from level 5, eight ways from level 7 |
| **Waves come in groups** (Wikipedia): four or five on the landscape at a time, at least one of them colour spheres | traced | `$9F9B`: groups of 4, 6 or 12 of one type; six aliens at most at once; nothing enforces a sphere group |
| **Completing all eight levels** leads somewhere the reviews do not describe (Zzap: "that's for you to find out") | traced | `$AEF3`, `$AF20`: a finale picture from map columns 92-95 and about ten seconds of flashing colour and random sounds, then the game again from level 1 with every alien firing every 10 frames |
| **Scenery**: parallax scrolling (wiki category); a small Mount Rushmore on level three (Zzap) | traced | four star layers (`$747E`); Mount Rushmore is tiles `$BC`-`$BE` three times on level 3's map (row 10) |
| **Music and sound** (Zzap, wiki): Martin Galway's title tune, a high-score tune and jingles, and sound effects | traced | nine tunes (`$5525`), among them the high-score (name entry) tune, and 26 effects (`$3C5F`); the driver ported and checked frame by frame against the game's code, playable on the page |
| **Remember's bug 1**: "matrix in level 5" | live | tile `$F8` at `$092B` draws sound data beside level 5's first well (`reference/level5-stray-tile.png`); Remember's crack stores `$00` there |
| **Remember's bug 2**: shields still active after quitting and restarting the game | live | nothing clears `$7F06` on the way from Q to a new game |
| **Remember's bug 3**: with the spray, the icon at the top showed the Catelite's sprite | differs | not a bug by the game's own rule: like every icon, the spray's shows what the next take gives, the cat spray (image `$0A`, the cat's face) after the Wiz takes it. Remember's crack swaps images 8 and `$0A` in the handler |

## Beyond the documentation

Found in the code, not in the manual.

- **Anti-tamper.** The initialisation reaches CIA 2 only through indexed
  addresses, then wipes itself with random bytes. The NMI clears `$85`
  every frame, and checks written in undocumented opcodes crash the game
  if it has not (*live*); one of them relies on the 6510's `LXA` constant
  being `$EE`. The menu and get-ready screens check the hardware vectors.
- **Leftovers**: an older copy of the start-up's tail (`$ECB4`), an
  earlier draft of Wiztips page three (`$BB0D`), a level-complete routine
  no key reaches (`$6EE4`), disconnected key tests, a frame list of the
  Wizball spinning forwards that nothing uses (`$3C1C`), and a sound
  effect that the table skips (`$3D4F`).
- **"poo bag"** in the image's name-entry buffer, never shown.

## Open questions

- What the twelve bytes the initialisation copies to `$001D` are for:
  no traced code calls them.
- What the 16 bytes at `$0B32`-`$0B41` and the frame list at `$3C47` are
  for: nothing refers to them.
- Whether a player sees the pipe copy's one-byte offset (`$831D`) in the
  tube sequence, and whether the finished level scrolls past in colour.
