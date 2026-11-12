# Restored story engine

The snapshot `work/entry.vsf` stops at `$1000` just after the forced airshaft-success route copied `$D000–$DBFF` into `$1000–$1BFF`. At that stop the two ranges match byte for byte. The same transition copied `$DC00–$DFFF` into `$0400–$07FF`; that lower range holds the loader and is not included in this engine part. The route is recorded in `../../orientation.md`.

Each of the second-story, third-story and ending snapshots differs from this copied engine in exactly 88 positions: `$1394`, `$145E`, `$1903`, `$1905–$1906`, `$19A3`, `$1A1B–$1A1C`, and all 80 bytes of the two text buffers at `$1A67–$1AB6`. `$1394` is the high byte of a self-modified store; `$1A1B/$1A1C` are the text-reader pointer operand. The later parts count the shared engine here once and exclude their restored copies from their own coverage.

The entry snapshot's `$1000–$1BFF` matches the stash source at `$D000–$DBFF` byte for byte. Existing descriptions of the copied routines and data were therefore carried to their executing addresses. The listing marks the display routines' I/O context separately from the routines that select RAM under I/O. The final copied bytes at `$1B80–$1BFF` remain to be classified.

The isolated byte at `$11DD` is `$12`, immediately after an unconditional jump to `$11F3`. The bytes at `$1A37–$1A66` form 24 little-endian addresses from `$0400` to `$0798`, 40 bytes apart. A consumer of that table has not been established.
