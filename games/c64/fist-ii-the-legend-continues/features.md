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
- The C64 manual, Lemon64's docs image, given by the contributor on
  1 October 2026 and read in full: story, enemies, Chi, meditation,
  trigrams, controls, Tournament and credits. It replaces the summaries
  below wherever they differ.
- Search summaries of archive.org ("Fist: The Legend Continues",
  Mindscape manual text), Lemon64 and the FRGCB blog: developed by Beam
  Software, published by Melbourne House (UK) and Mindscape (US), 1986.
- Wikipedia's "Beam Software" article, read 1 October 2026: a Melbourne
  studio working for Melbourne House; its 1980s list includes The Hobbit,
  Sherlock, The Way of the Exploding Fist (Gregg Barnett, 1985), Rock'n
  Wrestle (1986), Shadows of Mordor (1987) and Samurai Warrior (1988),
  each released on the C64. The Overview's list of Beam's other games
  comes from here.
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

## Outside sources checked on 1 October 2026

- Magnus Andersson's GameFAQs walkthrough (final version, 30 May 2007;
  gamefaqs.gamespot.com/c64/571009-fist-the-legend-continues/faqs/48570),
  read through a fetch summary with quoted sentences. It collects every
  trigram "without using the "restore cheat"-trick at the waterfalls";
  numbers 39 enemies, the last two "Warlord 1" and "Warlord 2, glowing
  mask"; wolves "won't kill you, just drain your energy"; a trigram stops
  the "green radioactive (or poisionous, I don't know) chamber" draining
  energy (scroll 8, `$2CE4`, agrees); one gives night vision in the
  pitch-black place (scroll 7, `$10E5`, agrees); and "Fall down into the
  hole, and the game is completed". Checked against the tables: the
  volcano rooms 60, 61 and 63 each hold an opponent record, and the way
  on from 63 to the ending, room 122, is an exit of type 3 (stick up and
  right at column 69), not a hole; what the player sees there has not been
  watched. The RESTORE key pauses the game (`$3C23`); how a pause would
  help at the waterfalls is open. The count of 39 has not been compared:
  the encounter table has 40 opponent records (flags bit 6 clear), and
  hordes add opponents beyond them.
- Mallo's review on The King of Grabs (19 January 2023, C64): developed
  by Beam, "mostly by the same people who made Fist One", published by
  Melbourne House in 1986, music by Neil Brennan; "bugs that make
  defeated enemies re-appear" (the code makes this deliberate, `$2820`);
  "no end game screen, and no title screen" (the Mindscape disk studied
  here shows a title picture while loading, and the ending is the final
  scene `$2DB5`; the review's copy is not named); a one-on-one tournament
  version "given away for free on side two".
- The Mindscape manual for the US release, *Fist: The Legend Continues*
  (gamesdatabase.org PDF, filed under Melbourne House; read through a fetch
  summary with short quotes, 1 October 2026). Copyright Beam Software,
  "From Melbourne House Publishers Ltd", Mindscape; no individual credits.
  It describes the disk's Training mode: one player "must defeat each
  opponent twice to advance to the next dan"; two players fight "eight
  sixty-second rounds, two in each of four locations"; points for every
  strike that connects and for time remaining after a knockout. It lists
  the trigrams in the same order as Lemon64's copy and adds that meditation
  "cures poison", and "underwater hazards" among the dangers. Neither of
  these two has been checked in the code.
- The pasted text guide ("FIST 2 the legend continues Commodore 64/128
  Guide to the entire game") is by the Lemon64 member exploding fist64,
  linked from lemon64.com/forum/viewtopic.php?t=67329 (2 March 2018) as a
  Google Drive document; the contributor confirmed the thread from a
  screenshot on 1 October 2026.
