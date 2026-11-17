## next · 2026-11-17 · Ikari Warriors (C64) · unorig with Claude

- **Sectors that match nothing may be encoded, not unused.** The media
  scan matched none of the 147 sectors on tracks 8 to 14 of Elite's
  disk against the listing, and they held no repeated filler, so they
  looked like data the game never loads. Each one, combined byte by byte
  with `$C9` by exclusive or, is a run of the listing's `$4000`-`$CFFF`,
  254 bytes a sector in the loader's own order. Trying the 256 single-byte
  keys on a sector's first 40 bytes against the snapshot took seconds
  and turned seven tracks from `unused` into `part`. The other sectors
  were found plain, but in an interleave, so no run of sectors matched
  one run of memory either: matching sector by sector, not run by run,
  found them.
- **The game's own level drawing, run on the kit's 6502, can be the
  map.** A Python copy of the routine that draws the road a row at a
  time matched 49 rows the game had drawn in VICE; the game's own
  routine, called once a row on `kit/cpu/cpu6502.js` from the listing's
  bytes, matched the copy on all 1,891 rows, and became the Maps page
  with no port to keep in step. Setting the few variables the routine
  reads (here the window row) and calling the game's own reset first was
  all it needed.
- **A range excluded as run-time state can hide a table the game
  loads.** The music driver's state, `$E55C`-`$E603`, was left out of the
  listing as cleared by the routine that starts a tune. Three bytes in
  it, 0, 7 and 14, are the offsets of the three voices' registers, loaded
  with the game and never written; without them the page's player, which
  runs the driver on the listing's bytes, played every voice on voice
  one, and its test passed because it compared the driver with itself.
  The reader review heard it. Before excluding a range, look for
  non-zero bytes in it at the hand-over and for code that reads them
  before writing; a player's test should check that every voice sounds.
