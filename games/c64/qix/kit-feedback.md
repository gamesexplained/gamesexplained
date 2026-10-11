# Qix — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "Measure the listing before calling it done": the checker found 6 of 45 hand-written comments wrong, four of them edge-walk routines named a quarter turn off; all were fixed and their families audited.
- `50-coverage`: "Inline parameters: the reason a flow disassembler stalls": the game prints all its text through a routine that reads its arguments after the JSR; typing them as data stopped the tracer decoding instruction text into code at $4000.
- `tool-regen2000`: "The flow tracer can wander into text": made me check the small code blocks the tracer reached from nothing, and undo them.
- `10-orient`: "Save the hand-over too": comparing the hand-over with play showed that play overwrites the title and the music, which led to analysing a title snapshot that holds the whole program.
- `tool-vice-mcp`: "Protected originals (`.g64`) need the drive's own processor": the crack's loader runs drive code from the BAM sector, and the vicerc settings there made the drive's processor run it.

## What was changed in the kit

- `kit/skills/c64/tool-vice-mcp/SKILL.md`, "Recording what ran": a game that loads through the KERNAL during play leaves KERNAL addresses in an `--under-rom` code map; the lesson is `kit/lessons/2026-10-10-qix.md`.

## Candidates

- **Direction names off by a quarter turn.** Four edge walks in Qix (`$A930`-`$A9A5`) and four perimeter walks (`$B460`-`$B4B4`) were named by the first neighbour each tests rather than the step it takes; nothing showed it until the independent sample. A line in `50-coverage` saying "name a walk by its straight-on step" would have caught it, but no other game here is known to have made the same mistake.
- **Replay a port with the game's own random numbers.** The Qix moves by random draws from a generator that mixes CIA timers, SID noise and the raster line, so a pass-by-pass trace cannot be matched by a port drawing its own numbers. A stopping checkpoint on the generator's return (`$A5F2`), armed only while the routine under test runs, recorded each value with the range asked for; the port took them in order and asserted the same range at each draw. 1,000 steps then compared exactly, and the assertion would have caught a draw taken out of order. `70-minisite`'s port-testing paragraph could say this for any mechanic driven by a random generator; no other game here is known to have needed it.
- **A crack's loader timed for one video standard.** The NEC loader in this image stalls on PAL and loads on NTSC; the symptom is a loader waiting on `$DD00` for ever. It shows itself (a hang), so it is recorded here and in `agent-history.md` only.

## Maintainer asks

- **Make `check_docs.py` compare a fork's branch with the commit it was cut from.** On this fork `origin/main` was at kit 0.0.115 while the branch was cut from a main at 0.0.124, so `check_docs.py` reported that the branch adds lines to `kit/skills/core/60-verify`, `70-minisite` and `80-retro` (upstream's own changes) and failed. Running it with `GITHUB_BASE_REF=main` (the local main) gave the right answer. Suggest `skill_edits.base_ref` prefer the upstream remote's main, or the local `main`, when `origin` is a fork that is behind it.
- **Teach `codemap.py dump --under-rom` to leave out the KERNAL's own code.** A game that banks the KERNAL in for a load records KERNAL execution at the same addresses as its RAM code under the ROM; Qix's map held 307 such addresses. The dump could compare each recorded instruction with the ROM's bytes and the RAM's, or take a list of traced RAM entries, and drop what only the ROM explains.
- **A music player run on a 6502 core inside the page.** The Qix page plays its tunes with the game's own player bytes (`$E000`-`$FF3F`, 8,000 bytes including the tunes) run on a small 6502 interpreter inside `createDriver`, checked frame by frame against `kit/c64/cpu6502.js` (14,159 frames, all eleven tunes, identical). `70-minisite` asks for a port; please confirm that running the original player this way is acceptable, or say so in the skill.

## What cost the most time

Annotating 21 KB of code by one agent took most of the run; the single kit change that would have saved the most is the code-map caution above, since the polluted map sent the first tracing passes into the KERNAL's addresses and the music data.

## Operating system and tools

Linux x86_64, Ubuntu 24.04.5 cloud container, four cores, no display. vice-mcp v3.13.2 release (`v3.13.2-linux-x86_64-gui.zip`): 57 of 57 checks, as the table in `kit/c64/INSTALL.md` already records; the runtime libraries were installed with apt as that file lists. regenerator2000 0.9.20 compiled from crates.io with the container's Rust. Page checked in Chromium 1194 (Playwright 1.56.1, preinstalled). The emulator was switched to NTSC for the whole run, and the drive's processor enabled in `tools/vice-home/config/vice/vicerc`.
