# Boulder Dash — agent history

How understanding developed. The reference files state what is true now.

- The image is a re-packaged one-file disk. The first boots showed the title and the demonstration but ignored the keys: joystick port 2 was tried first, then taps, before port 1 held for half a second worked.
- Code ran at `$5000`-`$8FFF`, not where the file loads: the copier at `$0828` moves it, so the first disassembly at the load address was wrong until the entry was found by running to `$8E69` and snapshotting.
- The handler table at `$5F68` was found by following the dispatch in `update_pass`; handlers not reached by any call were left undefined until their addresses were seeded from the table.
- Several early comments were wrong in a detail (an animation mask's bit labels, the SID note table taken for an unused table) and were rewritten.
- The animation frame tables were first described as strips moving two pixel rows a phase. The code reads them at 16 times the phase number, so each phase holds 16 bytes (left character, then right). The comments and the Graphics page were corrected.
- The cave recipe came from `build_cave_cell`, `cave_random_step` and `build_cave_from_description`. A first version that drew the rows from 0 failed; rows 1 to 21 matched the emulator's map for cave A level 1 in all but 33 cells.
