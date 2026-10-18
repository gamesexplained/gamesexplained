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
| Side-scrolling beat-'em-up | live | level 1 |
| Left and right walk | live | sprites 0-2 move 4 pixels every 4 frames held; position in $2657, $2658 and $2659 |
| Up jumps | live | Darkman rises 26 lines in 32 frames |
| Down crouches | live | screenshot; no change of position |
| Fire alone, and fire with down, strike | live | fire with down shows an arm-out pose and moves Darkman 16 pixels forward in 32 frames; whether the game calls either a punch or a kick is open |
| Fire with right, and fire with up | live | fire with right shows no strike pose in the frame looked at; fire with up jumps as up does |
| Pause key | traced | $1777 waits while the key code in $0E2F is $50; which key gives $50 is open |
| Six levels, from city streets to a skyscraper finale against Strack | open | six level loads, `1a`-`6b` |
| Photo sessions between levels: move a cursor and fire to photograph henchmen, to make masks | open (play ending with $1A1E set leads through $4A8F to the screen at $58C8, next to the photo text) | text at $57C6 "DARKMAN MUST PREPARE A DISGUISE TO FOOL THE EVIL GANGSTERS" |
| Swinging on a rope under a helicopter in one level | open | |
| One life | open | |
| Joystick control | live | fire on port 2 starts the load and the game |
| Level briefing text | live (level 2's, after skipping level 1) | $0FE6 "LEVEL ONE ... END OF LINE" |
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

- Which key gives the pause code $50, and whether other keys do anything.
- The text "BABY AXE MAN" at $1376 (read as PETSCII): an enemy name or a
  default high-score name?
