# Fist II: The Legend Continues — TODO

Tier: **Silver** (100 % coverage, 63,256 tracked bytes; facts, features,
the Overview, How it works and Discoveries tabs; copy `agent-draft`).

For Gold, a human pass over every tab, section by section.

Worth doing, found in the run and not done:

- A pose viewer: build each of the 73 poses from its nine images
  (`$B210`, `$1C0F`) and step through the 44 move scripts (`$AF46`).
- The music: port the driver at `$F400` to `sid.js`, filter on.
- The samples: play the ten samples (`$3DB8`).
- Live tests not run: area 5 without scroll 8; the ending scene from room
  `$7A`; setting `$0455` to 0 for a second joystick; combination 8's store
  into the hero's slot; readers of the head sprites at `$B746`.
- The solution: drive the legs the search found and the emulator has not
  run: scroll 3 (room 114, from the stairs of room 113), the crevice in
  room 79 (from room 43's ladder at 88, somersault over 18-24 with scroll
  6), scrolls 7 and 5 and the ending; then win the fights instead of
  switching them off. The route is on the Maps and solution tab;
  `solver/README.md` has the tools.
- Maps: draw each room's scenery from the three scenery sets (`$1556`,
  `$4A71`); the Maps and solution tab draws exits, walls, barriers and
  encounters only.
- symbols.json: `$0491` and `$0492` are the blink count and the scroll
  icon of `blink_icons` (`$2D57`); their comments still say "meaning not
  traced".
- The Training program: a separate load (`LOADIT`, the `TNK` files).
- The web sources could not be read in this run's environment.
