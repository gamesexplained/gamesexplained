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

## Silver pass (18 November 2026, claude-opus-5-5)

- The Graphics tab gained the cast: every figure of each level, built
  from its listing's shapes the way `place_figure_a` builds it (outlines
  0 and 1 hi-res black, body 2 multicolour stretched), stepped through
  the game's own tables. RoboCop's body is assembled as `player_arm`
  does it, from the arm table by aim and the gun-hand table by pose,
  after mirroring the level's right-facing rows as its start-up routine
  does. A live screenshot of stage one (VICE v4.0.0 release, 57 of 57
  checks) matched the composite of `$40`, `$41`, `$FE`.
- Level two's door walk reads entries 2 and 3 of a two-entry table at
  `$854E` when RoboCop goes out; the tile draws what those bytes give.
- The mirror claim was only level two's; levels one (`$A912`) and three
  (`$A36E`) mirror too. facts.md, features.md and Graphics now say so.
- Reader review (75-review) on claude-opus-5-5, report in
  `work/reports/reader-review.md`: 22 findings. Fixed: the snapshot
  sentence and "not known" sentence cut; the two-disk file names; the
  time-bonus and short-second findings given a worked case on
  Discoveries instead of repeating Gameplay; ED-209's 2-frame reload
  added to Gameplay; unused effects 10, 12 and 13 added to Discoveries;
  method sentences cut from Maps and Gameplay; stage seven's lift and
  the port-1 keyboard rule told in play terms; blank shapes dropped from
  the Graphics sheet. Left for the next pass (TODO.md): a scene for the
  level-three firing bug, a player for the leftover tune at `$BBCC`
  (a fragment whose start sits in `$B800`, with no tune-table entry, so
  it needs reconstructing first), stage eight's lack of stair tiles
  shown, pictures for the high-score table and pickups, a power-drain
  demonstration, effects shown beside their events, and a two-sprite
  figure picture. The footnote markers the reader saw run into numbers
  are superscripts on the page; its text extraction flattened them.
