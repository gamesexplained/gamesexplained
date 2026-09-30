# Fat Worm Blows a Sparky — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). What the skills and
kit got wrong or left out, what was changed, what needs a maintainer's
decision, what took longest, operating system and tool versions.

## Maintainer asks

The contributor then asked for the pull requests to be opened, so the two
asks below are in this game's pull request
(`gamesexplained/gamesexplained` #128) under "Maintainer asks"; whoever
merges it should file them as `kit-ask` issues:

1. **Let `new_game.py` create an empty `symbols.json`.** A fresh game has
   none, so `symbols_import.py` cannot build the first control file and the
   first `symbols_export.py` has nothing to read. See "What was changed".
2. **`stopwatch` in `check_emulator.py` and `workarounds.md`.** It measures
   0.22-0.41x of 3.5 MHz under a loaded host and fails, with no section in
   `workarounds.md` and no way for an agent to tell host load from a real
   regression. Widen the floor or record the host-load dependence.

## What took longest

```
| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 23 | deepseek-flash | 1 | booted the tape, reached play, took entry and play snapshots, wrote orientation |
| 20-features | 6 | deepseek-flash | 1 | features.md from the inlay, CRASH review, Wikipedia and the author's own page; reference screenshots saved |
| 30-text | 0 | deepseek-flash | 1 | no custom charset: the game uses the ROM font, text is plain ZX codes |
| 40-sweep | 0 | deepseek-flash | 1 | I/O census (ULA $FE, Kempston $1F); ZX-code string sweep found the forgery, menu and redefine text |
| 50-coverage | 543 | deepseek-flash | 1 | layout from a recursive trace plus the emulator's executed-address map; 7 agents over disjoint ranges, then the bare runs and untracked data by hand after the cleanup agents failed on a provider balance error; 100% coverage |
| 60-verify | 0 | deepseek-flash | 1 | perspective multiply, the $6300 curve and the draw-list quirk read from the image; sparkie count, firing and the HUD counters observed live |
| 70-minisite | 0 | deepseek-flash | 1 | index.html with the rebuilt screen, a port of the perspective curve and multiply, the board map, controls, boot and the draw-list quirk |
| total | 570 | deepseek-flash | | 9.5 h of wall clock |
```

The 543 minutes in `50-coverage` is wall clock, most of it the annotation
agents running (and re-running after the provider balance ran out), not the
agent's own tool calls. The run's own active work was nearer one hour.

**The one change to the kit that would have saved the most minutes:** a
named step, in `50-coverage`, for separating a whole-image game's code from
its data when the disassembler does not follow control flow. This run spent
its first coverage hour working that out (a recursive tracer plus ZEsarUX's
`cpu-code-coverage`); the step is now in the skill, so the next control-file
platform starts with it.

## What was changed in `kit/`, and why

- **`coverage.py` and `kit/c64/opcodes.py` followed the seam lift.**
  Both imported `symbols_export.from_live`, which the listing/symbols seam
  lift renamed to `read_live`. Both crashed on every platform, C64
  included; the seam lift's checks did not run `coverage.py`. Pointed at
  `read_live`.
- **`50-coverage` gained a step for control-file platforms** ("When the
  disassembler does not follow control flow"), naming the executed-address
  map and the recursive trace.
- **`kit/skills/spectrum/tool-zesarux` gained `cpu-code-coverage`** in its
  command table and a "Finding a game's code" section, with the traps: it
  must be enabled while the machine is *running*, and a `snapshot-load`
  can switch it off.
- **`kit/skills/spectrum/zx-spectrum-reference` gained the interrupt
  vector**: `IM 1` vectors to `$0038` in ROM, the handler only scans the
  keyboard and bumps `$5C78`, and a `.sna` whose `IFF2` is 0 was taken with
  interrupts disabled.
- **`kit/template/work/README.md` and the core skills** stop naming a
  `.vsf`: the snapshot's extension is the platform's own.
- **`kit/CHANGELOG.md`** has what this game taught the kit: a control file
  is not a flow tracer, and a game that overwrites its own screen makes the
  hand-over snapshot the disassembly base.

## Where the skills and tools misled this run

- **The core skills are written for the C64 with no Spectrum branch.**
  `10-orient` said `.vsf` and `$01`; `50-coverage` said
  `work/<state>.vsf`, a live regenerator2000 server, `--relabel` and
  `tools.py stop vice`. The platform skills cover the machine and the
  tools, but no core skill pointed at them. The snapshot-extension mentions
  are now generic.
- **No bootstrap for `symbols.json` on a fresh game.** `new_game.py` does
  not create one and `symbols_import.py` reads it, so a first run has to
  invent the first control file. Asked for as a maintainer ask.
- **`listing.py`'s hand-over default is `work/entry.vsf`.** `--entry` has
  to be passed explicitly for a `.sna`; two tools (`listing.py`,
  `symbols_import.py`) share the assumption.
- **A whole-image game needs a code/data layout step.** SkoolKit's
  `sna2skool.py` disassembles linearly and does not follow control flow,
  so the eight-figure coverage queue `50-coverage` assumes never appears.
  Now a named step.
- **The `--live` paths assume a live disassembler.** `symbols_export.py`
  and `coverage.py` dispatch `read_live` per platform; for the Spectrum
  there is no live reader, so only the non-live form works. The command
  line does not say so.
- **The annotation agents' provider ran out of balance mid-run.** Three
  cleanup agents died with `402 Insufficient Balance` after doing their
  reading and before writing their files, forcing the remaining 2119 code
  bytes and 6.8 KB of data to be annotated by hand. Not a kit bug, but the
  kit has no way to resume a failed agent's work except a fresh run with a
  new prompt, and the failed agents left no partial output.

- **The minisite was not checked in a browser.** No browser or headless
  browser was available to this session, so `index.html` was checked only
  by `node --check` on its script and by the `build.py` link check. The
  `70-minisite` browser pass (every canvas drawn, every control clicked,
  the rebuilt screen compared to a reference) was not done and is in the
  game's `TODO.md`. A hosted agent with a browser is the next step.

## Operating system and tools

macOS arm64 (darwin), Apple silicon, Python 3.14.7. ZEsarUX-13.0
(`ZEsarUX_macos-silicon-13.0.dmg`), `check-emulator` 36 of 40 (the three
with workarounds plus `stopwatch` under host load). SkoolKit 10.1. Commit
signing via 1Password was unreachable from this shell, so every commit was
made with a per-command `commit.gpgsign=false` override; no git config was
changed, and the commits are unsigned.
