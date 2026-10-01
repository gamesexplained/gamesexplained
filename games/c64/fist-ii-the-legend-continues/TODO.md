# Fist II: The Legend Continues — TODO

Tier: **Silver** (100 % coverage, 63,256 tracked bytes; facts, features,
the Overview, How it works and Discoveries tabs; copy `agent-draft`).

For Gold, a human pass over every tab, section by section.

Worth doing, found in the run and not done:

- A Maps / levels tab: draw every screen from the three scenery sets
  (`$1556`, `$4A71`, the exit lists at `$4AEC`) and link them by their exits.
- A pose viewer: build each of the 73 poses from its nine images
  (`$B210`, `$1C0F`) and step through the 44 move scripts (`$AF46`).
- The music: port the driver at `$F400` to `sid.js`, filter on.
- The samples: play the ten samples (`$3DB8`).
- Live tests not run: area 5 without scroll 8; the ending scene from room
  `$7A`; setting `$0455` to 0 for a second joystick; combination 8's store
  into the hero's slot; readers of the head sprites at `$B746`.
- A solution: facts.md, "Towards a solution", has the exit types, the
  somersault over holes and 7-column drops, and five scrolls (1, 8, 2, 4,
  6) driven and delivered in the emulator with fights switched off. Not
  done: scroll 3 (room 114, from the stairs of room 113), and the region
  holding scrolls 5 and 7 and the ending, whose only entrance by the exit
  tables is the middle of room 79; the chute from room 77 drops the hero
  past it. Read how a fall sets the arrival column, and what
  `$0491`/`$0492` start. The solver and the driver are in `work/solver/`
  (not committed).
- The Training program: a separate load (`LOADIT`, the `TNK` files).
- The web sources could not be read in this run's environment.
