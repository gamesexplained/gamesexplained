## next · 2026-10-19 · Prospector Pete (Commodore 16) · air with Claude

- **For each search loop, find what ends it when nothing is found.**
  Prospector Pete's creatures look for an open way round them, adding
  one to the way's number each time round. The loop's exit tests the
  number before it is masked to 0-3, so it never ends, and a creature
  with all four ways shut keeps the game inside its interrupt for good.
  A player can box the first creature in with one stick on level 6,
  which a live run confirmed. Every loop that looks for a free slot, a
  way out or a match has a case where there is none: trace that case to
  its end.
- **Hold a widget that reruns the game's routines to a trace of the
  game.** The level builder and a frame of play, run on the kit's 6502
  from the listing, were compared with plus4emu frame by frame, the
  emulator's timer readings fed into the page's run. Two differences
  that looked right on the page came out: the C16's 16 KB of RAM repeats
  through the 64 KB, so a room check that runs off the end of the map at
  `$3FFF` reads the zero page, and in a level's first frame neither the
  main loop nor the interrupt's first line runs. Each made the page's
  game differ from the real one. Record the routine's inputs with
  the address of the instruction that reads each one, replay them, and
  compare memory, not pictures.
