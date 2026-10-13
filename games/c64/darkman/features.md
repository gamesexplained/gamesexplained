# Darkman — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- Web search result summaries for "Darkman C64 Ocean 1990", quoting
  Wikipedia's "Darkman (video game)" and a Commodore Format review,
  13 October 2026. Second-hand: the session's network policy refused the
  pages themselves (C64-Wiki and others), so only plain claims are taken
  from them, and no external screenshots were saved.
- The game's own screens and stored text (`facts.md`, "Text").

## Features

| Feature | Status | Where |
|---|---|---|
| Side-scrolling beat-'em-up: Darkman walks, jumps, punches and kicks | open (play seen, moves not tested) | level 1 |
| Six levels, from city streets to a skyscraper finale against Strack | open | six level loads, `1a`-`6b` |
| Photo sessions between levels: move a cursor and fire to photograph henchmen, to make masks | open | text at $57C6 "DARKMAN MUST PREPARE A DISGUISE TO FOOL THE EVIL GANGSTERS" |
| Swinging on a rope under a helicopter in one level | open | |
| One life | open | |
| Joystick control | live | fire on port 2 starts the load and the game |
| Level briefing text | traced | $0FE6 "LEVEL ONE ... END OF LINE" |
| Title page alternating credits and high scores | live | $0A20, $11BC, $13C9 |
| High-score table with name entry | traced | $122E "YOU HAVE ACHIEVED A HIGH SCORE", $1357 "PLEASE ENTER YOUR NAME" |
| Status panel under the play area with a portrait | live | split by the raster interrupt at $1D43 |
| Game over screen | live | text at $1A02 |

## Beyond the documentation

- Each level is loaded on its own, after a "PRESS FIRE TO LOAD NEXT
  LEVEL" screen; the game asks for side 2 before level 4 ($0625).
- A routine at $1FD5 starts with RTS and so never runs; the bytes after
  it test CIA 2 port A bit 2.
- The high-score table holds ANDY, DAVE, JASON, PETE and STUART.

## Open questions

- Does $9400-$BEFF, with the sound driver, stay in memory across loads?
- What the keyboard reads at $0E38 and $0E58 are for (pause, a cheat?).
- The text "BABY AXE MAN" at $1376 (read as PETSCII): an enemy name or a
  default high-score name?
