# Master of Magic — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). What the skills and
kit got wrong or left out, what was changed, what needs a maintainer's
decision, what took longest, operating system and tool versions.

## Operating system and tools: the first run on Linux

- Ubuntu 24.04.4, x86_64, four cores, 15 GB, in a cloud container with
  no display and outbound HTTPS through a filtering proxy. Python 3.11.15,
  gcc 13.3, cargo 1.94.1.
- The vice-mcp release could not be downloaded: the environment's GitHub
  access refused the releases page of a repository the session had not
  been given. `git clone` of the public source worked, so the emulator
  was built from source: first `air/vice-mcp` branch `fixed`, then
  `barryw/vice-mcp` main with pull requests #20 and #24 merged locally,
  and finally v3.13.0 (`main` at `00b275f2`) once those two were merged
  upstream. The build needed apt packages the container lacked:
  `byacc dos2unix flex xa65 libgtk-3-dev libglew-dev libmicrohttpd-dev
  libcurl4-openssl-dev libasound2-dev libpulse-dev libevdev-dev libcap-dev`
  (compilers, autoconf, automake, bison, pkg-config and libpng were there).
- The GUI build needs a display. The container has none, so the launcher
  now runs it under `xvfb-run` when neither `DISPLAY` nor
  `WAYLAND_DISPLAY` is set. Rendering is software (Mesa llvmpipe); the
  emulator takes about 80 % of a core.
- `check-emulator`: 54 of 56 on every build, then 56 of 56 once two races
  in the check script were fixed (below). `verify-footprint`: clean;
  everything the emulator wrote was under `tools/vice-home/` (snapshots,
  PulseAudio's runtime directory, dconf, the Mesa shader cache).
- regenerator2000 0.9.20 from `cargo install`, unchanged.
- The game image could not be fetched from the site the contributor named
  either: the environment's network policy refused the host, and once the
  contributor allowed it, the site's server sent an incomplete certificate
  chain (no Let's Encrypt intermediate). The contributor attached the
  image to the session instead.

## What was changed in the kit, and why

- `kit/c64/tools.py`: runs the GUI build under `xvfb-run` when there is
  no display; `stop` kills only the emulator (anchored pattern) so that
  `xvfb-run` removes its X server; `status` names a local branch by its
  public base and each merged pull request fetched as
  `<remote>/pr/<n>`, instead of "on no public remote".
- `kit/c64/build_vice.py`, reached as `tools.py build-vice <src>`: the
  upstream CI's GTK3 build, into `<src>/install`, linked with `use-vice`;
  it names missing system packages and stops rather than installing them.
- `kit/c64/check_emulator.py`: `stopwatch` is checked against emulated
  time (passes of the frame-locked loop, read on a stopped machine) rather
  than the wall clock; `stop_after_passes` arms its checkpoint on a
  stopped machine. Both lost races on a host where an MCP call takes
  16 ms; neither was an emulator fault.
- `kit/c64/INSTALL.md` and `kit/INSTALL.md`: the Linux section (packages,
  the virtual display, speed, footprint) and the state of the upstream
  fixes.
- `kit/scripts/coverage.py`: `--range <lo> <hi>`, the figure and queue for
  one agent's range; the coverage skill says so.
- `kit/skills/c64/tool-vice-mcp/SKILL.md`: a matrix key stays down across
  snapshot loads, so release in a `finally`; measure in the machine's time
  after a busy checkpoint; arm a stopping checkpoint on a stopped machine.
- `kit/skills/c64/tool-regen2000/SKILL.md`: the tracer's two false trails:
  text decoded as `JSR $2020`, and the RAM under ROM routines the game
  calls.
- `kit/skills/c64/c64-reference/SKILL.md`: the RAM the CPU cannot see
  (VIC data under the KERNAL while the ROM is in); `CBM80` in a game that
  is not a cartridge, and a paragraph on testing the reset as well as
  RESTORE (a reset leaves the 6510's data direction register at 0, and
  a restart that does not set it runs with BASIC over `$A000`); the
  KERNAL's key variables `$C5`, `$028D` and `$0291` and the PAL flag
  `$02A6`, checked in kernal-901227-03's decode table and `$FF5E`.
- `kit/skills/core/50-coverage/SKILL.md`: how far a description reaches
  now names the ledger's fixed edges (`$0100` ... `$E000`), which cut a
  routine in two, and says that renaming a symbol the disassembler made
  keeps its 64-byte cap. Two agents lost time to each.
- `kit/skills/core/60-verify/SKILL.md`: "What a test lets through": list
  every value a classifying compare accepts and look for the unintended
  ones in the data. That is how the pool edge that offers OPEN was found.
- `kit/skills/c64/tool-vice-mcp/SKILL.md`: choose a menu entry by reading
  its text from screen memory, not by counting slots; record a
  pass-by-pass trace of the game's variables as the test for a port.
- `kit/skills/core/70-minisite/SKILL.md`: a widget that runs a mechanic
  is tested against the game (a trace, or the original code in a 6502
  simulator) before it goes on the page, and the trace stays in `work/`.

## What I would change but did not (a maintainer's call)

- **The ledger's fixed edges cut code.** A routine that runs across
  `$1000` owns only its first part unless a second label is put on the
  edge, in the middle of an instruction stream. The edges make sense for
  data; for a code block they could be skipped. Documented, not changed.
- **A disassembler session loaded from a snapshot cannot be saved** as a
  project (`r2000_save_project` needs a project path). The symbol export
  is the canonical result, but crash recovery depends on replaying ten
  agents' logs in an order that respects overlapping edits. A "save as"
  in regenerator2000, or the kit loading the snapshot through a project
  file from the start, would remove that risk.
- **The commits are authored by the agent.** This environment refused a
  commit authored as the contributor, so the branch's commits carry the
  agent's default identity and the site's contributor list (from git
  authors, humans only) will not show the contributor until they are
  re-authored or the contributor adds a commit of their own.
- **The KERNAL's random bytes.** The combat widget needed the game's
  random numbers; they come from the KERNAL ROM, which the site must not
  embed. The page carries the two 256-number cycles the game uses, as
  derived values. A maintainer may want a rule for derived ROM data.

## What took longest

<the table from `python3 kit/scripts/clock.py report`>

The one change to the kit that would have saved the most minutes:
