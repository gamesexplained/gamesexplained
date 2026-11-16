## 0.0.342 · 2026-11-15 · Super Wonder Boy in Monster Land (C64) · 64kramsystem with Codex, reviewed by air with Claude

- **Watch each level run before writing about it.** This run captured the
  first round in play and reached loads 2 to 31 by calling the game's own
  stage change, then studied each from a paused snapshot. Every finding
  about those loads came with "this does not establish whether the state
  arises during ordinary play", and 60 of the first draft's 157 page
  sentences described the tests instead of the game. Five later C64 runs
  by the same contributor (pull requests #889, #904, #907, #908 and #909,
  14 November 2026) were told to make no playthroughs, and read the same
  way: How it works described data and routines, and each finding ended
  in a paragraph about the setup that showed it. A few seconds of each
  level running with input gives the page what a player meets there
  (`20-features`, "See every level running").
- **A bug shown only in a forced setup is a lead, not a Discovery.**
  Those runs published bugs seen only after poking a variable or calling
  a routine directly: a boss scan that skips a comparison, a particle that
  reads another slot's speed, a beam whose hit flag outlives it. Each
  section had to end by saying it did not know whether ordinary play
  meets the bug. Reproducing a bug from the start of its level, with
  input, is minutes of work when it is real and shows when it is not;
  until then it stays in `facts.md` (`70-minisite`, "Discoveries").
