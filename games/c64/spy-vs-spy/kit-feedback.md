# Spy Vs Spy — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "If the first sample is bad, audit the whole listing before the page is published": the first sample found 12 of 60 wrong, so a full audit ran before the page, and a second sample measured 2 of 60.
- `70-minisite`: "Sweep the whole input space, not a few plausible values": the scoring port was run against the game over 600,000 random events from scores near 0, below zero and near 9,999, which exercised the clumsy cap at 9,999 that the game's own play would rarely reach.
- `70-minisite`: "If the renderer lacks something the game does, extend it in `site/lib/c64.js` and in `frame.py test`": the game is NTSC-only, so NTSC went into the renderer and the frame test instead of the page.
- `60-verify`: "Start that one checker without asking, on a run that keeps to one agent": the contributor asked for one agent; the two checkers ran anyway, one at a time.

## What was changed in the kit

- `kit/scripts/symbols_export.py`: this run fixed `coverage.py --live` failing with `ModuleNotFoundError: ports`; the Classic Adventure run fixed the same in main first, and main's version was kept when main was merged into this branch.
- `site/lib/c64.js`: `renderFrame` draws NTSC frames (263 lines of 65 cycles, 247 picture lines from line 28, the sprite fetch two cycles later, and the frame run from the line VICE's NTSC frame ends on, `capture.frame_ended_on_line`, round to the same line). PAL output is unchanged; `frame.py test` passes on PAL and NTSC.
- `kit/c64/frame.py`: `compare` takes the picture's first line and the line count from the frame, so NTSC's last lines wrap; `test` reads the machine's standard and moves its line-290 band to the last lines on NTSC; the window after a mid-line change of mode widens by eight pixels for each cycle the capture was unsure of the beam (`phase_cycles_uncertain`), which NTSC captures are.
- `site/lib/sid.js`: an `ntsc` option for `host` and `mount` (and `createSID`, `createPlayer`) runs the driver once an NTSC frame at the NTSC clock; `engine()` exports `NTSC_CLOCK` and `NTSC_FRAME_CYCLES`.
- `kit/c64/test_sid_ntsc.js`: new test of that option: 59.83 driver frames a second on NTSC and 50.12 on PAL, and a held note sounding at its pitch on each clock.
- `kit/skills/c64/tool-vice-mcp/SKILL.md` ("Recording what ran") and the header of `kit/c64/codemap.py`: the memmap record is ended by a snapshot load or a stop through the MCP server, so a code map is recorded in one session from boot without `frames()`; its ROM and RAM columns follow the address, not the banking. Both said the record was always on and complete, and on this run a map made after a snapshot load looked complete and was not.
- `kit/c64/codemap.py`, merged with main's change from the Classic Adventure run, which records RAM execution only so the KERNAL's boot code stays out of the map: the memmap marks execution ROM or RAM by address, so on 9 October 2026 Spy vs Spy's code at `$A000`-`$BFFF`, run with BASIC banked out ($01 = `$35`), was all marked ROM execute and absent under that mask. `dump` now counts the ROM-marked instructions in the ranges the processor port has banked out and says so, and `dump --under-rom` keeps them; it is not the default because the KERNAL's interrupt handler, run during a game's start-up after the zap, is marked the same way (seen live: `$EA31` and `$FF48` were kept by a first version that did it always). `kit/c64/test_codemap.py` tests the banking rule; the VICE skill says when to use the option.
- `kit/lessons/2026-10-09-spy-vs-spy.md`: building a routine's missing inputs with the game's own code in the simulator, and timing a game's seconds in frames.

## Candidates

None.

## Maintainer asks

- **Make `frame.py test` pass after the emulator has been switched to NTSC and back.** On 9 October 2026, with VICE v3.13.2 set to NTSC (`MachineVideoStandard` 2) and back to PAL (1), `frame.py test` failed by one pixel on line 138, 16 pixels after the `$D011` write that turns bitmap mode on, on a clean checkout of `main` as well as on this branch; a freshly started emulator passed, and so did the NTSC run with the capture's uncertainty allowed for. Something the standard switch leaves behind (the VIC-II model, or a timing resource) differs from a fresh start. Suggest that `frame.py test` set the machine's model and standard explicitly before capturing, or say in its output which model it ran on, so a run that switches standards cannot take this for a renderer fault. It cost this run about half an hour, including a check against `main`.
- **Save the regenerator2000 project after each annotation session.** This run's tools were stopped by a restart of the session's worker, and regenerator2000, started on the snapshot, came back with none of the annotations: the project lived only in its memory. `symbols.json` held everything, and `symbols_import.py` rebuilt the project with one label renamed (`j_FCE2` came back as `KERNAL_RESET_VECTOR`), but a run that had not exported since its last session would have lost that work. Suggest that `symbols_export.py` also save the disassembler's project into `work/`, and that `tools.py r2000` start from that project when it exists, saying so.

## What cost the most time

A note in the VICE tool skill that a snapshot load or an MCP stop ends the memmap record would have saved the hour spent on a code map that looked complete and was not.

## Operating system and tools

Linux 6.18 x86_64 in a cloud container without a display (Ubuntu 24.04 base); VICE v3.13.2 (vice-mcp, the Linux GUI release under `xvfb-run`), regenerator2000 0.9.20, Python 3.13, Node 22.22.0, Chromium 141.0.7390.37 from the container's Playwright install for the page checks.
