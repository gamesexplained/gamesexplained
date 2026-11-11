# Boulder Dash — agent history

How understanding developed. The reference files state what is true now.

- The image is a re-packaged one-file disk. The first boots showed the title and the demonstration but ignored the keys: joystick port 2 was tried first, then taps, before port 1 held for half a second worked.
- Code ran at `$5000`-`$8FFF`, not where the file loads: the copier at `$0828` moves it, so the first disassembly at the load address was wrong until the entry was found by running to `$8E69` and snapshotting.
- The handler table at `$5F68` was found by following the dispatch in `update_pass`; handlers not reached by any call were left undefined until their addresses were seeded from the table.
- Several early comments were wrong in a detail (an animation mask's bit labels, the SID note table taken for an unused table) and were rewritten.
- The animation frame tables were first described as strips moving two pixel rows a phase. The code reads them at 16 times the phase number, so each phase holds 16 bytes (left character, then right). The comments and the Graphics page were corrected.
- The cave recipe came from `build_cave_cell`, `cave_random_step` and `build_cave_from_description`. A first version that drew the rows from 0 failed; rows 1 to 21 matched the emulator's map for cave A level 1 in all but 33 cells.

## The maintainer's check (10 November 2026)

- The run was on a model the kit has not proven, so a maintainer's sample was drawn with a new seed, 30830, and given to a checker on `claude-opus-5-5` that wrote none of the listing. It found 22 of 60 comments wrong, every one confirmed against the code. More than 2 wrong means an audit, so four fresh checkers audited the 358 comments in four address ranges, and a fifth audited `facts.md`, `features.md` and the pages.
- The audit corrected 152 comments and renamed several labels. The kinds of error, by count: the length of a labelled run of data (a label owns at most 64 bytes, and comments described the first 64 or the first non-zero bytes); the title and play tables of the VIC split swapped; object codes taken for screen codes; caller lists missing one; and "no reader" for memory the VIC chip reads.
- The "frame blocks with no reader" at `$68E8` are the First Star Software logo, a multicolour bitmap in the bottom six rows of the first title. Drawn from the listing's bytes, it matched a screenshot of the First Star PAL disk in VICE. That run also showed that fire does nothing while the logo is up, as the code says, which may be why the first boots seemed to ignore the keys.
- The 23 bytes spelling `:SK3A` and `:SK4` are the tail of the assembler's symbol table, and so are the 1,024 bytes after them to `$8FFF`. The program's code ends at `$8F3C`; `$7666`-`$766A` and `$8F3D`-`$8F4D`, decoded as instructions, are data, and their blocks were retyped.
- Object `$3A` is the amoeba: the handler table sends it to `amoeba_handler`.
- Twelve short runs, 26 bytes in all, are missing from the listing (gap records at `$5140`, `$5240`, `$5340`, `$54CE`, `$6328`, `$6430`, `$6530`, `$6630`, `$6928`, `$6C28`, `$6D68` and `$6DE8`), and the ledger does not count them. The snapshot is the contributor's, so they could not be filled here. On the First Star disks the same bytes are all 0 except the five at `$54CE`, which are `$FF`.
