# Parachute — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

- 19 November 2026. The run started from MAME's ROM set on the kit's
  machine, the third game on the Game & Watch platform, with the web
  lookup allowed. No page of the ROM matches Octopus's or Popeye's
  whole; pages $09 and $0A (the hours and the sounds) do but for four
  instructions, and the helpers' bodies on pages $11-$13 are mostly
  Popeye's. The work tools were copied from Octopus's and changed.
- The segments were mapped by flipping one bit of each cell before the
  drawing on a copy of the machine and comparing what it lit
  (`work/tools/segmap.js`); the lanes, the tree and the water by
  logging every chain of swap_c calls (`work/tools/chains.js`).
- Wrong turn: features.md was written after the code was read, not
  before, against 20-features; the sources added nothing the code had
  not shown except the tree's name and the German and Italian titles.
- Wrong turn: skip_if_mode_lt2 ($0439) was first named the other way
  round from a guess at its body, which turned the jump's chance in a
  game and in the clock into each other. A prediction from the cells
  checked on the chip disagreed in 1,015 of 3,355 steps; the helper,
  run with the mode at each value, skips for 0 and 1. With the name
  corrected the prediction agreed in every case.
- Wrong turn: the first coverage run's Game A and Game B phases played
  no game: the game from the phase before was over, and a game key in
  that state did not start a new one in time. Each phase now powers on
  first. The run also first assumed a TRS operand of $xx goes to
  $04xx; it is a step in the program counter's order, and the targets
  were taken from the jumps recorded live instead.
- 19 November 2026, the sample. A Fable 5.2 checker marked 15 of 60
  comments (seed 20261119) wrong in a detail, and every finding held:
  the keys' sum chose the mode one step lower than the comment said,
  release_check reads time_s10, not game_flags (LB $B is $3A), the clock
  never runs the step routine, read_pad repeats in the alarm's setting
  too, mode_setup shows the helicopter out of a game, not in one, and
  the water's chain has twelve places. The notes repeated three of them;
  all were corrected.
- 19 November 2026, the Play tab. The port was written instruction by
  instruction on the game's cells, with Octopus's chip primitives. The
  first lockstep failed at 495 s of Game A on repeat_at: the port read the
  divider after counting DTA's two cycles, and the model executes an
  instruction before its cycles. DTA, TG, IDIV and ATR now act before
  their tick. Then the rare states: presses of 0.3 s in the clock fell
  between checkpoints while the chip slept, and the alarm's ring was
  seen at power on, where every segment is lit; the presses there are
  held 1.2 s and the ring is looked for in the clock only. An R3 key
  held at power on needed the lockstep to hold buttons before its first
  checkpoint (kit/gnw/lockstep.js, `initial`).
- 19 November 2026, the reader review (Fable 5.2,
  work/reports/reader-review.md). It found Octopus's subtitle left on
  the Graphics tab, the late catch's window unstated, the tree's release
  rules half explained and the demo's tree missing from How it works,
  "in the air" undefined, waits given only in passes, test results on
  the pages, the keys' values missing, and six findings off the leads
  list. All fixed but two: Discoveries stays prose and links to the
  figures on How it works, and Play gets no test-pad buttons, since the
  pads are not on the unit's case.
- 20 November 2026, the play test hung. Its third session, an R3 key
  held at power on, ran ten hours without output: the port's power on
  waited for the pad to be let go in a loop that never yielded, so the
  lockstep never reached a checkpoint where the test could let it go.
  The wait is now its own step, yielding at $03D3, a fifth checkpoint.
  The list of states then missed both buttons at move_boat ($0306):
  read_pad drops a press of both ($0388), so $0306 runs only when the
  second button comes within a few instructions of the first, between
  two checkpoints; the test holds the dropped press instead. The whole
  test runs in 2 seconds.
