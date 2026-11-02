## next · 2026-11-02 · Castle Master (C64) · air with Claude

- **Keep the clock's beat when the loop waits for no screen line.**
  Mercenary's Fast CPU beats on raster line 224, 50.12 times a second,
  because its frame start waits for that line before it flips. Castle
  Master's main loop never waits for a line: the raster serves only its
  interrupt, which plays the music's frame. Its time is CIA 1's timer A,
  59.996 ticks a second, so a beat on the timer runs one loop a tick and
  a 60 Hz display shows each loop's frame once. It keeps its 60 Hz beat.
- **At a fixed pace, list the state, in most paces.** Mercenary's listing
  of the bytes that change only on a pace's first loop has no first loop
  to go by at Castle Master's fixed K. Ported as "at least four changes,
  never two within K ticks, half of them exactly K apart", over all of
  memory but the stack, the view buffer and the bitmap, it flagged 41
  bytes in 12 areas at 1× and 2×, and none was a step on screen. Asking
  for every gap to be a whole number of paces left 9, all at 2×: the
  renderers' scratch ($06, $0C, $0D, $12, $13, $1055, $12E5) as the
  touching script, run once a pace, left it, and two flags of the view
  ($1069, $45) that changed at the same share of the angle on each turn,
  since at 2× a pace turns three whole steps and the share comes back
  every pace. Asking for changes in a third of the paces left none, but
  a control broke it: a walk given whole on every Kth step went unseen,
  because the loop that shows the lightning reads no keys and takes no
  step, which put gaps of 11 and 12 ticks among the 10s. A job run once
  a pace, counted from its own last run, slips a tick the same way.
  Allowing one gap in four to be off then let in $B6, the row of a
  projected edge, which moved every 19 or 20 ticks while running along a
  wall at 1×. Scoped to what a saved game keeps, $2406-$246F and the
  objects' flags in the database at $9D00-$BF8F, the listing finds
  nothing in 109 moves held for 3 s in six areas at 1× and 2×, and finds
  the broken walk at $2407 and $240B, the player's position.
- **Fast CPU answers a key within a tick or two.** Measured in node on the
  page's code, 12 presses each, with refreshes at 50, 60 and 144 Hz, in
  three areas. With Fast CPU off, at the C64's pace, the view first
  moved on average 0.84 to 1.65 s after a turn key went down and stopped
  0.66 to 1.0 s after it came up; a walk, in two areas, 0.44 to 0.59 s
  and 0.20 to 0.32 s. At 1× the view first moved on average 6 to 12 ms
  after the key went down and stopped 3 to 12 ms after it came up, at
  every refresh rate, and never more than 32 ms: each refresh runs the
  loop the clock owes and shows that loop's frame.
