# Spindizzy — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "Spindizzy", https://www.c64-wiki.com/wiki/Spindizzy, read 31 October 2026 (infobox, description, controls, map colours, score screen, elements, inhabitants, displays; its screenshots are `reference/wiki-*`)
- Electric Dreams' instruction sheet (German, French and Dutch; no English page in the scan), "Spindizzy (1986 Electric Dreams) [6082] Instructions" on the Internet Archive, https://archive.org/details/Spindizzy_1986_Electric_Dreams_6082_Instructions, read 31 October 2026
- The game's own screens: the title, its help (H), options (O) and score (S) screens, and the keys in play, each in `reference/`, taken 31 October 2026

## Features

| Feature | Status | Where |
|---|---|---|
| Title screen: fire starts, S scores, O options, H help (`reference/title.png`) | live | |
| Help screen naming the world's pieces: lift, switch, water, jewel, ice, clue, trampoline, compass (`reference/help.png`) | live | |
| Options: F1 speed slow or fast, F3 one or two joysticks, F7 back to the title (`reference/options.png`) | live | |
| Two-player mode: one player steers up and down, the other left and right (wiki) | open | |
| Gerald, a spinning top steered with the joystick in port 2, in eight directions; fire for more speed | open | |
| Space brakes Gerald on a rough surface, and costs time (manual: hold it until the time runs out to abandon the mission) | open | |
| F1, F3, F5, F7 choose the view: north, turn clockwise, turn anticlockwise, the opposite side (`reference/play-view-rotated.png`) | live | |
| A compass in the bottom right corner points north | live | |
| M shows the map, which fills in as rooms are visited; yellow mapped, red unmapped, purple holds a jewel, black is not part of the world; time stops while it shows (`reference/play-map.png`) | live | |
| S shows the score: per cent of screens, of jewels and of the game (`reference/play-scores.png`) | live | |
| C switches the colour scheme (wiki and manual: colour or monochrome) (`reference/play-colour-scheme.png`) | live | |
| P pauses; the border flashes until a key is pressed (`reference/play-pause.png`) | live | |
| I changes Gerald's shape: top, ball, pyramid (`reference/play-shape-ball.png`) | live | |
| Q abandons the game and goes back to the title (wiki) | open | |
| TIME counts down; finding a new room or a jewel adds time; falling costs time | open | |
| TO MAP counts the rooms not yet visited; the start shows 385 | live | |
| JEWELS counts the jewels collected | open | |
| The world: about 386 rooms, each a screen, joined at their edges | open | |
| Ramps, stairs, jumps, bridges, gangways, one-way paths, water, trampolines, ice | open | |
| Switches and lifts: a switch turns on a lift or moves a block; a lift and its switch share a symbol and may be in different rooms | open | |
| At most two switches active at once; a "clear" switch turns both off | open | |
| The bottom-left box shows the switches that are on, or a clue: the switch a room needs | open | |
| Inhabitants that home in on Gerald and drain time when they touch him | open | |
| A beginners' area east of the start where time runs more slowly (manual) | open | |
| Every game starts in the same room (wiki) | open | |
| Game over when the time runs out, followed by the score screen | open | |

## Beyond the documentation

Found in the code, not in the manual.

## Open questions
