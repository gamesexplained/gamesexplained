# Licence To Kill — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `50-coverage`: "So is a value read off the snapshot": searching for writes to the crash test's compare operand showed it holds the throttle, not the constant 2 the snapshot showed, and that the throttle is the helicopter's height.
- `70-minisite`: "Start with the leads": the leads list put the unused tune, the reset screen and the dead code on the Discoveries tab.
- `60-verify`: "When the code and a measurement disagree": the energy rule written from `start_timer` alone (47 on every level) failed against the play snapshot's value of 3, and the writes at `$2871` and `$2AEA` that set 6 on levels 1 and 3 were found.

## What was changed in the kit

- `kit/c64/snapshot.py` and `kit/c64/check_emulator.py`: this run found that snapshots written by VICE 4.0 put the C64MEM module at another offset, so the fixed offset 209 read the wrong bytes. It fixed both by walking the modules, and upstream main fixed them the same way meanwhile, so the branch takes main's version.
- `kit/lessons/2026-11-16-licence-to-kill.md`: two lessons, on parallel tables copied in a loop and on a threshold kept in a patched operand.

## Candidates

- **Parallel type tables labelled one field out.** The annotation named eight of the enemy type tables at `$94F3`-`$9769` by their order in memory against the order of the slot tables, and every label was a field away from the slot table the spawn loop copies it into. Nothing failed; the 60-comment sample found two of them, and reading the copy loop (`LDA type,Y / STA slot,X`) fixed all eight. The rule would say: label a table that a loop copies into another by the destination it is copied to, read from the loop, never by its place in a run of tables.

## Maintainer asks

- **Have listing.py name the routines it reports as keeping auto names, or drop the note for operand symbols.** The note "462 routine(s) in the Source tab's index keep the disassembler's own name (a_0998, a_09EA, a_0A17, ...)" counts the `a_` symbols the disassembler makes for self-modified operands, which are not routines and already carry comments; on this game every one named is an operand. It cost a check of a dozen of them to be sure nothing was missed. Suggest leaving out symbols whose address is the operand byte of an instruction (kit/scripts/listing.py, the index note).

## What cost the most time

A note in `kit/skills/c64/tool-vice-mcp` that VICE 4.0 moved the snapshot's memory module, and that `snapshot.py` must find it by its module name, would have saved the time spent finding why the first snapshots read the wrong bytes.
