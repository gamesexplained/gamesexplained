## 0.0.53 · 30 September 2026 · Fist II: The Legend Continues · unorig with Claude

**A frame capture names every handler in an interrupt chain.** Fist II's
raster handlers each write the next one's address into the vector, so a
read of the vector finds one of them, and tracing from the entry and the
vectors reached 12 KB of a 61 KB load and no sound code at all. One
frame recorded with `frame.py` listed five handlers and their lines in
its writes to `$FFFE`; tracing from them found the music driver under
the KERNAL. `10-orient` now says to take the handlers from a frame.

**A music driver can read the sound chip back.** Fist II's driver sweeps
a filter from voice 3's envelope (`$D41C`), so a port that only writes
registers drifts from the game. `site/lib/sid.js` now passes a driver
voice 3's envelope and waveform each frame (`readback`), and a port's
test feeds the original and the port the same values.
