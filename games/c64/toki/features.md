# Toki — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- Every page fetch was refused by the session's network proxy on
  2026-10-08 (C64-Wiki, Lemon64, Wikipedia, the manual at regvault.org).
  What follows from the web is second-hand, from web search result
  summaries read on 2026-10-08, and covers plain claims only.
- Wikipedia, "Toki (video game)", https://en.wikipedia.org/wiki/Toki_(video_game): Ocean published the C64 version in 1991; the arcade original is TAD Corporation's (1989).
- The C64 manual as summarised from https://api.regvault.org/api/v1/game/c64/30244052ac1b8bbbd702969d0a451f34/manual: program Al Dukes; graphics Mike Clayton, Joff Scarcliffe, William Harbison; music and effects Keith Tinman. CPCWiki credits David Looker instead; unresolved.
- Retro Gamer, "Conversion Capers", 29 November 2018, https://www.pressreader.com/uk/retro-gamer/20181129/282415580330175: the only 8-bit computer version Ocean released; missing the full intro, one music track, one arcade level missing.
- Zzap!64 issue 80 reviewed it (codetapper.com's Zzap review list); score not found.
- The game's own screens and stored text (this run).

## Features

| Feature | Status | Where |
|---|---|---|
| Ocean type 1 cartridge, 16 banks of 8 KB at $8000 | confirmed | CRT header and chip packets |
| Autostart: CBM80 at $8004, cold start $812C | confirmed | bank 0 |
| Play runs from RAM with the cartridge hidden ($01 = $35) | live | play snapshot: RAM $8000-$BFFF answers at the CPU's addresses; $8000-$9FFF holds a copy of bank 3 |
| Title screen, then a stage card with a choice of SFX or MUSIC, then play | live | fire on port 2 at each step (orientation.md) |
| Five stages named: Labyrinth of Caves, Lake Neptune, Caverns of Fire, Ice Palace, Dark Jungle | traced | text in bank 0 at $8B50-$8B9F |
| One arcade level missing (Retro Gamer) | open | five stage names stored against the arcade's six; not checked which |
| STAGE CLEAR, GAME OVER and CONTINUE messages | traced | bank 0 $8B27-$8B44 |
| Timer per stage, starting at 4:30 in stage 1 | live | status bar, stage 1 |
| Lives, a second counter (coins, by the icon), stage, a bar, TOP and 1UP scores in the status bar | live | reference/stage-1.png |
| Toki spits projectiles at enemies | open | Wikipedia, Zzap!64 |
| One music track (Retro Gamer) | open | |
| Copyright 1991 Ocean Software Ltd, All Rights Reserved | traced | bank 2 $8CEC-$8D15, game alphabet |

## Beyond the documentation

- The game's text uses its own alphabet: A-Z are codes $00-$19, digits
  0-9 are $1C-$25, space is $27 (decoded from the stage card on screen and
  checked against the stored strings).

## Open questions

- Which arcade level the C64 version leaves out.
- What the second status-bar counter and the bar beside STAGE measure.
