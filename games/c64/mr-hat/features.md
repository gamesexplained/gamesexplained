# Mr. Hat — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources, all read on 30 September 2026 (`work/research.md` has the notes,
source by source). No C64-Wiki page exists for the game (English and
German both 404), and no manual beyond the magazine's blurb was found.

- The printed booklet of *Commodore 64 Club* n. 6 (Systems Editoriale,
  September 1988), scan and OCR text:
  <https://archive.org/details/commodore-64-club>. Its whole text on the
  game, checked against the OCR: "Le avventure/disavventure di un
  simpatico omino che, allo scopo di arricchire la sua collezione di
  cappelli, è alla ricerca, all'interno di un labirinto, del leggendario
  'Cappello d'oro'. Questo labirinto è custodito da numerosi guardiani,
  che non esiteranno a scagliarsi contro il nostro eroe. Riuscirà,
  aiutato da te, a raggiungere il suo obiettivo? Joystick in porta 2."
  In English: a little man who collects hats searches a labyrinth for
  the legendary Golden Hat; many guardians throw themselves at him;
  joystick in port 2.
- Lemon64, <https://www.lemon64.com/game/mr-hat>, read through the
  Wayback Machine copy of 11 March 2026 (the site answers an agent's fetch
  with 403): credits, joystick port 2, single-screen platformer, the
  dog-in-a-hat anecdote, two user comments.
- GameBase64, <https://gb64.com/game.php?id=5053>: Systems Editoriale /
  Commodore 64 Club #06 and #14, Francesco Chiola for code, graphics and
  music, 114 blocks, PAL.
- Ready64, <https://ready64.org/giochi/scheda_gioco/id/1643/mr.-hat>,
  through the Wayback copy of 13 May 2025: issue 6, September 1988, twelve
  screenshots (six saved as `reference/web-*.png`), two comments.
- Ready64's 2008 interview with Francesco Chiola (Wayback copy), and
  <https://www.edicolac64.com/public/francesco-chiola.php>: the origin of
  the character, and that Lupenio (SIPE, 1988) came first and shares
  Mr. Hat's layout and jump routines.
- CSDb release pages 90535, 146567, 165550, 178985 and 204034: five cracks,
  dated from April 1988 to 1992.

## Features

| Feature | Status | Where |
|---|---|---|
| Joystick in port 2 | live | the title waits for `$DC00` = `$6F` at `$1770` (fire on port 2); the stick on port 2 walks Mr Hat |
| Fire on the title starts the game | live | `$1770`-`$1788` |
| Title screen "SYSTEMS PRESENTS A NEW GAME WITH": the cast Mr Hat, Octopus, Snaily, Dinky, Kniffy, "and all others" | live | `reference/title.png`; title routine `$16A3` |
| Title music | live | IRQ `$C0AF` on the title (heard as register activity only; the session has no sound) |
| Stick left and right walk | live | about 2.4 pixels a frame (`$21` to `$56` in 20 frames) |
| Fire jumps, the way Mr Hat faces | live | from standing in room 1 (`work/death1.vsf`), fire held: sprite Y 204 to 183 at once, held 13 frames, back to 204, and again while fire stays down; `$DC00` compared with `$6F` at `$5227`, `$5A93`, `$86E3` |
| Stick up | live | does nothing standing on a floor in room 1 (20 frames held); in rooms with ladders it climbs (`$7E`, agent reports) |
| Touching a hazard kills ("everything you touch kills you", Lemon64) | live | walking into the small object beside the television in room 1: Mr Hat sinks into the floor, then restarts at the room's entry (`reference/death.png`, `reference/respawn-lives.png`) |
| Lives, shown as marks at the bottom right of the status line | live | four marks at the start, three after one death; after five deaths the game returns to the title. The routine at `$1700` rewrites screen cells `$07E1` and `$07E2` |
| Game over | open | after the last life the title reappeared; whether a game-over screen shows first is not yet seen |
| Status line: SCORE (six digits), ROOM, STAGE | live | `reference/stage1-room1.png` |
| Score | open | the web screenshots show 025000, 105000, 150000, 225000 and 250000: steps of 25,000 or more, from what is unknown |
| Rooms and stages: at least ten rooms and four stages, each stage with its own brick colour (blue, pink, brown with black caves, blue) | open | web screenshots reach ROOM 10, STAGE 4; the count and order are not documented |
| Room 1: three floors and a LIFT on the right (the lift as prelude to the maze, Ready64) | open | `reference/stage1-room1.png` |
| Ladders (stages 2 to 4) | open | web screenshots |
| Guardians: Octopus, Snaily, Dinky (cherries), Kniffy (a dagger) and others move about the rooms | live | several sprites move in room 1 (sprites 0, 1 and 7) |
| Objects in the rooms (a television, a painting, cups, cones, plants, a chest of drawers, a trophy, keyhole and switch icons) | open | which are hazards, which are collected, and which are scenery is unknown |
| The Golden Hat, the goal | open | the booklet; how the game ends when it is found is unknown |
| RUN/STOP disabled | live | `$0328` = `$E1`, set by the tape's depacker at `$A220`, not by the game |

## Beyond the documentation

Found in the code, not in the manual.

- The image calls the KERNAL's `CHRIN` (`$FFCF`) and `CHROUT` (`$FFD2`) from
  some thirty places in `$7E11`-`$9EB2` and `$B68A`-`$BFAF`. What reads or
  prints text there is open.

## Open questions

- What does fire do in play?
- What scores 25,000 points?
- What does the LIFT do, and how does Mr Hat leave a room?
- How many rooms and stages are there, and what happens when the Golden
  Hat is found?
- The owner's copy is a freezer backup of the title screen
  (`orientation.md`). Which issue it came from (n. 6, or the reissue in
  n. 14) is unknown.
