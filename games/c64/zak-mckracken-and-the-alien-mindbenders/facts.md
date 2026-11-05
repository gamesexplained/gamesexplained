# Zak McKracken and the Alien Mindbenders — verified technical facts

What is true of the game as a whole: how its parts follow one another, and what they share.
Each part's own facts are in `parts/<id>/facts.md`.

## The parts

- **main**, the program (`parts/main/facts.md`): `AA`, loaded once at
  start-up, with everything it copies away, and the resource heap at
  `$77D5`-`$C7FF` that rooms, scripts, costumes and sounds are read into
  during play. Its facts hold the game's build, memory map, timing,
  controls, graphics, mechanics, sound engine, the listing's error rate
  and the live tests.
- **music**, the music's own program (`parts/music/facts.md`): sound 1,
  1,078 bytes of 6502 code and tables, which a script loads over the top
  five pages of the heap, always to `$C300`-`$C735`, before a tune plays.
  It lies over main, which owns every other address.
- The SCUMM scripts, 116,884 bytes on the two disk sides, are programs
  for main's interpreter, read into the heap as they are needed. The kit
  cannot list them yet, so they are a `coverage.virtual` row in main's
  `part.json`.
