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

The vice-mcp v3.11.0 release, macOS arm64 GUI build, measured 22 September
2026: 30 of 56 checks pass.

| Phase | Passes | Fails |
|---|---|---|
| 1 static inspection | all: reads of any size with a bank argument; registers and chip state; snapshot RAM at a fixed offset, which `listing.py` reads | |
| 2 state management | save from a running or a stopped machine; warp on and off | a load does not stop where a checkpoint armed before it says; a load kills every checkpoint when the snapshot was saved with none (`checkpoints-survive-load`); determinism cannot be shown at a stop, because the stop is late |
| 3 live measurement | non-stopping exec checkpoints count, and agree with the program's own counter; the cycle stopwatch | `vice_watch_add` ignores `load`, `store` and `stop` and makes a stopping write watchpoint, which opens the monitor window and freezes the machine |
| 4 frame stepping | keys by matrix and by host name reach the program | stops land up to a frame late; run after a stop, `run_until` and step do not do what they say; no frame advance; joystick port numbers are off by one and input lands up to a frame late |
| transport | a call during a stop answers; 1600 unpaced calls | `vice_ping` has reported `paused` on a fresh, running machine |

The phase 4 failures are small changes inside the server's own code, and
the project asks for contributions: pull requests #6, #7, #11 and #14 to
#20 on `barryw/vice-mcp` fix most of them. Fixing them upstream is the
path, so that contributors keep installing a release rather than
compiling.

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
the build itself is the contributor's to manage. `tools.py status` says
`own build at <dir>`, with its git commit when the folder is inside a git
tree: record that line in `game.json` under `tools.emulator`, so that the
game says what it was measured with. Then run `check-emulator` on it; the
checks, not the build's name, decide which workarounds apply. Ask the
contributor whether they have one before downloading the release.

**Prerequisite the kit does not install:** Rust's `cargo`
(https://rustup.rs), for the disassembler. If the contributor has no
`cargo`, tell them, and let them decide whether to install Rust; it is the
one thing here that lives outside this folder.

## What goes where, and what is left behind

Tell the contributor this before installing anything:

| What | Where | Size |
|---|---|---|
| Emulator build | `tools/vice-mcp/`, or a link to the contributor's own build | about 100 MB |
| Emulator's config, log and snapshots | `tools/vice-home/` | small; snapshots are 200 KB each |
| Disassembler binary | `tools/cargo/` | about 20 MB |
| Logs | `tools/logs/` | small |

**Uninstall:** delete the repository folder. Two small things can be left
outside it, and that is the complete list:

- regenerator2000 writes a settings file of a few hundred bytes to its own
  config folder (`~/Library/Application Support/regenerator2000` on macOS).
  Delete it if you want no trace.
- Rust itself, if the contributor installed it for this (`rustup self
  uninstall` removes it).

Verified on macOS with `tools.py verify-footprint`: the emulator wrote its
log, settings and snapshots under `tools/vice-home/` and nothing under the
home directory, at launch, in use and on exit. Not yet verified on Linux or
Windows.

## Get the emulator

Nobody needs to compile VICE. The vice-mcp project publishes builds on its
releases page, https://github.com/barryw/vice-mcp/releases. As of v3.11.0:

What it is, and say so when you ask: VICE is the long-running open-source
Commodore emulator, under the GNU General Public License v2. vice-mcp is
a fork of it by Barry Walker that adds an MCP server, under the same
licence, with the stated aim of contributing the work back to VICE. The
builds are produced by the project's own continuous integration and
published on its GitHub releases page; nothing comes from anywhere else.

| Operating system | Asset | Notes |
|---|---|---|
| macOS, Apple silicon | `...-macos-arm64-gui.dmg` | **what the first three games were done with.** Open the image and copy its contents (the `.app` bundles and `bin/`) into `tools/vice-mcp/` |
| macOS, Apple silicon | `...-macos-arm64-headless.zip` | no window; **nothing stops the CPU**, see below; untested by us |
| Linux x86_64 | `...-linux-x86_64-gui.zip` or `-headless.zip` | untested by us; prefer the GUI build, see below |
| Windows x86_64 | `...-windows-x86_64-headless.zip` | headless only, so **stops do not work on Windows** at all; untested by us |

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
written for. On Windows the only release is headless, so a Windows contributor
today gets a build in which phase 4 of `kit/EMULATOR.md` cannot be done
and phase 3 must never use a stopping checkpoint; say so before they
start. The headless build is still the right one for unattended batch
runs that never need to stop: a cycle limit and an exit screenshot, or a
replay through the in-game input hook. **Ask the contributor
before downloading**, tell them the file name and size, and let them fetch
it if they prefer. macOS may refuse to open an unsigned download; if so the
contributor clears it in System Settings, Privacy & Security, or with
`xattr -dr com.apple.quarantine <folder>`. There is no Intel macOS or ARM
Linux build; those contributors would have to build from source, which
nobody here has done.

Unpack every build into `tools/vice-mcp/` so that `tools/vice-mcp/bin/x64sc`
exists.

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
  `vice` server. Because the transport is plain HTTP, a server started or
  **restarted** after your session began is picked up on the next call.
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

## Linux — untested

Release builds exist (above); regenerator2000 installs with cargo. Nobody
has run the full workflow on Linux yet. If you do, please record what
happened in your game's `kit-feedback.md` so this section can be written
properly.

## Windows — untested

A headless release build exists (above). regenerator2000 installs with
cargo. The `script` wrapper the launcher uses does not exist on Windows;
the tools may need a different way to get a terminal. Report what you find.
