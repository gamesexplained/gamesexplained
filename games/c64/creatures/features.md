# Creatures — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "Creatures", https://www.c64-wiki.com/wiki/Creatures (revision
  43636, last edited 27 November 2025), read 13 October 2026.
- The original Thalamus instructions, "Creatures (1990 Thalamus) [1695]
  Instructions" on the Internet Archive,
  https://archive.org/details/Creatures_1990_Thalamus_1695_Instructions
  (its OCR text), read 13 October 2026.
- Screenshots on the C64-Wiki page (torture chambers, the witch's hut, the
  title and ending animations), saved to `reference/wiki-*.png` on 14
  October 2026.

## Features

| Feature | Status | Where |
|---|---|---|
| Disk version loads from side A with `LOAD"*",8,1`; a multi-load that asks for side B | live | `reference/loading-insert-side-b.png` |
| Title with credits and a scroller; fire to start | live | `reference/title.png` |
| High-score table ("Todays top heros") and attract sequence on side B | live | `reference/attract-high-scores.png` |
| Three levels of two stages each, a torture chamber after every second stage, then the ending | live | stage table, files `LA` `LB` `TC` `LD` `LE` `TF` `LG` `LH` `TI` `CJ` |
| Get Ready screen names the stage and shows the Magic Potion Creatures to collect | live | `reference/get-ready-1-1.png` |
| Get Ready: joystick left or right turns the music on or off | open | |
| RUN/STOP pauses; moving the joystick resumes | open | |
| Q while paused quits the game | live | quitting returned to the attract sequence |
| Up makes Clyde jump | open | |
| Fire fires the current weapon | open | |
| Fire held for a second and released breathes a large flame | open | |
| Down then fire shows the weapons tablet; left and right with fire held pick a weapon, releasing fire selects it | live | `reference/weapons-tablet.png` |
| A weapon's grade is its colour on the tablet: red 1, green 2, blue 3 | open | |
| Only weapons bought in the shop appear on the tablet | open | |
| After each stage Clyde enters the witch's hut (the shop) | live | `reference/witch-shop.png` |
| Shop: left and right view the weapons, fire buys at the shown grade if there are enough Magic Potion Creatures and the weapon is below its top grade (grey) | open | |
| Shop: the I icon buys up to three clues for the next torture chamber | open | |
| Shop: the E icon (EXIT) leaves the shop | live | used to reach each stage |
| Weapon prices in the three kinds of Magic Potion Creature: Droopy 0/1/1, Super Droopy 2/0/1, Fireball 2/1/2, Fall Up 3/1/2, Wiggler 2/1/2, Curly Wurly 3/2/1, Flamer 6/3/4, Scatter Ball 3/5/5 (C64-Wiki) | open | |
| Magic Potion Creatures are collected during each stage | open | |
| An enemy dies only if it flashes white when hit | open | |
| Some enemies are linked: hitting one hits the others | open | |
| A torture chamber holds a captured Fuzzy who must be saved to go on, a puzzle against a time limit | open | |
| Underwater sections with an oxygen supply (C64-Wiki) | open | |
| End-of-level demons (C64-Wiki) | open | |
| Hidden extras (C64-Wiki) | open | |
| Parallax scrolling (C64-Wiki) | open | |
| Stage timer and lives in the status panel | live | `reference/play-1-1.png` |
| Cheat: once the title music stops and the high-score table shows, holding CTRL and 2 gives infinite lives (C64-Wiki, marked not tested). Live: the high-score fuzzies turn grey (the wiki says Clyde) and the instruction that takes a life becomes three NOPs (title_cheat_step) | live | `reference/cheat-grey-fuzzies.png` |
| Poke 15596,60: invulnerability (C64-Wiki, not tested) | open | |
| Poke 44183,173: unlimited shields (C64-Wiki, not tested) | open | |
| Poke 7328,208: unlimited lives in the main game (C64-Wiki, not tested) | open | |
| Pokes 33734, 33952 and 33505 to 173: unlimited lives in torture chambers 1, 2 and 3 (C64-Wiki, not tested) | open | |
| The high-score table is not saved to disk (C64-Wiki review) | open | |
| An ending sequence | live | file `CJ` (part `ending`): a text screen, then three animated scenes; `reference/ending-text.png`, `reference/ending-village.png`, `reference/ending-rave.png`, `reference/ending-hearts.png` |

## Beyond the documentation

Found in the code, not in the manual.

- Side A holds a separate program, "uncle clyde", that the game never
  loads.
- Side B holds a file `1@` beside the stages; the game loads it after a
  game over, before stage 1.1.
- The ending's text screen adds "WHY NOT USE THE CHEAT MODE NEXT TIME"
  only when the game was finished without the cheat (part `ending`,
  $7DE6, which tests for the cheat's NOPs at $1CA0).
- After the ending the game reloads from stage 0 and goes to the
  high-score check, as after the last life (`ending_exit`, $7E6B).

## Open questions

- What `1@` restores, and why the game reloads it rather than keeping it.
