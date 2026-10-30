## next · 2026-10-30 · Speedball (C64) · air with Claude

- **A bug in a table that two routines share is tested by running both
  routines together, not by reading the table.** The tackle check reads
  each pair's cell through a list 13 bytes before the right one. Reading
  the tables, the run took the measuring routine to write through the
  right list, and counted 34 of the 45 pairs as tested on another pair's
  distance; a widget worked out from the same tables agreed. The
  measuring routine writes through the early list as well, so 32 pairs
  work and 13 are never seen to touch. The page's test, which placed
  each pair touching and ran both routines on the kit's simulator, found
  it. When a claim says that one routine misreads what another writes,
  run the writer and the reader together on cases that must succeed, and
  build the widget on that run.
