# References

Everything here is shown or loaded by the game's pages.

- `title.png` and `play.png`: VICE captures from this run's snapshots of
  the BCS disk, `work/title.vsf` (the title) and `work/play.vsf` (The
  Bathroom, at the start of a game). How it works shows them.
- `hades.png`: a VICE capture from the live test of the fall into the
  Entrance to Hades (`work/scripts/hades_test.py`), on the seventh of the
  nine falls. Discoveries shows it.
- `bed.png`: a VICE capture from the live test in the Master Bedroom
  with `$0400` set (`work/scripts/bed_test2.py`). Discoveries shows it.
- `jsw-rooms.js`: the ports of the game's room builder, guardians,
  arrows, rope and conveyors that every page draws rooms with;
  `test_rooms.js` in the game folder holds them against the game's code.
- `jsw-port.js` and `jsw-play.js`: the Play tab's port of the whole
  game, and the clock and chips it runs on, with the sprite collisions
  of the site's model (`site/lib/collide.js`). `test_play.js` holds the port against the
  game's code in lockstep and measures the costs `jsw-play.js` keeps;
  `test_pace.js` holds the page's pace against the game's, and
  `test_screen.js` draws the title as the page does and holds the
  ticker to a pixel a frame.
