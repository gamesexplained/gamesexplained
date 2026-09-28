# Chiller — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The cassette inlay (the manual), two scans on the Internet Archive:
  <https://archive.org/details/Chiller_1984_Mastertronic> and
  <https://archive.org/details/Chiller_1984_Mastertronic_2648_Instructions>,
  their OCR text read 28 September 2026. Both say © Mastertronic Limited
  1984. This is the main source.
- The game's own screens, captured from `work/play-idle.vsf` and from a boot
  of the contributor's PRG on 28 September 2026 (`reference/`).
- Lemon64 entry 468, read through the Internet Archive's copy
  (<https://web.archive.org/web/2022/https://www.lemon64.com/game/chiller>)
  on 28 September 2026, since the live site answers only a browser check.
  Credits, control port and magazine reviews.
- Games That Weren't, "Chiller V1",
  <http://www.gamesthatwerent.com/gtw64/chiller-v1/>, read 28 September 2026.
  Covers the withdrawn first version and its music.
- Italian Wikipedia, "Chiller (videogioco 1984)",
  <https://it.wikipedia.org/wiki/Chiller_(videogioco_1984)>, read 28
  September 2026, and its screenshot `reference/wiki-it-forest.png`.
- C64-Wiki has no page for the game: `https://www.c64-wiki.com/wiki/Chiller`
  answered 404 on 28 September 2026, and so did `Chiller_(Mastertronic)`,
  `Chiller_(1985)` and `Chiller_(game)`. The wiki's search was not reachable.
  English Wikipedia's "Chiller (video game)" is Exidy's 1986 arcade game, a
  different game.

What the sources say about who made it: code by Richard Darling and graphics
by David Darling (Games That Weren't); "Creator: David Darling, Richard
Darling", title screen by Jim Wilson and music by David Dunn (Lemon64). The
game's own title screen says "PROGRAMMED BY DAVID AND RICHARD DARLING".

## Features

No code has been read yet. **Where** names what was seen, and the few
addresses are leads for `50-coverage`, not traced routines. The "live"
observations come from `work/feat_alive.py` and `work/feat_shots.py`, run
from `work/play-idle.vsf` with the stick on control port 2.

| Feature | Status | Where |
|---|---|---|
| The boy walks left and right | **live** | Stick right: sprite 0's X went 128 → 163 in 1.5 s; left brought it back to 128 |
| The boy jumps (stick up, or SHIFT) | **live** | Stick up: sprite 0's Y went 227 → 203 in about 0.5 s and fell back to 220 when released (`reference/play-jump.png`). SHIFT not tried |
| The boy can also run; walking, running and jumping each cost more energy than the last | open | The manual; its control table has no run, so how to run is not known |
| An energy bar drains, and enemies touching the boy drain it | **live** | With no input the bar was nearly empty within about 15 s (`reference/energy-low.png`). Enemy contact not told apart from other causes |
| No energy means the game is over | **live** | "GAME OVER" under the HUD (`reference/game-over.png`) |
| Eating mushrooms restores energy | open | The manual |
| Some mushrooms are poisonous toadstools | open | The manual |
| All the magic crosses must be collected to leave a screen | open | The manual; the level card says "collecting the blue magic crosses" |
| HUD: score, magic crosses collected, high score, energy bar | **live** | Top two rows (`reference/play-forest.png`) |
| Enemies: ghouls, zombies, ghosts and bats | open | The manual. On the forest screen a spider on a thread, a bird and a skeleton move; which of the manual's names each has is not established |
| Five screens: forest, cinema, ghetto, graveyard, haunted house | open | The manual; only the forest has been reached |
| A card names each screen and says what to do | **live** | "THE FOREST / MOVE THE BOY AROUND THE FOREST COLLECTING THE BLUE MAGIC CROSSES." (`reference/level-card-forest.png`) |
| After the haunted house, the same five screens in reverse, with the girl | open | The manual |
| On the return journey only, fire (or `?`) switches control between the boy and the girl | open | The manual, starred: "You can only SWITCH PLAYERS on the Return journey" |
| On the return journey, the border colour shows who is being controlled | open | The manual |
| On the return journey, the boy collects the blue crosses and the girl the red ones | open | The manual |
| The goal is to get back to the car | open | The manual |
| Joystick in control port 2 | **live** | Input on port 2 moved the boy. Leads: `LDA $DC00` at `$C8C5`, `$C8D3` and `$C8E1` tests bits 1, 2 and 3 (71 hits in 3 s); `$58BD` tests the fire bit (2,224 hits in 3 s) |
| Keyboard: Z left, C right, SHIFT jump, `?` switch players | open | The manual and the title screen; not tried |
| A title screen with the credits and the controls, shown after a game ends | **live** | `reference/title-screen.png`, reached by standing still until the game ended |
| Music during play | open | Lemon64 credits David Dunn; not listened to in this run |
| The first release played a version of *Thriller*, withdrawn and replaced with new music | open | Games That Weren't; which version this image is, is not known |

## Beyond the documentation

Found in the code, not in the manual. Nothing yet: no code has been read.

## Open questions

- **Which release is this?** Games That Weren't describes a withdrawn
  first version with *Thriller* music and later copies with new music.
  This image is a PRG whose loader writes `(ANTISOFT)` into the BASIC stub
  (`orientation.md`), so someone other than Mastertronic has handled it.
  Settle it by listening, or by comparing the music data against a
  documented V1.
- **Can every cross be reached?** A Lemon64 user comment (2022) remembers
  the game as impossible to finish because one cross was out of reach,
  and a later crack that fixed it. That is one person's memory. Check it
  against the crosses' positions once they are found.
- **How does the boy run?** The manual lists walk, run and jump, but its
  control table has no run.
- **Which sprite is what.** Sprite 0 is the boy (it follows the stick).
  The other seven are not yet attributed.
- **The picture nobody placed.** Games That Weren't shows a screenshot
  from *Your Commodore* that matches no screen in the released game.
  Noted in case a stray bitmap turns up in the sweep.
