## next · 2026-11-01 · Mercenary (C64) · air with Claude

- **Follow the machine's pace view by view when the port has a cost model
  of its loop.** Mercenary moves the player a fixed step a pass, and a
  pass takes 4 to 13 PAL video frames, as long as its drawing does. A
  fixed K, the middle of those, would make a busy view faster than the
  C64 and an empty one slower. The Play tab's clock already counts each
  pass's cycles by the cost model it was fitted with, so Fast CPU reads,
  before each of the C64's passes, how many frames the C64 would take
  over the work the last loop did, and spreads that pass's steps over as
  many loops. On the C64's own clock the reading matched the frames the
  pass took in 296 of 304 passes walking and 243 of 306 flying. From the
  crash site, 20 s of walking ended 0.2 % from the C64's distance, 20 s of
  turning one pass's step apart, 10 s of level flight 0.55 % apart, and
  the panel's clock one frame apart.
- **Beat on the line the game waits for before it flips.** Mercenary's
  frame start waits for raster line 224 and then flips its buffers. A
  beat on line 224 of every PAL frame ends that wait at once, keeps every
  flip where the C64's falls against the raster interrupts, and needs no
  plug-in point for the wait. The kit's guide had given the game a 60 Hz
  beat of its own; a 60 Hz beat would have to skip the wait and would
  drift against the interrupts.
