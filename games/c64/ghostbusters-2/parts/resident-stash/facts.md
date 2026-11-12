# Resident story and loader stash

The snapshot `work/copied.vsf` stops at `$1000` immediately after the forced airshaft-success route copies RAM beneath I/O into lower memory. At that stop `$D000–$DBFF` matches `$1000–$1BFF` byte for byte and `$DC00–$DFFF` matches `$0400–$07FF` byte for byte. The source `$D000–$DFFF` is identical in the opening-story, airshaft, Broadway and museum snapshots. See the route in the game’s `orientation.md`.

The source’s other consumers, its origin at boot, and the ranges loaded over it in each scene remain open. The listing records the 4,096 bytes as undescribed.
