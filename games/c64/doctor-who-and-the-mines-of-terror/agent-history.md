# Doctor Who And The Mines Of Terror — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 30 September 2026, Silver run

- The image is a single packed PRG. Exec checkpoints over every range
  outside the depacker (`$0200`-`$07FF`, `$0830`-`$749B`, `$7600`-`$FFFF`)
  stopped the machine at the first instruction outside it, `$FDA3`
  (IOINIT, called by the depacker's exit at `$01C6`); reading the exit
  gave `JMP $484D`.
- The network refused every game site; only search-result summaries were
  available. Their key lists are the BBC Micro version's, and the C64's
  keys were read from `$8F24` instead.
- The flow tracer, started at `$484D`, `$8010` and `$800F`, decoded screen
  bytes and text as code in eleven places (the loading picture at `$0400`
  holds `$20` bytes, read as `JSR $2020`). They were reset by hand; the
  first reset did not hold everywhere, and agent 1 found several still
  marked as code. One of them, `$2D50`, was real code reached from
  `$C8B0`: agent 7 found it from the calling side.
- The lead first wrote that the time counter `$1B`-`$1D` falls every 64
  frames, from reading the `AND #$3F` and not the two `BNE`s before it.
  Agent 3 caught it; it falls once every 65,536 frames.
- Seven annotation agents on disjoint ranges took the traced code from 0 to
  100 % in about sixteen minutes. Two claims from their reports were
  refuted live: a music "restart every other frame" bug (the tune plays)
  and an item numbering guessed from the name order (the game's own table
  at `$1720` says otherwise).
- The ledger missed 16 KB of loaded data (the map under the KERNAL and the
  sprite images) until `listing.py` was given the play snapshot as
  `--entry`; both are now in `coverage.extra`.
- The map renderer first showed letters where the start zone has
  stalactites: zones swap in their own shapes for 16 characters, and the
  hand-over image holds a different set. The page embeds the running
  game's 16 glyphs.

## 4 October 2026, the prisoner

- The steward's notes from a video walkthrough described a door "locked
  with the controller" that a detonator opens. The comments on `$50` and
  on the flag table at `$778A` had left both unexplained. Reading
  `$CE28`, `$C9A5` and `$CF24` together showed controller `$22` taking
  the Doctor prisoner and walling up switch cell 11, the cell the blast
  at `$C22E` reopens. Traced from the listing only; not played live.
- The same notes say to "avoid the sensor" in the locked room. The
  steward explained that players call the code lock's wall of shapes the
  sensor, which the Solution tab already covers.
- The steward's third route has the Master knocking the Doctor down. The
  code sets the Doctor's `$1CB0` to `$79` as the crystal is taken
  (`$B544`), and the sprite drawn meanwhile, frame `$55`, is a figure
  lying down. The crystal's drop point after a theft (`$B587`) was in the
  comments but not on the pages.
