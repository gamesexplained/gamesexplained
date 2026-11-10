# Popeye — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

- 9 November 2026. The run started from MAME's ROM set on the kit's
  machine, the first game on the Game & Watch platform. No web lookup:
  the contributor dismissed the question.
- A coverage run on the model (every mode, random and "smart" play) gave
  the executed map, the jumps taken and a cross-reference of every cell;
  199 of 1,761 instructions never ran, nearly all padding.
- The segments were mapped from MAME's SVG by rendering it with each
  segment's name at its centre, and the cells from draw_screen.
- Wrong turn: the bit-test helpers on pages $11-$13 were first read as
  "skip if set". `TM` skips when the bit is set, so `TM; RTNS; RTN`
  skips when it is clear. Everything built on them read backwards (the
  redraw flag looked like a "pass due" flag) until a trace of the main
  loop disagreed. All names and readings were redone.
- Wrong turn: the miss rule. Popeye standing still drew far fewer marks
  than splashes; a trace of lost_item showed the half-miss flag.
- Wrong turn: the step timing first measured flat (0.22 s at any delay):
  a catch reran set_difficulty and overwrote the forced delay, and the
  average was diluted by the game ending. Forcing the delay where it is
  copied and taking medians gave the 210-cycles-a-pass figure.
- Found while making the reference pictures: a game ended by Bluto's blow
  leaves Popeye in the sea for good.
- The sample (seed 20261109) found 8 of 60 comments wrong in a detail;
  all were confirmed and corrected with every comment sharing the
  belief. The checker's extra finding, wrong targets for TRS inside
  subroutines, led to the disassembler fix in the platform branch.
- 10 November 2026, the Play tab. The port charges each straight run of
  the program its length in cycles, so its clock is the chip's; the
  kit's new lockstep compares memory and cycles at each checkpoint. Two
  test deadlocks first: a held game key and a held test-pad K3 each keep
  the program in a loop that never passes the main loop, so the inputs,
  which change only at checkpoints, never let go; checkpoints at $00B4
  and $0500 fixed both. One port error the cycle count caught: a held
  press repeats in the alarm's setting too (the `ADX 9` at $03E9 skips
  the `RTN`), which the listing had missed; corrected there as well. The
  How it works page's drawing port had the bonus's blink the wrong way
  round, unnoticed because its test never blinked; fixed, and the test
  now includes the bonus.
