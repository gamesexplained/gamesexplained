## 0.0.173 · 2026-10-16 · Space Rogue (C64) · air with Claude

- **A frame count read inside a stretch must include the stretch's own
  time.** Space Rogue's main loop adds to a lag the frames its drawing
  took, read from the interrupt's count at the drawing's end, and skips
  the drawing on the passes after a slow one. A page that runs the
  interrupts only between stretches hands that read a count without the
  drawing in it, never skips, and runs a busy view at half the game's
  passes, while every pass is still costed right. Before a read through
  `irqByte`, move the page's clock on by what the stretch has cost so
  far, then compare passes in the same seconds against the game from
  moments of each kind of play.
- **A game keeps state in its own instructions.** A page that carries
  the data and leaves the program out must keep the instruction bytes
  the port reads: operands the code rewrites, stores it patches, hooks
  it checks are empty. Run the page's machine on the stripped data
  beside the whole data from power-on and from saved moments, and treat
  any difference as a byte to keep; a search over the stripped bytes
  names each one.
