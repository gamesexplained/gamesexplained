## next · 2026-10-22 · Master of Magic (C64) · air with Claude

- **Give a handler the collisions the game's read.** A play interrupt that
  copies `$D01E` or `$D01F` into memory each frame reads what the beam
  found where the game's sprites were drawn. The port's model of the
  collisions, run when the replay runs rather than where the game's
  handler ran, can find something else, and the copy differs a few
  hundred passes in. `kit/c64/lockstep.js` now replays those reads as it
  replays the interrupt flags.
- **Put a checkpoint before a register the main program writes after an
  interrupt has.** The lockstep replays an interrupt at the port's next
  yield, and a chip's register keeps the last write, so in a stretch
  where an interrupt writes a register and the main program then writes
  it again (a title that ends with a SEI and sets the next screen's
  modes), the replay lands last and the register differs. A checkpoint
  before the main program's write puts the two in order.
- **Split an interrupt's cost by the state that changes it.** A Play tab
  that charges each interrupt the average the fit found for its kind
  drifts when that kind does different work in different stretches. A
  music driver that returns at once after its tune ends is the common
  case: averaged over the theme and the silence after a death, it is
  cheap while the theme plays, and the page runs fast. Name the state in
  the interrupt's kind (here the driver's stopped bit), and hold the
  page's pace over a whole demonstration against the machine's, which a
  check of single stretches does not show.
