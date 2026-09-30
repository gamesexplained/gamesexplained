# Fat Worm Blows a Sparky — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). What the skills and
kit got wrong or left out, what was changed, what needs a maintainer's
decision, what took longest, operating system and tool versions.

## Maintainer asks

Filing issues needs a GitHub login this session did not have, so the asks
are in the pull request's description under "Maintainer asks".

## What took longest

<the table from `python3 kit/scripts/clock.py report`>

The one change to the kit that would have saved the most minutes:

## What was changed in `kit/`, and why

- `kit/scripts/coverage.py` and `kit/c64/opcodes.py` imported
  `symbols_export.from_live`, which the listing/symbols seam lift renamed to
  `read_live`. Both crashed on every platform, C64 included; the seam lift's
  checks did not run `coverage.py`. Fixed to `read_live`.

More edits below as the retrospective lands.

## Where the skills and tools misled this run

- **The core skills are written for the C64 with no Spectrum branch.**
  `10-orient` says `.vsf` and `$01`; `50-coverage` says
  `work/<state>.vsf`, a live regenerator2000 server, `--relabel`, and
  `tools.py stop vice`. For the Spectrum it is `.sna`, a SkoolKit control
  file with no server, and `tools.py --platform spectrum stop`. The platform
  skills cover the machine and the tools but no core skill points at them.
- **There is no bootstrap for `symbols.json` on a fresh game.**
  `symbols_import.py` rebuilds a disassembler project *from* `symbols.json`,
  and `new_game.py` does not create one. A first run has to invent the first
  control file by hand (here: a layout generator over a coverage map) and
  only then can `symbols_export.py --ctl` make `symbols.json`. The SkoolKit
  tool skill says "start from `symbols_import.py`", which cannot start
  anything.
- **`kit/template/work/README.md` says `.vsf`.** The rebuild line for the
  Spectrum is a `.sna`.
- **`listing.py`'s hand-over default is `work/entry.vsf`.** The
  `--entry` flag has to be passed explicitly for a `.sna`.
- **`cpu-code-coverage` is not documented in the tool skill.**
  It must be enabled while the machine is *running*; issuing it in cpu-step
  mode answers `Error. Can not enter cpu step mode`. A `snapshot-load`
  afterwards can switch it off, and `get` then answers `Error. It's not
  enabled`. The checks that compare two free-running counters
  (`workarounds.md`) mention it but the skill does not.
- **`stopwatch` failed on this host, not on the release.** Four runs of
  `check-emulator` gave 36 of 40: the recorded three plus `stopwatch`, which
  measured 0.22-0.41x of the machine's 3.5 MHz under a loaded host (its floor
  is 0.5x). `kit/spectrum/INSTALL.md` records 37 of 40 for this build; the
  difference is host load, and `stopwatch` has no `workarounds.md` section.
- **The ZX Spectrum reference does not state the interrupt vector.** For a
  48K machine it is fixed: `IM 1` vectors to `$0038` in ROM, and the ROM's
  handler only scans the keyboard and bumps `$5C78`. The reference says the
  game may poll `$5C78` but does not say where the vector is.
- **A whole-image game needs a code/data layout step that no skill names.**
  `50-coverage` assumes the disassembler's flow tracing has already minted
  the code blocks. SkoolKit's `sna2skool.py` disassembles linearly and does
  not follow control flow, so the layout here came from a hand-written
  recursive tracer plus ZEsarUX's executed-address map. A general
  "find the code without a flow-following disassembler" step would help the
  next Z80 or 6502 platform that uses a control-file surface.
