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
