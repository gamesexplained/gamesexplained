# Mayhem in Monsterland — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 9 October 2026: set-up on Windows through WSL2 (claude-opus-5-5)

The contributor is on Windows 11, where the emulator project publishes
only a headless build. The run used WSL2 with Ubuntu 26.04.1 instead,
whose WSLg display lets the GUI build open a window.

- The checkout on the Windows drive (`/mnt/e`) did not work: WSL mounted
  it without Linux metadata, every file showed as root's with mode 777,
  and `chmod` failed, which stopped `get-vice download` at its first
  `os.chmod`. The run moved to a fresh clone in the WSL file system
  (`~/gamesexplained`), with the same branch and repo-local identity.
- `wsl.exe` parses its command line again, so `$` variables inside
  `bash -c '...'` were lost. Scripts in a file, run as
  `wsl.exe -d Ubuntu -- bash <file>`, avoided it; from Git Bash,
  `MSYS_NO_PATHCONV=1` stops it rewriting `/mnt/...` paths.
- The v3.13.2 Linux release zip needs `libFLAC.so.12`; Ubuntu 26.04 ships
  only `libflac14` (`libFLAC.so.14`). The emulator was built from source
  instead (`get-vice build`), after the contributor installed the kit's
  apt list for the source build; that also gave cargo the C compiler it
  needs for regenerator2000. Rust and node went into `tools/`.
- `check-emulator`: 57 of 57. `frame.py test`: passed.

## 9 October 2026: orient

- The boot reaches a code-sheet check. Rather than ask for the sheet, the
  answer was read from memory: `$4594`-`$45A2` compares the typed digits
  with `$017B`+`[$44B6]` exclusive-ORed with `$45`.
- The first try at the engine's hand-over stopped on the KERNAL's store
  to `$0200` (loading `boot`), the second on the intro's own code (the
  intro copies part of itself to `$0300`-`$0BFF`). Reading the intro's
  last routine at `$5700` found the copy and `JMP $1800`.
- Twice the emulator fell to about 4 % of real time, using 7 % of a
  core, with "Sync is 1250 ms behind" filling the log; the second time a
  cold boot then hung at `LOADING`. Execute checkpoints armed during the
  intro looked at first like the cause (the intro sat on its frame-wait
  loop with zero hits), but a measurement after a restart ran at real
  time with and without a checkpoint. A restart of the emulator cured it
  each time; the cause was not found. The contributor noticed the slow
  window before the agent did.
- Setting the level index `$CF89` before the title does nothing; the
  new-game entry `$CBA5` resets it. Setting it after the `INC $CF89` at
  `$CBB0` loads any land, and index 5 loads the ending.

## 9 October 2026: the executed-address record

`kit/c64/codemap.py` could not record what ran. Any connection to VICE's
remote monitor made after a snapshot load or after MCP had paused the
machine left VICE writing its prompt into the closed socket ("Broken
pipe", thousands of lines in its log) and refusing later connections, so
`dump` read nothing. Sending the monitor's `x` before closing fixed it
only on a machine that had never been loaded or paused: after a load, `x`
was answered with a fresh prompt instead of leaving the monitor. The run
went on without a code map, on regenerator2000's own control-flow trace.

## 9 October 2026: coverage, first wave

The lead annotated the start-up, the interrupt plumbing, the raster
chain with its VSP scroll and the top of the play loop (`work/ann/core1.txt`),
then started four agents on the Opus model with `work/BRIEF.md`: three on
disjoint ranges of the engine in one shared disassembler, one on the
intro in its own.

## 9 October 2026: verification

- The first sample of 80 comments found 12 with a wrong detail. Four
  agents then audited every comment of the eight parts. The land files
  were the worst: 40 of the sentences the description script wrote were
  wrong in every land that used them, and 877 of 2,453 land comments
  changed when the script was fixed and run again.
- The second sample found the engine still poor (9 of 36), so two more
  agents audited the engine for the patterns the checker named; the
  colour-memory and screen cell comments, first written from direct
  operands only, were regenerated from every instruction that can reach
  each cell. The third sample found one sentence those generators shared
  reversed in 65 cells.
- The agents' reports and the lead's spot checks changed several facts
  first written from reports: the grace after the first touch, the
  monster kinds that always hurt, the coarse column's range, the ending's
  route back to the title, and the extra life a 100,000-point award would
  miss, for which no route in play was found.
- The renderer in `site/lib/c64.js` drew the VSP-scrolled frame one
  character to the left of VICE's picture (14,505 pixels differed); the
  maps agent found why, and the fix made it match to the pixel.
- VICE ran at 3-4 % of real time twice more; with sound off (a `vicerc`
  under `tools/vice-home/` with `Sound=0`) it stayed at full speed for
  the rest of the run.
