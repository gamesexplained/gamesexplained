# Clowns — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "Draw a random sample of about 60": the checker found 9 of 60 comments wrong, among them a speed table read as 1, 1, 2 where it is 1, 2, 1, which `facts.md` had repeated.
- `30-text`: "First rule out an offset": the search on letter differences found every string in plain PETSCII after the calls that print them, where the screen-code sweep had found none.
- `50-coverage`: "Inline parameters: the reason a flow disassembler stalls": the five bad opcodes the first trace stopped at were the strings after `JSR $E0F5`, and skipping them let the trace through.
- `tool-regen2000`: "Where the game banks the KERNAL out and keeps its own code or data at one of those addresses, that name is wrong": the export named two bytes of the score printer's table `KERNAL_CHROUT` and `KERNAL_LOAD`, and they got names of their own.
- `50-coverage`: "Know how far a description reaches": the last 27 bytes of the tune table were outside the count behind an unnamed symbol's 64-byte reach, and naming it brought them in.

## What was changed in the kit

- `kit/c64/frame.py`: `Machine.vic()` reads the video chip through the `io` bank when `vice_vicii_get_state` disagrees with it about the raster line, and `capture` records an Ultimax cartridge's top 4 KB as the frame's `ultimax`. Why: with the cartridge attached the state call returned the RAM's power-on pattern and line 256, and every capture failed with "the samples disagree about the beam's position".
- `site/lib/c64.js`: `renderFrame` reads `$3000`-`$3FFF` of the video chip's bank from `F.ultimax` when the frame has one. Why: the game's font and see-saw sprites are fetched from the cartridge; with this, the drawing matched the emulator's picture in all 104,448 pixels.
- `kit/c64/test_frame_ultimax.py`: tests both, with no emulator: the raster fallback on a fake machine, and a glyph that only `F.ultimax` holds.
- `kit/INSTALL.md`, "Browser checks": Windows' own Edge, run headless from Windows against the site served from WSL, as a page check that installs nothing. Why: WSL had no browser, and this was how this run saw its page.
- `kit/lessons/2026-10-12-clowns.md`: this run's entry, with what was measured about Ultimax cartridges: the processor's and the video chip's view, the listing from the `.crt`, the state call's answer and the code map.
- `kit/c64/lockstep.js`: a `{ cp }` yielded twice running now counts as two arrivals; only a place named by `{ cycles, at }` and then again as a checkpoint is one. Why: Clowns has no interrupts and one clock routine that every loop calls, so its port yields the same checkpoint (`$F717`) once a tick, and the old rule swallowed every other tick: the lockstep reported the port a tick ahead on its second pass. `kit/c64/test_lockstep.js` passes unchanged, and `games/c64/clowns/test_play.js` (60,000 ticks, identical) exercises the new case.

## Candidates

- **A section on Ultimax cartridges in `c64-reference`.** The measurements are in `kit/lessons/2026-10-12-clowns.md`: what the processor and the video chip see, the listing built from the `.crt`, `vice_vicii_get_state` answering with RAM, and the code map. On 12 October 2026 no other game folder held an Ultimax cartridge. The next run on one (GAME low, EXROM high in the `.crt` header) that finds they hold could move them into the skill, naming both games.
- **A mechanic tested by poking its state can miss the path that fires it.** Emptying a balloon row by writing its flags gave no bonus and looked like a broken claim; the bonus is checked only inside the routine that runs after a balloon is popped, and the row was refilled silently. Placing the clown on the last balloon made the game pop it, and the bonus came. `60-verify`'s "Prove reachability with inputs, not pokes" is about the other direction (a poke proving too much); this is a poke proving too little. The next run that meets it in another game could add the case there.

## Maintainer asks

The contributor opens the pull request, so these are written in full for the repository to file when it merges.

- **Give the emulator tools a paddle input.** vice-mcp v3.13.2 has no tool for the paddles, so a paddle game cannot be steered: this run stopped the game after it read `$D419` and set the value in A, at about ten ticks a second, and wrote an autopilot on top of that to record a code map. A `vice_paddle_set` tool upstream (barryw/vice-mcp), or a helper in `kit/c64/vice.py` that does what this run did, would make it routine; `tool-vice-mcp` would then document it beside the joystick.
- **Report `vice_vicii_get_state` returning RAM with an Ultimax cartridge attached.** With an 8 KB Ultimax cartridge in VICE x64sc 3.13.2 (vice-mcp own build, commit 1e83aab134), the call gave `FF FF 00 00 ...` for every register and raster line 256 throughout, while `vice_memory_read` of `$D000` in the `io` bank was right. `frame.py` now works round it; other callers of the state (`frame.py dma`, `test`) would still be misled. An issue upstream at barryw/vice-mcp, with the run's case, is the fix.
- **Let a game branch pass `check_docs.py` before the retrospective.** Every commit of this run before step 80 failed `check_docs.py` on `kit-feedback.md`'s template placeholder alone, so "run the three checks before every commit" printed FAILED at every step, and a real failure would have been easy to miss among them. A placeholder could be allowed until the game's `tier` is set, or the template could start with "None." lines the retrospective replaces.

## What cost the most time

A section in `c64-reference` on Ultimax cartridges would have saved the most: the frame recorder's failure and its cause, the video chip reading the ROM, and where the listing comes from all had to be found from nothing.

## Operating system and tools

Windows 11 Pro with WSL2, Ubuntu 26.04.1; the emulator is a source build of vice-mcp v3.13.2 (commit 1e83aab134), which passed all 57 checks on 11 October 2026; regenerator2000 0.9.20; node 24.21.0 and Python 3.14.4 in WSL. `wsl.exe` re-parses its command line, so `$` and parentheses in an inline command reached bash mangled; scripts in a file, run with `bash <file>`, were reliable.
