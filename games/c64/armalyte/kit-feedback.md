# Armalyte — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "If the first sample is bad, audit the whole listing before the page is published": the first check found 13 of 80 wrong, so before writing more of the page I followed every reader of the byte that gates the half-rate routines and rewrote 16 engine comments and all 640 path comments, then drew a second sample from what was left.
- `60-verify`: "audit them by template, not one by one": the 8 wrong decoder comments were all the path template's, so the fix went into the decoder's sentence and its step lengths, and the corrected comments were regenerated from the bytes for all eight levels.
- `70-minisite`: "A widget that runs a mechanic is a claim too": porting the generator routine for the energy widget meant reading its compare again, which showed the ticks were one frame longer than every note said (61, not 60); the port was then tested against the routine on the simulator over 1,810 starting states.
- `10-orient`: "Run its file's unpacker in the simulator over memory filled with two different values": when filling memory in VICE before a level load hung, I ran each level file's own unpacker in `kit/c64/cpu6502.js` with two fills instead, which gave every range each load writes.
- `60-verify`: "Before saying that nothing reads or writes an address, search with every opcode": `opcodes.py --refs` on `$68` listed every reader of the frame flag, and the audit started from that list rather than from the routines I remembered.

## What was changed in the kit

- `kit/START.md`: the usage-limit question now says that a run kept to one agent still starts `60-verify`'s one checker without asking. Aaron Bell (`air`), a maintainer, asked for this during the run: the answer about agents is meant to stop fan-outs, and by `60-verify` the run should be unattended. This run stopped on a question there instead.
- `kit/skills/core/60-verify`: "Measure the listing" says the same, for the same reason. "Time it" now says a rate read from the code needs a count of calls against frames, or every branch between the loop's top and the call; that a counter compared with `CMP`/`BCS` against a table ticks every value + 1 frames; and that a measurement "about" the prediction is a failed test. The same misreading of a counter's rate, from the instruction and not the branches before it, is in `games/c64/doctor-who-and-the-mines-of-terror`'s agent-history.md. Lesson: `kit/lessons/2026-10-07-armalyte.md`.
- `kit/skills/core/30-text`: step 3 says to read the punctuation from the glyphs as well as the letters. `games/c64/jupiter-lander`'s agent-history.md found its punctuation away from the order its letters followed. Lesson: `kit/lessons/2026-10-07-armalyte.md`.
- `kit/scripts/build.py`: code spans are set aside while bold, italic and links are marked up, so a file name in backticks stays text. `orientation.md`'s `armalyte_s1[thalamus_1988](pal)(!).g64` had become a link to "pal" on the About tab, and `build.py` reported it as broken. `kit/scripts/test_build_code_spans.py` tests it, and fails without the fix.

## Candidates

None.

## Maintainer asks

- #240: START.md's identity step should show an identity the environment already sets and ask for a yes

The commits' other half: this cloud session exported `GIT_AUTHOR_EMAIL`
and `GIT_COMMITTER_EMAIL`, which override `git config`, so the
`git config` lines in `START.md` did nothing. Every commit passes the
address in the environment.

The page's generator port is tested by `work/tests/test_generators.js`,
which needs level 1's snapshot and so stays in the gitignored `work/`;
#238 has the case.

## Snags that showed themselves

- **A load continued from a snapshot hangs.** A snapshot saved partway
  through the boot without the drive's state cannot continue a load:
  the game's fast loader runs code in the 1541's memory, and the
  restored drive has none. Reattaching the disk does not help. Run the
  boot and each load in one session from a hard reset, or run the
  file's unpacker in the simulator.
- **A long simulated run stops taking interrupts.** The game resets the
  stack from inside its interrupt when a life is lost, so a simulator
  interrupt that runs the handler to its RTI never returns. Take the
  interrupt as the processor does (push, set I, jump through the
  vector) and let the main run go on.
- **Two labels swapped by name** need a temporary name first; the
  disassembler refuses a duplicate.
- The session's `vice` MCP server was not connected; `kit/c64/vice.py`
  drove VICE throughout, under Xvfb.

## What cost the most time

A line in `60-verify`'s "Time it" telling me to follow every rate back
through each branch to the main loop's top would have saved the audit
of 656 comments and the second sample; it is there now, with the lesson
in `kit/lessons/2026-10-07-armalyte.md`.

## Operating system and tools

Linux 6.18 x86_64 (Ubuntu 24.04 cloud container, four cores, no
display). VICE v3.13.2 (`v3.13.2-linux-x86_64-gui.zip`, vice-mcp) under
Xvfb, `check-emulator` 57 of 57; regenerator2000 0.9.20 built from
source; Python 3.13.16; node 22.22.0; Chromium 141.0.7390.37 from
Playwright 1.56.1 for the page checks. Nothing the install notes do not
already say.
