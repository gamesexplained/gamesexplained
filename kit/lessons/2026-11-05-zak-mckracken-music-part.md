## 0.0.311 · 2026-11-05 · Zak McKracken and the Alien Mindbenders (C64) · air with Claude

- **Code in a buffer is a part when the loader always puts it in the
  same place.** The game's music player is 6502 code inside a sound
  resource, loaded into the resource heap like a room or a script, so the
  run counted it as data fetched into a buffer and left its 1,078 bytes
  as a `coverage.virtual` row that nothing listed. The loader's code
  showed the place is fixed: while a flag is set it writes the resource
  at `$C300`, the top of the heap, whatever else the heap holds, and the
  opcode that loads it then drops it from the resource tables so the heap
  never moves it. As a load over the program, listed from a snapshot
  taken while a tune plays, it has a listing of its own, and the page's
  music player runs the listed bytes instead of a copy embedded in the
  page (`kit/skills/core/15-parts`).
