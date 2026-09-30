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
| A large scrolling world of screens and areas | live (jungle, stone wall); 123 screens, 48 areas | `$4A71`, `$4AEC` |
| Walk left and right | live | move map `$33C3` |
| Turn round with fire and back | traced | `$33C3` |
| Up: evade, climb stairs; down: duck, climb down | traced | `$33C3`, `$33E3` |
| Punches and kicks by joystick position, with and without fire | confirmed (flying kick, sweep live) | `$33C3`, move scripts `$AF46` |
| Opponents fought one to one, with attack combinations | confirmed (one fought live) | `$2E0E`-`$32F8` |
| Dogs and other hazards | traced: hazard objects cost 2 or 10 energy and can be knocked away | `$2A57`, `$2BB4` |
| A life bar that refills slowly | confirmed (47 at the start live; +1 every 128 frames traced) | `$2D14` |
| Eight scrolls to collect | traced | flags `$0405`-`$040C` |
| Meditation chambers: refill, respawn point, progress kept | traced: rooms `$44`-`$4B`; meditation raises the maximum by beaten opponents; respawn in the last chamber | `$396F`, `$2D33` |
| Lives | live: 1 at the start; traced: +1 per scroll delivered | `$2D32` |
| Puzzles around scrolls and shrines | traced in part: area 5 drains the hero unless scroll 8 is delivered | `$2CE4` |
| The Warlord in the volcano | open: an ending scene is reached from room `$7A` (`$2DB5`), not tested | |
| Score and high score | confirmed (score rises on a hit, live) | `$CC01`, `$CC21` |
| Music, three tunes by zone | confirmed (tune 3 in the jungle) | `$F400` |
| Sampled sound effects | traced | `$3D8B`, `$3DB8` |
| RESTORE pauses | live | `$3C23` |
| F5 restarts | traced | `$2444` |
| Training / combat practice mode | live (menu); not analysed: a separate load | `LOADIT` |

## Beyond the documentation

- The game runs two tasks on two stacks: the scrolling is done by a
  background task that the interrupt switches to.
- Fighters are stored facing one way and mirrored as they are unpacked.
- The fighters' sprites are split down the screen in one of seven layouts.
- A second fighter on joystick port 1 is wired into the input routine.

## Open questions

See `facts.md`, Open questions.
