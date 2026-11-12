# Resident story and loader stash

The snapshot `work/copied.vsf` stops at `$1000` immediately after the forced airshaft-success route copies RAM beneath I/O into lower memory. At that stop `$D000–$DBFF` matches `$1000–$1BFF` byte for byte and `$DC00–$DFFF` matches `$0400–$07FF` byte for byte. The source `$D000–$DFFF` is identical in all seven scene snapshots. The three gameplay-load write maps in `orientation.md` record no RAM writes to that range. The other parts exclude those captured bytes from their own coverage so the stash is counted here once.

The source’s other consumers, its origin at boot, and the ranges loaded over it in each scene remain open. The entry copied to `$1000–$1048` is described at `$D000` in the stash listing; the rest remains open.
