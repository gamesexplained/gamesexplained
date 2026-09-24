# Tools for the Commodore 64

Read `kit/INSTALL.md` first: the footprint principle and the launcher are
the same for every platform. This file is what the C64 needs on top. Only
the capabilities matter; the named tools are the ones we recommend because
they are known to work.

| Need | Capability | Recommended tool |
|---|---|---|
| Emulator with an agent interface | attach a disk, autostart, pause, read and write memory, breakpoints, screenshots, save and load snapshots | VICE with the `vice-mcp` server (https://github.com/barryw/vice-mcp) |
| Disassembler with an agent interface | load a snapshot, disassemble, label, comment, type data, export a symbol map | regenerator2000 (on crates.io) |

## Where the emulator stands, by phase

The phases are `kit/EMULATOR.md`. `python3 kit/scripts/tools.py
check-emulator` measures them on whatever build answers, with a test
program of its own (`kit/c64/check_emulator.py`: no game needed, under a
minute). It names every check it makes, and
`kit/skills/c64/tool-vice-mcp/workarounds.md` says what to do about each
one that fails. Run it once after installing, and again after any new
build or release.

**Which build: the newest, always.** The kit pins no version of vice-mcp.
`tools.py get-vice` finds the newest release and says what this machine
can have of it ("Get the emulator", below), and `check-emulator` then
measures whatever was installed. The measurements, each dated:

| Build | Machine | Measured | Checks passed |
|---|---|---|---|
| v3.11.0 release, GUI | macOS arm64 | 22 September 2026 | 28 of 56 |
| v3.11.0 with pull requests #6, #7, #11, #14 to #24 merged, from source | macOS arm64 | 22 September 2026 | 56 of 56 |
| v3.13.0, from source | Linux x86_64, no display | 24 September 2026 | 56 of 56, three runs |
| v3.13.1, from source (`get-vice build`) | macOS arm64 | 24 September 2026 | 56 of 56 |
| v3.13.1 release, `v3.13.1-linux-x86_64-gui.zip` | Linux x86_64, no display | 24 September 2026 | 56, 55 and 53 of 56, three runs |
| v3.13.1, from source (`get-vice build`) | Linux x86_64, no display | 24 September 2026 | 53, 54, 54 and 56 of 56, four runs |

Add a row whenever a build is measured on a machine not listed. The two
Linux rows of v3.13.1 failed the same checks, whichever way the build was
made: `determinism-running-save` and `determinism-restart`, and once
`step-instruction`, more of them while a compile was loading the host;
the same snapshot replayed three times in a row came back identical. So
treat those two checks as intermittent on that machine, save snapshots
from a stopped machine, and compare runs by what the game wrote
(`workarounds.md`). What the
v3.11.0 release fails, by phase, is below. A contributor who declines to
build is offered the newest release with a build for their machine, and
on 24 September 2026 that was v3.11.0 for a Mac. On an emulator that has
already been driven, `ping-running` passes as well.

| Phase | Passes | Fails |
|---|---|---|
| 1 static inspection | all: reads of any size with a bank argument; registers and chip state; snapshot RAM at a fixed offset, which `listing.py` reads | |
| 2 state management | save from a running or a stopped machine; warp on and off | a load does not stop where a checkpoint armed before it says; a load kills every checkpoint when the snapshot was saved with none (`checkpoints-survive-load`); determinism cannot be shown at a stop, because the stop is late |
| 3 live measurement | non-stopping exec checkpoints count, and agree with the program's own counter; the cycle stopwatch | `vice_watch_add` ignores `load`, `store` and `stop` and makes a stopping write watchpoint, which opens the monitor window and freezes the machine |
| 4 frame stepping | keys by matrix and by host name reach the program | stops land up to a frame late; run after a stop, `run_until` and step do not do what they say; no frame advance; joystick port numbers are off by one and input lands up to a frame late |
| transport | a call during a stop answers; 1600 unpaced calls | `vice_ping` has reported `paused` on a fresh, running machine |

The failures are small changes inside the server's own code, and the
project asks for contributions: pull requests #6, #7, #11 and #14 to #24
on `barryw/vice-mcp` fix them, and all of them are merged, from v3.13.0
on. Fixing them upstream is the path, so that contributors keep
installing a release rather than compiling. The v3.11.0 figures were
measured before `stopwatch` and `determinism-running-save` were changed
to stop racing the host (see `check_emulator.py`); those two rows are not
re-measured on it.

### Using a build of your own

A contributor who already has a vice-mcp build that does better, their
own or one with fixes merged ahead of a release, can point the kit at it
instead of downloading:

```
python3 kit/scripts/tools.py use-vice <install dir>    # the folder with bin/x64sc in it
python3 kit/scripts/tools.py use-vice release          # and back
```

`tools/vice-mcp` becomes a link to that folder; a release already there
is kept at `tools/vice-mcp-release`. Nothing outside `tools/` changes, and
the build itself is the contributor's to manage. `tools.py status` names
it by where its source can be had, read from the build's git tree:
`own build of <host/owner/repo>, branch <b>, commit <c>`. Record that line
in `game.json` under `tools.emulator`, so that the game says what it was
measured with. Then run `check-emulator` on it; the checks, not the
build's name, decide which workarounds apply. Ask the contributor whether
they have one before downloading the release.

The line never carries the build's path on this computer: it is published
on the About tab, a home folder usually names a person, and nobody else
can use it (`check_docs.py` refuses one anywhere in the repository). A
commit on no public remote is said so; push it, or say in `game.json`
where the source can be had. Add what the build contains over the
release, since a commit alone does not say. A build of a pull request
still under review is named the same way, and `status` says, for example,
`own build of github.com/barryw/vice-mcp, release v3.13.1, commit
fdc435ca, with pull request #30 (962d86c0) merged`. Building with
unmerged pull requests is for maintainers, not contributors: it runs
code nobody has merged, from whoever opened the pull request ("Unmerged
fixes", below).

**Prerequisite the kit does not install:** Rust's `cargo`
(https://rustup.rs), for the disassembler. If the contributor has no
`cargo`, tell them, and let them decide whether to install Rust; it is the
one thing here that lives outside this folder.

## What goes where, and what is left behind

Tell the contributor this before installing anything:

| What | Where | Size |
|---|---|---|
| Emulator build | `tools/vice-mcp/`, or a link to the contributor's own build | about 100 MB |
| Emulator source and build, when built from source (`get-vice build`) | `tools/src/vice-mcp/`, with `tools/vice-mcp` a link into it | 550 MB (Linux) to 700 MB (macOS) |
| Emulator's config, log and snapshots | `tools/vice-home/` | small; snapshots are 200 KB each |
| Disassembler binary | `tools/cargo/` | about 20 MB |
| Logs | `tools/logs/` | small |

**Uninstall:** delete the repository folder. These can be left outside
it, and that is the complete list:

- regenerator2000 writes a settings file of a few hundred bytes to its own
  config folder (`~/Library/Application Support/regenerator2000` on macOS).
  Delete it if you want no trace.
- Rust itself, if the contributor installed it for this (`rustup self
  uninstall` removes it).
- When the emulator was built from source: the build packages, if they
  were installed for this. On macOS they are Homebrew formulas ("Get the
  emulator", below; `brew uninstall` them, then `brew autoremove`), on
  Linux apt packages (the list is under Linux, below).
- When the Linux release zip was used: its runtime libraries, if they
  were installed for this (apt packages; the list is under Linux, below).

Verified on macOS with `tools.py verify-footprint`: the emulator wrote its
log, settings and snapshots under `tools/vice-home/` and nothing under the
home directory, at launch, in use and on exit. Verified the same way on
Linux, in a container with no display (below). No Windows run is
recorded.

## Get the emulator

Always the newest vice-mcp release. Nobody pins a version, because the
project does not build every platform for every release: in September
2026, v3.12.1 and v3.13.1 had Linux and Windows builds and no macOS one,
and v3.11.0 was the newest release with a macOS build. So find out what
this machine can have, with nothing changed:

```
python3 kit/scripts/tools.py get-vice
```

It names the newest release, this machine (`macos-arm64`,
`linux-x86_64` and so on) and the build installed now, then says which
of these applies. **Show the contributor what it printed and ask**; each
path is their answer, never a default.

- **The newest release has a GUI build for this machine.** Ask before
  downloading, giving the file name and size, then
  `tools.py get-vice download`. It unpacks into `tools/vice-mcp/` and
  records the version, so `status` says `release v3.13.1,
  v3.13.1-linux-x86_64-gui.zip`.
- **It has none.** Offer both, and let the contributor choose:
  1. **Build the newest release from source**, `tools.py get-vice build`.
     It clones the release into `tools/src/vice-mcp/` and compiles it:
     550 to 700 MB there. The compile needs system packages outside this
     repository (apt on Linux, Homebrew on macOS; the full macOS set is
     about 400 MB, most of it GTK 3, with Homebrew itself and Xcode's
     command line tools under it). The script lists whatever is missing,
     with the one command that installs it, and stops before anything is
     built. Many contributors will not want that on their machine; that
     is a fine answer.
  2. **Download the newest release that has a build for this machine**,
     `tools.py get-vice download <tag>`, which the plain command names.
     It is older, so it may fail checks the newest passes; the table at
     the top of this file says what v3.11.0 fails, and `workarounds.md`
     is written for it.

The compile took two minutes on a ten-core Apple silicon Mac and about
ten on a four-core Linux container. Run `check-emulator` afterwards, whichever path was taken.

What it is, and say so when you ask: VICE is the long-running open-source
Commodore emulator, under the GNU General Public License v2. vice-mcp is
a fork of it by Barry Walker that adds an MCP server, under the same
licence, with the stated aim of contributing the work back to VICE. The
builds are produced by the project's own continuous integration and
published on its GitHub releases page,
https://github.com/barryw/vice-mcp/releases; the source is cloned from
the same repository. Nothing comes from anywhere else.

The builds the project publishes, when a release has them:

| Operating system | Asset | Notes |
|---|---|---|
| macOS, Apple silicon | `...-macos-arm64-gui.dmg` | **what the first three games were done with** (v3.11.0) |
| macOS, Apple silicon | `...-macos-arm64-headless.zip` | no window; **nothing stops the CPU**, see below; no run recorded |
| Linux x86_64 | `...-linux-x86_64-gui.zip` or `-headless.zip` | the GUI zip run on 24 September 2026 in a container with no display (Linux, below) |
| Windows x86_64 | `...-windows-x86_64-headless.zip` | headless, so **stops do not work in it** at all; no run recorded |

`get-vice` only ever picks a GUI build.

### Unmerged fixes: maintainers only

A fix can sit in the project's pull-request queue for a while. An admin
of this repository can build the newest release with reviewed, unmerged
pull requests merged on top:

```
python3 kit/scripts/tools.py get-vice build --prs
```

The pull requests are listed in `kit/c64/vice-prs.json`, each with the
commit that was reviewed and why it is there. A pull request that has
been pushed to since is refused until someone reviews it again, and one
already in the release is skipped, with a note to take it out of the
list. The script checks with the GitHub CLI that whoever runs it is an
admin of the repository in `site/config.json`, and refuses otherwise.
Never do this for a contributor: it compiles and runs code that nobody
has merged, from whoever opened the pull request.

**Use the GUI build wherever one exists.** The kit talks to the emulator
only over MCP, so a headless build looks sufficient, and it is not. In
VICE's headless port the pause routine is a stub with its body commented
out, so the server's pause, a completed step and a stopping checkpoint
all set the "paused" flag and leave the CPU running: `vice_ping` reports
paused, memory reads race the running game, and every checkpoint that
should halt the machine silently does not. Keys sent by host key name
(`vice_keyboard_key_press`) also have no keymap to land in. The GUI
build stops, late by up to one frame (the pause takes hold at the next
vertical sync), which is what the tool skill's `workarounds.md` is
written for. Every Windows build the project had published by 24
September 2026 was headless, so a Windows contributor with one of those gets a build in which phase 4 of `kit/EMULATOR.md` cannot be done
and phase 3 must never use a stopping checkpoint; say so before they
start. The headless build is still the right one for unattended batch
runs that never need to stop: a cycle limit and an exit screenshot, or a
replay through the in-game input hook. **Ask the contributor
before downloading**, tell them the file name and size, and let them fetch
it if they prefer; a build fetched by hand is unpacked into `tools/vice-mcp/`
so that `tools/vice-mcp/bin/x64sc` exists, and its version goes into
`game.json` by hand. macOS may refuse to open an unsigned download; if so the
contributor clears it in System Settings, Privacy & Security, or with
`xattr -dr com.apple.quarantine tools/vice-mcp`. The project had published no
Intel macOS or ARM Linux build by 24 September 2026; `get-vice build` is
the way to one where none exists, and no run of it is recorded on either.

## Get the disassembler

```
cargo install --root tools/cargo regenerator2000
```

That compiles it (about a minute on a recent machine) and puts the binary at
`tools/cargo/bin/regenerator2000`, not in `~/.cargo/bin`.

What it is, and say so when you ask: regenerator2000 is an open-source
6502 disassembler by Ricardo Quesada, source at
https://github.com/ricardoquesada/regenerator2000, licensed MIT or
Apache-2.0, published on crates.io by its author. `cargo install` fetches
that source from crates.io and compiles it on the contributor's machine;
no prebuilt binary is downloaded or run.

## Start, check, stop

```
python3 kit/scripts/tools.py status
python3 kit/scripts/tools.py vice                 # emulator, MCP on 127.0.0.1:6510
python3 kit/scripts/tools.py r2000 <snapshot.vsf> # disassembler, MCP on :3000
python3 kit/scripts/tools.py snapshots            # where emulator snapshots land
python3 kit/scripts/tools.py stop
```

The launcher, `kit/c64/tools.py`, points the emulator's XDG config, state
and cache paths into `tools/vice-home/`, gives both tools the
pseudo-terminal they need, and writes their logs to `tools/logs/`. Do not
start the tools by hand; the containment is in the launcher.

## macOS — known to work

- **The emulator** serves MCP over HTTP; `.mcp.json` registers it as the
  `vice` server. Claude Code connects to MCP servers when a session
  starts, so the `vice_*` tools appear only if the emulator was already
  running then: not on a first run, where it is installed partway
  through, and not in a session opened in the folder above the clone,
  which does not read `.mcp.json`. `kit/c64/vice.py`, below, needs no
  registration and works either way. A server that was up when the
  session started and is **restarted** comes back on the next call.
  VICE can and does die mid-session, sometimes on a single tool call, so
  check `tools.py status` before concluding that the emulator is telling
  you something surprising. Snapshots saved through MCP land in
  `tools/vice-home/config/vice/mcp_snapshots/`; copy the `.vsf` into the
  game's `work/`.

  `kit/c64/vice.py` speaks to the same server from a script, which is
  how live tests should be written: one round trip per tool call adds up
  fast, and a test that halts, pokes, runs and reads is a dozen calls. It
  also carries the joystick workaround; see
  `kit/skills/c64/tool-vice-mcp/workarounds.md`.
- **The disassembler** binds port 3000 with no option to change it, and
  only one instance can run at a time. Drive it with
  `python3 kit/c64/r2000.py <tool> '<json args>'`, which also logs
  every mutating call to the game's `work/annotations.jsonl`.

  The two servers do not answer the same way: regenerator2000 replies with
  server-sent events and vice-mcp with a plain JSON body. Both kit clients
  handle either.
- **Sandbox PATH.** Some agent shells run with a narrower `PATH` than your
  login shell, so cargo and Homebrew binaries report "command not found"
  although they are installed. Prefix commands with
  `export PATH="/opt/homebrew/bin:$HOME/.cargo/bin:$PATH"` before
  concluding `cargo` is missing.

  That line is for a shell, which expands `$PATH`. Never paste it into an
  agent's settings file, where the value is taken literally. `$PATH` then
  stays a literal string, the system directories drop off, and every tool
  the agent shells out to goes missing. Claude Code reaches the macOS
  keychain through `/usr/bin/security`, so the first symptom is a sign-in
  that reports success followed by a session that is not there, with no
  credential stored. If you do set it there, write every directory out in
  full.
- **Assembler (Platinum tier only).** 64tass or ACME, from Homebrew.

## Linux — run on a server with no display, 24 September 2026

Run on 24 September 2026 on Ubuntu 24.04, x86_64, four cores, in cloud
containers with no display (gcc 13.3, Python 3.11, cargo 1.94). The first
run built v3.13.0 from source and measured `check-emulator` 56 of 56 three
times, `verify-footprint` clean. A second run the same day used the
v3.13.1 release zip and then a source build of the same tag (the table at
the top of this file). No run is recorded on a Linux desktop, on ARM or on
another distribution.

**A network that refuses the GitHub API.** In those containers the proxy
answered `api.github.com`, the project's web pages and `codeload` with 403
("GitHub access to this repository is not enabled for this session"), for
any repository not attached to the session, while `git clone` and the
release files themselves
(`github.com/barryw/vice-mcp/releases/download/<tag>/<file>`) went
through. The first run took that for "no release downloads" and built from
source. `get-vice` now reads the tags with `git ls-remote` when the API does
not answer, and finds a release's file by the name the project's CI gives
it (`<tag>-<machine>-gui.zip`, or `.dmg` on a Mac), so the plain command
still says what this machine can have. From nothing installed, `get-vice`,
`get-vice download` (20 MB in two seconds), `vice` and `check-emulator`
(55 of 56, `determinism-restart`) then ran end to end. When the machine
lacks a library the release needs, `get-vice download` and `vice` name it
rather than leaving the emulator to fail in its log.

**The release zip.** It unpacks as `usr/local/{bin,share}` and bundles no
libraries. It was built for `/usr/local`, so from `tools/vice-mcp` it
stops at start-up with "Couldn't load kernal ROM"; the launcher links
`tools/vice-home/data/vice` (VICE's user data folder, searched first) to
the build's own `share/vice`, which fixes that and changes nothing outside
the repository. On Ubuntu 24.04 it needed these runtime packages, which
live outside the repository like the build packages below:

```
sudo apt-get install --no-install-recommends libpulse0 libpcap0.8t64 libusb-1.0-0 \
  libieee1284-3t64 libflac12t64 libvorbisenc2 libvorbisfile3 libvorbis0a libogg0 \
  libglew2.2 libevdev2 libmicrohttpd12t64 libportaudio2 libmpg123-0t64
```

`ldd tools/vice-mcp/bin/x64sc | grep "not found"` lists what another
machine lacks. `verify-footprint` was clean with the release zip and with
the source build. Its `SHA256SUMS` file checks every file but itself (it lists
its own hash as that of an empty file).

**Build the emulator from source.** This is the path when there is no
release you can download, as here, where the container could not reach
GitHub's release downloads but could clone:

```
python3 kit/scripts/tools.py get-vice build
```

That clones the newest release into `tools/src/vice-mcp` and hands it to
`kit/c64/build_vice.py` (also reachable as `build-vice <source dir>` for
a tree of your own; `-h` shows how to add a pull request by hand), which
configures the GTK3 GUI build the way the project's CI does,
installs it into `tools/src/vice-mcp/install` and links `tools/vice-mcp`
to it, so `tools.py status` names the build from its git history, pull
requests included, and that line can go into `game.json` as it stands.
About ten minutes on four cores; the source tree with its build is about
550 MB, all of it under `tools/`. The build needs system packages, which
live outside the repository: the script names whatever is missing and
stops, and installing them is the contributor's call. On Debian or Ubuntu
the complete list was:

```
sudo apt-get install --no-install-recommends build-essential autoconf automake \
  bison byacc flex xa65 dos2unix pkg-config libgtk-3-dev libglew-dev \
  libmicrohttpd-dev libevdev-dev libpng-dev libcurl4-openssl-dev \
  libasound2-dev libpulse-dev xvfb xauth
```

**No display.** A server or container has no X display, and the GUI build
will not start without one. The launcher sees that (neither `DISPLAY` nor
`WAYLAND_DISPLAY` is set) and runs the emulator under `xvfb-run`, which
starts a virtual X server for it and stops it when the emulator exits;
`tools.py stop` stops the emulator itself so that `xvfb-run` can clean up.
Nothing is drawn anywhere and screenshots still work, since VICE renders
them itself. Use the GUI build here too, not the headless one: the
headless build's pause does not stop the CPU (above). The picture is
rendered in software (Mesa's llvmpipe), and the emulator uses about 80 %
of one core.

**Speed.** An unpaced MCP call took about 16 ms (61 a second), several
times a Mac's. Two things follow. A script that arms a stopping checkpoint
and then adjusts it in a second call can lose the race to the machine; arm
it on a stopped machine. And a non-stopping checkpoint on a busy loop
(77,000 hits a second) slowed the machine to 78 % of real time, after
which VICE ran faster than real time until it had caught up; a wall-clock
window just after such a measurement is skewed, so count passes or frames
instead.

**Footprint.** Everything the emulator wrote went under `tools/vice-home/`:
its snapshots, PulseAudio's runtime directory, GTK's dconf store and Mesa's
shader cache. `xvfb-run` keeps its X authority file in a temporary folder
under `/tmp` and removes it on exit. regenerator2000 wrote nothing to
`~/.config/regenerator2000` in this run; the path stays on the Uninstall
list until a run shows where it writes. The apt packages above, if they
were installed for this, are the Linux addition to that list, and so are the
release zip's runtime packages (above).

## Windows — no run recorded

A headless release build exists (above). regenerator2000 installs with
cargo. The `script` wrapper the launcher uses does not exist on Windows;
the tools may need a different way to get a terminal. Report what you find.
