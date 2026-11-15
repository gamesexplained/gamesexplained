## next · 2026-11-15 · Friday the 13th (C64) · air with Claude

- **Writes that match the game's in order can still drop notes: the
  chip needs their cycles too.** Friday the 13th's music page played
  five of its seven tunes with notes missing, while its test passed
  every write, frame by frame. The game restarts a note by turning the
  voice's gate off and, a few hundred cycles later, on again, inside one
  call of its driver. The site's player applied a frame's writes at one
  instant, and an envelope at full level that is released and attacked
  at the same instant wraps to 0 and holds there until the next note, as
  the chip itself does. Recorded from VICE, tune by tune, the share of
  frames loud in the game and under a quarter as loud on the page was 11
  to 43 % in the five tunes before the writes kept their cycles, and at
  most 5 % after. A scan of every C64 page's players found notes lost the
  same way on the pages of twelve more games, Count Duckula's television
  theme worst at 120 of 240. A driver now hands the player each write's cycle
  (`kit/skills/c64/steps`, "The sound"), and a listening check against a
  recording of the game is what shows a tune whole; the write-for-write
  test only shows it is the game's.
