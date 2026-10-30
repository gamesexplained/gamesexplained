# Winter Games — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "do not stop at the poke: prove a player could get there": the Bobsled crash that slides over the line was first shown by forcing a crash at stretch 166 with a poke; I played it again with the stick alone (a crash at stretch 168 recorded 22.20, one at 164 recorded 99.99), and the Discoveries tab shows that run.
- `60-verify`: "search the listing for every comment that says the same, and correct them together": two of the sample's five wrong comments held beliefs that `check_record` (menu) and `ready_set_go` (Speed Skating) held too, and they were corrected with them.
- `15-parts`: "Compare the parts' snapshots byte for byte": it showed the loader at `$0900`-`$0EFF` the same under every load, which became the resident part, and the menu still in place under Speed Skating.

## What was changed in the kit

- `kit/scripts/parts.py`, `kit/scripts/symbols_export.py`, `kit/scripts/test_parts.py`: a `part.json` can list `"names"` rows, `[first, last, why]`, addresses outside the part's ranges whose labels and comments are the part's own; the export and the seed keep them, they count in no ledger, and an address in them takes no name from a part beneath. Why: every event here keeps its own variables in zero page `$10`-`$8F`, where the loader keeps others, and the events' listings named their counters after the loader's (`ldr_disk_side` 33 times in Figure Skating's). Closes #638, The Fourth Protocol's ask for the same thing.
- `kit/skills/core/15-parts`: the Terms table has a row for `names` rows. The same lent names are in `games/c64/darkman`: level 3's code at `$0BD5` writes `sta serial_byte`, the resident loader's name for that address.
- `kit/scripts/parts.py` (`carried`), `kit/scripts/symbols_export.py`, `kit/scripts/test_parts.py`: the export leaves out a label or comment in a part's names rows that a part beneath has there word for word, and lists what it left out. Why: Bobsled's disassembler session was seeded with the loader's comments before Bobsled had its names rows, and once the rows were set the export kept fifteen of the loader's comments as Bobsled's own.
- `kit/c64/codemap.py`, `kit/c64/test_codemap.py`: `zap` on a stopped machine now says that the machine ran for the command and that what it ran then is not in the record. Why: the opening ceremony's code map was zapped just after its entry snapshot was loaded, and lost the start-up that ran in that moment: 3,306 bytes recorded where a zap in the title, played through the load, recorded 3,638.
- `kit/skills/core/60-verify`: a wrong comment's belief is searched for in every part's listing, since a routine carried between parts carries its wrong comments. Here `start_sound`'s wrong limit was in four events' listings and `script_step`'s missing label in three; `games/c64/last-ninja-remix` carried six parts' comments from its first level the same way (#552).
- `kit/lessons/2026-10-30-winter-games.md`: the run's lessons.

## Candidates

None.

## Maintainer asks

- #643: Stop the label "start" at $0000 naming the CPU port in 17 C64 listings.
- #552: this run's case added as a comment: the events' shared sound engine, carried to four other events, carried two wrong comments with it.

## What cost the most time

A way for a load to keep names for its own zero-page variables, which this branch adds as `names` rows, would have saved naming six events' variables a second time and rebuilding every listing after they took the loader's names.

## Operating system and tools

Linux x86_64, Ubuntu 24.04.5, in a cloud container. VICE v3.14.0 (the vice-mcp Linux release, `v3.14.0-linux-x86_64-gui.zip`) and regenerator2000 0.9.20, installed by the kit under `tools/` with no changes to the install notes; #636 had already recorded v3.14.0 passing every check on Linux. Playwright's own Chromium took the page screenshots (`kit/scripts/shoot.js`).
