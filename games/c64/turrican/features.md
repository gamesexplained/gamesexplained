# Turrican — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "Turrican", https://www.c64-wiki.com/wiki/Turrican, read 17 November 2026 (story, controls, extra symbols, display, high-score list, cheats, credits).
- The box's back cover (German, French and Italian), as C64-Wiki shows it, read 17 November 2026: "13 levels with more than 1000 screens", "50 different aliens", continue feature and high-score list. The Italian text says 12 levels. The screenshots on it are from the Amiga version.
- The game's own screens: the loading picture, the title's credit pages, "TURN THE DISK ! THEN PRESS SPACE", the panel.

## Features

| Feature | Status | Where |
|---|---|---|
| 13 levels in 5 worlds (three worlds of three levels, two of two) | open | |
| Each level is loaded from side 2 when the one before it ends | live | the main loop's next-level state |
| Loading picture with "PRESS SPACE", then the title with credit pages | live | |
| "TURN THE DISK ! THEN PRESS SPACE" before the first level | live | |
| Speech at start-up ("Welcome to Turrican...") | open | |
| Run left and right with the stick | open | |
| Stick up jumps; up again while rolled up turns back to normal | open | |
| Stick down ducks | open | |
| Down and fire lays a mine that explodes after a short time | open | |
| Down and SPACE turns the hero into a rolling wheel (three times a life): invulnerable, rolls by itself, steered left and right | open | |
| Holding fire brings out the lightning whip, swung by left and right; its length grows with blue symbols | open | |
| A short press of fire shoots: normal shot, scatter shot (red symbol, three levels) or laser (green symbol, grows longer) | open | |
| SPACE fires the energy lines: two lines that run up and down the screen and destroy what they reach, stopped by walls | open | |
| F7 throws a grenade: a smart bomb on walls and end bosses, a strong shot on other enemies | open | |
| CTRL pauses; fire continues | open | |
| Extra symbols: red scatter, green laser, blue whip, light blue shield, yellow P energy, white G grenade, white M mine, white L energy line, grey 1UP life | open | |
| Diamonds: 300 give a continue | open | |
| A time limit for each level | open | |
| Panel: lives, wheels, continues, time, diamonds, grenades, mines, energy lines, score, energy bar | live | |
| Secret rooms with extras, extra lives and diamonds | open | |
| End bosses and mid-level bosses | open | |
| A shoot'em-up stage (level 3-1) with music; the walking levels have no music | open | |
| High-score list: enter a name with RETURN; fire saves it to the disk, S asks for side 1, RUN/STOP returns | open | |
| Continue screen | open | |

## Beyond the documentation

Found in the code, not in the manual.

- An anti-cracker message from Manfred Trenz in the title's memory, "HI FOLKS, THE MANIAC IS BACK !!!", with the date he started (01.02.1989). Not shown on any screen yet found.
- The default high-score names: MANFRED TRENZ, MARKUS W., ALEXANDER ERNST, CHRIS HUELSBECK, MARC A. ULRICH, ! RAINBOW ARTS !.

## Open questions

- C64-Wiki says pause and fire held together let the hero walk with no enemies appearing. Is that a bug in the pause, or a test mode left in?
- C64-Wiki's extra-lives trick in level 1-1 (jump blind off the tower's left edge onto a tiny platform). What does the code do there?
