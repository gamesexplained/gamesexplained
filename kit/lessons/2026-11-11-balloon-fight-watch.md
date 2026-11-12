## next · 2026-11-11 · Balloon Fight (NES) · Zihe Jia with Claude

- **A search for a route has to score what the game counts while it is
  played.** The recorded game on the Play tab popped 5 of the 20 bonus
  balloons, because the search scored by the score and the bonus round
  pays its balloons into the score only on its results screen. Scored
  by the game's count of balloons popped (`$05CD`), the same search
  popped 17 to 20, and seven of ten seeded searches popped all 20.
  `kit/skills/core/65-inputs`, "Score what the game counts, where it
  counts it", now says so.
- **Several seeded routes make a Watch button worth pressing twice.** A
  seed that moves the press of Start on the title and the search's tie
  breaks gives each search a game of its own, and the page picks one
  at random. `games/nes/balloon-fight/route/find_route.js` runs the
  seeds side by side, one process each, and `test_route.js` replays
  every one.
