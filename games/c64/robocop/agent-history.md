# RoboCop — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 17 November 2026, one run on claude-opus-5-5

- Two G64 images of the Data East release. The first boots and plays;
  every snapshot comes from it. The game is three loads over a resident
  part, so it was split into four parts (resident, level-1, level-2,
  level-3).
- The levels were reached with the game's own words, SUEDEHEAD and
  DISAPPOINTED. Typing them too fast on the title missed letters; each key
  held 0.25 s and 0.4 s apart, watching `$07CE` count, worked.
- Later stages of a level were reached by stopping at the first stage's
  start and setting the program counter to the stage's own start routine.
- Comparing the two images showed LOAD1 18 bytes shorter on the second
  and other bytes at `$C400`. Started on the second image, stage seven
  drew rubbish, which explained why stage seven's tiles are not in level
  two's files.
- The C64-Wiki's POKEs and flying cheat were looked for and do not fit
  this build.
- After annotation, the resident part's automatic zero-page labels leaked
  into the level listings and failed `check_listing.py`; deleting them and
  running `listing.py --relabel` on each level fixed it.
- Sample seed 2617 was checked by one checker agent: 12 of 60 wrong in a
  detail. They were corrected by editing the comments in `symbols.json`
  and rebuilding the listings, with the same mistakes found elsewhere.
- The music player first embedded `$2398-$3710` and disagreed with the
  game: the driver reads its voice offset tables at `$238F-$2394`, just
  below. The test caught it; the embedded range now starts at `$238F`.
- Running the three levels' copies of the driver side by side showed the
  five tunes and fourteen effects are identical in all three, and that
  levels two and three pay 300 points a second of time bonus, not 100.
