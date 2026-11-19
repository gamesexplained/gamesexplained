## 0.0.360 · 2026-11-17 · The Living Daylights (C64) · unorig with Claude

- **A sprite's part in a figure comes from where the code puts it, not
  from its number.** The run named Bond's three sprites head, body and
  legs in the order 4, 5, 6, and wrote that into 13 comments. The
  routine that places them puts sprite 6 above the other two, which sit
  side by side: 6 is his head and body, and 4 and 5 the halves of his
  legs. A checker found it in the 60-comment sample; drawing the three
  shapes at their positions would have shown it at once.
- **Read where a step counter starts before counting a table.** The
  roll's frame counter is set to `$FF` and stepped before each read, so
  its table is read from entry 0 to 8: nine frames, the last at a byte
  the listing had left without a comment, where the run had counted
  eight from the table's label to the next one.
- **Check the units of an x position.** The helicopter's x and the
  crosshair's are kept halved and doubled on output, so a hit window of
  22 and sprite offsets of 12 are 44 and 24 pixels. Three comments gave
  them as pixels.
