## 0.0.266 · 2026-10-29 · Into the Eagle's Nest (C64) · air with Claude

- **A stretch the costs never measured freezes the page in any wait along
  it.** The Play tab's port passed its lockstep for 18 minutes of play,
  and the published page hung the first time a reader pressed SPACE. The
  lockstep's player used only the stick, so the pause's loop at `$489E`,
  which waits for the interrupt to see the key let go, was never costed.
  On the page each of its turns moved the clock by nothing, the interrupt
  never came, and after 400,000 turns the page gave up. The castle
  destroyed had the same wait at `$4A77`, behind an end the test forced
  at random and never once chose. The test now pauses in play, forces
  the four ends in turn, and drives the page alone with SPACE, RESTORE
  and every end, failing on any stretch it meets with no cost; a bare
  yield on an unmeasured stretch costs the page a raster line, so a path
  no test reached runs slow instead of stopping.
