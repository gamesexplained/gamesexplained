# A View to a Kill — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

The game is five programs, loaded one after another (`orientation.md`).
Each row names its part; the addresses are in that part's own listing.

Sources:

- The game's own screens: the instruction page before each section, the
  memos, the code prompts and the intro's credits, read in the emulator
  on 30 September 2026.
- Wikipedia, "A View to a Kill (video game)",
  https://en.wikipedia.org/wiki/A_View_to_a_Kill_(video_game), read 30
  September 2026: the sections, the password system, the music, the
  reviews.
- C64-Wiki (German), "A View to a Kill",
  https://www.c64-wiki.de/wiki/A_View_to_a_Kill, read 30 September 2026:
  credits, the three codes, the ratings.
- MI6-HQ, "A View To A Kill (1985)",
  https://www.mi6-hq.com/sections/games/avtak, read 30 September 2026:
  per-platform programmers, the section descriptions, the mine's
  detonator number.
- The English C64-Wiki, Lemon64 and its manual page, the Internet Archive
  and the Zzap!64 archive could not be read from this session (the
  network refused them, or they answered 403), so no manual text was
  available.

## Features

| Feature | Part | Status | Where |
|---|---|---|---|
| Gun-barrel opening picture, the Domark logo and a scrolling roll of credits | intro | live | `reference/intro-gun-barrel.png`, `intro-credits.png` |
| Spoken words, "speech by B.-Jones": "Now, James, your mission begins" | intro | open | the text is on screen at the end of the intro (`reference/intro-mission-begins.png`); the speech itself is not yet traced |
| Music by Tony Crowther: the James Bond theme and Duran Duran's "A View to a Kill" (Wikipedia, MI6-HQ) | all | open | |
| A choice of theme tune only, sound effects only, or both | paris | open | listed on the instruction page (`reference/paris-instructions.png`) |
| Chase May Day by car while she parachutes from the Eiffel Tower; be at her drop point when she lands | paris | open | |
| A first-person view from the car over an overhead map of the streets | paris | live | `reference/paris-chase.png` |
| May Day's altitude counting down (the 890 readout) | paris | live | `reference/paris-chase.png` |
| A clock, a damage gauge | paris | live | |
| Police and road blocks | paris | open | |
| Stick: forward accelerates, back is reverse and brake, left and right steer, fire shoots, back with fire is a handbrake turn | paris | open | the game's own instruction page |
| Room-to-room view of the burning City Hall, with the building in miniature beneath it | city-hall | live | `reference/city-hall-play.png` |
| Memos from M and Q before the section | city-hall | live | `reference/city-hall-memos.png` |
| Collect and use objects (keys, buckets of water) from icon menus to get through the floors and rescue Stacey before the fire spreads | city-hall | open | |
| A thermometer and a clock | city-hall | live | |
| Side view of the mine under Silicon Valley; find May Day, who is trapped | mine | open | the briefing, `reference/mine-briefing.png` |
| Collect the code numbers that defuse Zorin's bomb before the time runs out | mine | open | |
| A countdown clock (89:40:xx) and a Geiger counter | mine | live | `reference/mine-play.png` |
| Objects: a grapnel gun, wooden planks, a mine pass, a winch (Wikipedia, C64-Wiki) | mine | open | |
| The detonator combination 32768 (MI6-HQ) | mine | open | |
| Each later section asks for the code the previous one gave; RETURN plays it without one | city-hall, mine, finale | live | the prompts, `reference/city-hall-code-prompt.png` |
| The codes CCPHJ (City Hall), DB4CT (mine) and ILVCT (the ending) | city-hall, mine, finale | confirmed | each typed at its prompt and accepted; the finale's check is `read_code` at `$804C` (finale) |
| The ending: Bond seen through binoculars, then the lens cracks | finale | confirmed | `reference/finale-shower.png`, `finale-cracked-lens.png`; `show_ending` at `$1000` (finale) |
| Keyboard control as well as the joystick (C64-Wiki) | all | open | |

## Beyond the documentation

Found in the code, not in the manual.

- The finale's code is a fixed string, compared at `$8061` (finale):
  nothing derives it from play, and the ending prints no code.
- RESTORE brings the finale's code prompt back: `finale_start` points the
  NMI vector at itself (`$8000`, finale).

## Open questions

- Whether the code prompts are the original game's or were added by the
  crack that split it into five files.
