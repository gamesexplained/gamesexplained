## 0.0.302 · 2026-11-03 · Laser Squad (ZX Spectrum) · Aaron Bell

- **Weigh a pace fit's stretches by their length when most passes are
  short.** Laser Squad's passes are mostly a poll of a menu or a step of
  the cursor, a few hundred T-states each, and a few are the computer's
  turns, millions long. Fitted with every stretch weighed the same, the
  long ones decided each routine's price and half the passes of a
  two-player game ran more than 6 % off the game's. Weighing each
  stretch by W / (its T-states + W), with W 2,000, fits the short ones by
  their own error: on the page the two-player game then took 0.3 % less
  than the game and half its passes were within 3.1 %, and a game
  against the computer 0.5 % more, half its passes within 2.0 %.
- **Start a widget's routine from a state the game reaches.** The How it
  works page's blast ran the port of the game's explosion, held to the
  game in lockstep, on the scenario's map as the tape loads it. Its
  readout said a bush became a unit and a square for placing units
  became an ammunition clip. Two things the game does before play were
  missing: it clears the squares for placing, whose codes have no
  terrain record (the bytes after the table belong to the next one), and
  it builds the table of units from the map, which the blast reads; left
  at zero, the table put all twenty units at row 0, column 0 when the
  blast put the units back on the map. Doing both the game's way first
  gave grass, walls and trees. A port that is exact proves nothing about
  the memory it is handed.
- **Decode a dictionary with the game's own print routine.** The
  listing's sample found a word of the engine's dictionary read as the
  letters ED where its bytes are two colour codes round an arrow, and
  seven more words like it. A dictionary of words can carry control
  codes among its letters; a decoder that maps bytes to letters reads
  them as text and every comment built on it repeats the error.
- **A random routine that walks memory reads what the page leaves out.**
  Laser Squad's dice add the byte at a pointer that moves through all
  64 KB, the code, the stack and the ROM included. A Play page that
  carries none of the code has to answer those reads too: it gives them
  noise, and the tests hand the port the game's own bytes, so the
  lockstep still compares every byte.
