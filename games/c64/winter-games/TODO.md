# Winter Games — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver: 100 % coverage on all ten parts (221,933 bytes), a sample of 60
comments checked and corrected, every feature confirmed, traced or live,
and the minisite built with a player for every anthem, every event's tune
and five of the effects.

The sample found 5 wrong in 60 (8.3 %, 95 % interval 2.8 % to 18.4 %),
over the mark of 2. An audit of the whole listing by fresh checkers is
recommended before the page is relied on (`kit/CHECKING.md`).

## For Gold

- A human edit pass over How it works and Discoveries, section by section
  (`kit/style.md`).
- Decide whether How it works needs a section on Free Skating's own
  marks (the second ceiling and the three counts of each element), or
  whether the calculator's mode switch says enough.

## For Platinum

- A Play tab: a port of an event to JavaScript, routine by routine, held
  in lockstep with the game (`kit/skills/core/70-minisite/play.md`), then
  the other six. Ski Jump is the smallest whole event; the skating
  calculator already runs `base_mark` and `free_mark` and has a test.

## Open questions

- Side 1 has 47 sectors, track 20 sector 0 to track 24 sector 11, that the
  BAM marks used and no file holds, chained like a file. Nothing in this
  run read them.
- Who wrote the C64 version: Wikipedia names Richard A. Ditton, the
  C64-Wiki Chris Oberth, whom Wikipedia credits with the Apple II version
  (`features.md`). The title screen names only Action Graphics.

## Article ideas

- A Hot Dog judge: press a move, hold it, and see the base mark and the
  eight judges' tenths as the game draws them.
- Biathlon's sight: a widget that runs `heart_table` live, with the pulse
  as a slider and the sight bouncing at its heartbeat.
