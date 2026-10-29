# Barbarian — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "A widget that runs a mechanic is a claim too": `test_rules.js` runs the page's port of `hit_test` against the game's routine for every blow, pose and distance, and its 77 landings from outside `hit_records` were the stray-record bug, then confirmed in VICE.
- `70-minisite`: "Leave the tab out only when every level is the same screen": the four arenas got a Maps tab drawn by the game's own `swap_backdrop`, and writing its copy found that a two-player game changes arena when the clock runs out.
- `60-verify`: "Comments a program wrote, a decoder describing every record of a format from templates": the sample drew 20 of the 455 template comments and 40 of the 346 hand ones, and gave the weighted rate.
- `60-verify`: "For each wrong comment, whether the sample is bad or not, say what it believed": each of the six wrong comments was searched for on both sides and corrected wherever side 2 carried it.
- `70-minisite`: "Write a link by the part's own page": every section of the three pages got `data-part`, and the Commodore 128 bytes, which the coverage leaves out, `data-part=""`.

## What was changed in the kit

- `kit/skills/core/15-parts`, step 8: a comment carried to a part whose code is another's at other addresses is checked against the second part's bytes wherever it names a value, colour, count or routine, until #552 gives a script. The other game: `games/c64/last-ninja-remix`. Lesson: `kit/lessons/2026-10-29-barbarian.md`.
- `kit/lessons/2026-10-29-barbarian.md`: a state reached by a poke shows what the code does from there, not the way a player gets there.

## Candidates

- **A live test that poked its way to a state.** Setting the skill level to 7 in the first bout to reach side 2's ending showed the game swapping to the hall of arches first, and the draft said the ending changes arena. Played bout by bout, the eighth bout is already in the hall and the swap never runs. The copy pass caught it by reading the code beside the test. `60-verify` would say: when a live test reaches a state by poking a variable, check what the normal path leaves in every variable the claimed code tests before writing the claim. No other game's notes show the same slip yet.
- **A name beside the wrong address on a page.** A short script (`work/check_names.py`) compared every `<code>name</code> (<code>$addr</code>)` pair on the pages with the part's symbol map and caught two wrong addresses in the copy (`do_command`, `goblin_drags`) that the build's link check passes, since both addresses start a record. Run over every game on 29 October 2026 it flagged 18 pairs in 7 games once an address inside the named routine was allowed, most of them deliberate (a routine and its `_impl`, two tables written as a pair, a branch inside a routine past a local label), so a build warning would be noisy as it stands.

## Maintainer asks

- #552: a script that carries comments to a relocated copy of a part's code (this run's case added as a comment).

## What cost the most time

The Maps tab's arenas and the fighter viewer both needed the game's own set-up routines run first on the kit's 6502 (`bout_state` cleared, the mirror and mask tables built, the clean strip saved), found by trial; the single change that would have saved the most is the script #552 asks for, since the side 2 port by matching code took the longest of the annotation and its one silent slip came from it.

Linux x86_64 (Ubuntu 24.04.5, cloud container), VICE v3.13.2, regenerator2000 0.9.20, node 22.22.0. The disassembler re-minted automatic symbols inside data each time a table was typed, as `tool-regen2000` says retracing can; the run deleted them with a small script in `work/scripts/clear_auto.py` before each export.
