# Octopus — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

- 12 November 2026. The run started from MAME's ROM set on the kit's
  machine, the second game on the Game & Watch platform, with the web
  lookup allowed. Only pages $09, $0A and most of $11 match Popeye's ROM.
- The segments were mapped from MAME's SVG, each name drawn at its shape,
  then colours for the small ones; draw_screen gave the cell for each
  latch.
- Wrong turn: the first coverage run used random presses, and its phase
  tags said the point routine and the end of a take never ran in a game.
  They do; random play never scored. A player that looks a few steps
  ahead on copies of the machine (`work/tools/auto.js`) replaced it and
  the coverage was run again.
- Wrong turn: a cross-reference read from the first coverage run's file,
  after the second had been written, said nothing writes the best
  scores, and a test that poked the score straight into memory seemed to
  agree. The second run's file shows add_point's writes; the poke had
  skipped the routine that compares.
- Wrong turn: the tentacles' start on an empty tentacle was first read as
  "only at seconds 8 and 9"; the skip runs the other way, and they wait
  at 8 and 9.
- The sample (seed 20261112) found 5 of 60 comments wrong in a detail.
  The click's count was one, and Popeye's listing has the same bytes and
  the same wrong count.
- 12 and 13 November, the Play tab. The port agreed with the chip at the
  first lockstep; one cost was wrong (skip_if_clear1), found by the
  lockstep's first differing run. Writing the port found four comments
  wrong, corrected. The page's computer player stalled at 199: the
  bonus holds the game for 5 s, longer than the look-ahead waited for a
  step, so every move into the boat looked fatal. It now counts a step
  that does not come as safe. A frame test hooked after the drawing also
  fired when nothing was drawn; it hooks the drawing's last instruction.
- 15 November 2026, at Zihe's request, history and photographs. Nintendo's
  "Iwata Asks" interview names Octopus's programmer and artist and
  explains the 12-hour clock; the listing agrees (add_hour, hours_ampm).
  The 1982 review's "24-hour clock" is wrong. Two photographs came from
  Wikimedia Commons under CC BY-SA; a patent drawing found there shows
  the two-screen case and was left out.
