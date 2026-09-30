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
- A solution: facts.md, "Towards a solution", has the scroll locations,
  the gates and a candidate order; it stops at the hole in room 103
  (column 52), which no tested move crossed. The solver and the
  emulator driver are in `work/solver/` (not committed).
- The Training program: a separate load (`LOADIT`, the `TNK` files).
- The web sources could not be read in this run's environment.
