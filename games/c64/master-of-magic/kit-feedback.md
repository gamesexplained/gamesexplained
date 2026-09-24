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
  (VIC data under the KERNAL while the ROM is in), and `CBM80` in a game
  that is not a cartridge.

## What I would change but did not (a maintainer's call)

## What took longest

<the table from `python3 kit/scripts/clock.py report`>

The one change to the kit that would have saved the most minutes:
