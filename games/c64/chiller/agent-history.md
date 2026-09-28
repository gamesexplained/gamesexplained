# Chiller — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## Silver, 28 September 2026 (claude-opus-5-5)

- **50-coverage.** The tracer's snapshot showed one screen. Running the
  game in the kit's simulator from each of the ten records (poking the
  start level at `$C661`) reached the code and data the others use; the
  seeded disassembly and 30-odd annotation batches took the ledger to
  100 %. `listing.py` then reported 57 loaded stretches the ledger does
  not count; each was described or excluded. Wrong turn: the stores at
  `$E000` were first described as holding a screen as loaded; starting on
  a way-back screen showed garbage, and the comment was corrected.
- **60-verify.** Every claim that could be poked was: crosses, mushroom,
  toadstool, jump, switching. The keys looked dead until the host-key
  path was tried. Playing through (crosses poked beside the boy, the
  energy bar refilled) was the only way to see the way-back screens as
  the game draws them. A ladder claim written from memory was checked
  against the level settings and withdrawn: up is off on every screen.
  The Bronze note that the bar drains with no input was an enemy on him.
- **70-minisite.** The screen builder reuses `setup_screen`'s steps and
  the kit's frame renderer; against the emulator's screenshots 98.6 to
  99.7 % of pixels match, the rest being enemies and the bar. The music
  port matched the driver in `cpu6502.js` on the first full run once the
  60 Hz timer was separated from the player's PAL frame.

