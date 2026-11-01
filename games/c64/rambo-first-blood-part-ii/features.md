# Rambo: First Blood Part II — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The game's own instruction pages (`reference/instructions-1.png`,
  `reference/instructions-2.png`), read 2 November 2026
- "Rambo (1985 video game)", Wikipedia,
  https://en.wikipedia.org/wiki/Rambo_(1985_video_game), read 2 November 2026
- ZZAP!64 issue 10's review as reproduced by GB64's Game of the Week,
  https://gb64.com/oldsite/gameofweek/10/gotw_rambo.htm, read 2 November 2026
- The C64-Wiki has no page under the game's title (HTTP 404 on
  2 November 2026); Lemon64 refused the fetch (HTTP 403).

## Features

| Feature | Status | Where |
|---|---|---|
| Joystick in port 2 moves Rambo; fire uses the weapon in hand ("PLACE YOUR WEAPON INTO PORT TWO") | open | |
| Space bar selects the weapon (instructions page 2) | open | |
| "S" toggles music and sound effects (instructions page 2) | open | |
| RUN/STOP toggles a pause ("suspended animation", instructions page 2) | open | |
| Extra weapons lie in the terrain and the enemy campsite (instructions page 2; Wikipedia names a rocket launcher, an M16 and a bow with explosive and plain arrows) | open | |
| Rambo starts with a knife and grenades in unlimited supply (Wikipedia); with a bow, two kinds of arrow and knives (ZZAP!64). The sources disagree | open | |
| An energy bar; Rambo dies when it reaches zero, usually from bullets (ZZAP!64). The panel shows ENERGY and SCORE | open | |
| Free scrolling in every direction over a jungle map (ZZAP!64) | open | |
| The POW camp: huts and towers; Banks tied to a cross at its top left; a hut at the bottom left freed with the knife (ZZAP!64) | open | |
| A helicopter north of the compound; once aboard, its fuel runs down fast and a landing place must be found; rescued prisoners run to it (ZZAP!64) | open | |
| Inside the helicopter only the rocket launcher fires (a fan page quoted in a search summary, second-hand) | open | |
| An enemy gunship harasses the flight north to Thailand (ZZAP!64) | open | |
| Three stages, with points for each completed and for killing guards; the game starts again after the mission (ZZAP!64) | open | |
| A name-entry wheel and an "all time heroes" table of scores (`reference/name-entry.png`, `reference/heroes-table.png`) | live | |
| Martin Galway's music, nine tunes counted in play (ZZAP!64) | open | |
| The instruction text tells the player not to engage the enemy, and the review calls silent weapons safer near the camp (noise draws attention) | open | |

## Beyond the documentation

Found in the code, not in the manual.

- The loader checks for a cartridge: it writes `$8004` and resets the
  machine if the write does not hold (`orientation.md`).

## Open questions

- Which weapons Rambo starts with, given the two sources disagree.
- Whether noise from a weapon changes what the enemies do.
