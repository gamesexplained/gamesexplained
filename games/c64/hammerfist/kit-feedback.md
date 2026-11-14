# Hammerfist — kit feedback

## Skill text that changed what I did

- `60-verify`: "Trace its producer before assigning ownership": retained first-load startup code becomes sprite cache and a zero-page save; the replacement payload ranges were kept tied to native unpacker writes.
- `6502`: "a disassembler that knows only the documented set shows them as data": the music request byte is the operand of immediate NOP `$80`; the shared decoder was extended and regression-tested instead of splitting it into data and BRK.
- `70-minisite`: "Start each case where the game starts it": the sound buttons initialize effects mode and call the original allocator before the first tick, and their tests use that same request contract.
- `60-verify`: "and correct them together": the sampled horizontal-displacement register error was corrected in all four numbered loads.

## What was changed in the kit

- `kit/c64/tools.py`: the clone-scoped stop pattern follows an emulator installation symlink to its executable; an external shared build additionally requires this clone's MCP port. This lets the launcher stop the authorized headless build.
- `kit/c64/test_tool_isolation.py`: regression cases protect other clones and ports while exercising the resolved headless executable path.
- `kit/cpu/m6502.py`: immediate undocumented NOP `$80` consumes its operand as an instruction.
- `kit/scripts/test_listing_undocumented.py`: a writable music-request operand stays attached to its NOP, including carry analysis. The existing `6502` passage already identifies undocumented instructions shown as data, so no new skill rule is needed.
- `games/c64/mayhem-in-monsterland/parts/intro/listing.json`: rebuilt from its own committed bytes after the opcode correction changes the decoding at `$0226`; no new game analysis or snapshot is introduced.

## Candidates

None. Existing skill rules covered the silent errors encountered.

## Maintainer asks

None. The observable backend failures are recorded below and in agent-history.md; this run does not establish a new upstream fix.

## What cost the most time

A headless backend with reliable snapshot restore and checkpoint stepping would have saved the most time: this VICE build occasionally exited with SIGSEGV during frame advance after a restore or store watch, while targeted single-instruction stepping completed the required branch tests.

## Host and tools

The contributor retained the installed local VICE v 3.14.0 headless build with dummy audio instead of the offered v 3.14.1 GUI release. No global package manager, shell profile, or system setting was changed. Repeated restores/free-run checks sometimes lost the process; the run restarted only through `kit/scripts/tools.py`. An interrupted store could report the immediate IRQ PC; the IRQ stack return address established the writer. The per-step instruction traces resolved the behavioral questions.

The graphics viewer exposed a misreading of the two-segment sprite cache and of the actor subdirectory. The corrected tests start actors in sprite slot 1, as `$8391` initializes them; slot 0 has a different cache allocation for projectiles. Every component/player lower image and its intermediate cache are now compared with original execution. These mistakes fall under the existing full-graphics and caller-precondition instructions, so they add no new rule.
