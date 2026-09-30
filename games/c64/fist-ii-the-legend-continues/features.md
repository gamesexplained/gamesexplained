# Fist II: The Legend Continues — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The contributor allowed looking the game up online. On 30 September
  2026 this session's network refused every game site it tried
  (archive.org's copy of the Mindscape manual, Lemon64, CSDb, GameFAQs,
  C64 Online, the FRGCB blog). What is below comes from web search result
  summaries of those pages, read the same day: leads, weaker than a page.
- Search summaries of archive.org ("Fist: The Legend Continues",
  Mindscape manual text), Lemon64 and the FRGCB blog: developed by Beam
  Software, published by Melbourne House (UK) and Mindscape (US), 1986.
  Programming Gregg Barnett, music Neil Brennan, graphics Russel Comte and
  Greg Holland. The Warlord rules from a volcanic stronghold; the Fist
  Masters hid their secrets on scrolls and built shrines and temples for
  meditation. Find eight scrolls and bring each to its meditation chamber;
  the scrolls' power opens the way to the volcano. The life bar refills
  slowly outside fights; meditation rooms refill it and are respawn
  points. The C64 cassette's second side held a "Combat Practice
  Program".
- The same summaries on the controls: left and right walk; fire with a
  direction back turns round; up evades a sweep and climbs stairs; down
  ducks or climbs down; without fire, up-forward is a high punch and
  down-forward a jab; with fire: up a flying kick, up-forward a high kick,
  up-back a back kick, forward a mid kick, down-forward a low kick, down
  a sweep, down-back a rear sweep; a roundhouse kick.
- The game's own screens: the menu (Training, Adventure), the title.

## Features

| Feature | Status | Where |
|---|---|---|
| Two modes on the disk: Training and Adventure | live (menu) | `LL` at `$9800` |
| Adventure: a large scrolling world (jungle, dojos, waterfalls, caves, dungeons, mountains) | live (jungle and a stone wall seen) | |
| Walk left and right | live | |
| Turn round with fire and back | open | |
| Up: evade a sweep, climb stairs; down: duck, climb down | open | |
| Punches and kicks by joystick position, with and without fire | open | |
| Opponents to fight one to one | live (one seen approaching) | |
| Dogs | open | |
| A life bar that refills slowly outside fights | open | |
| Eight scrolls to collect | open | |
| Shrines and meditation chambers: refill life, respawn point, progress kept | open | |
| Puzzles around scrolls and shrines | open | |
| The Warlord in the volcano | open | |
| Score (a number at the top of the screen) | live (0 at the start) | |
| Training / combat practice mode | live (menu); not played | `LOADIT` |

## Beyond the documentation

## Open questions
