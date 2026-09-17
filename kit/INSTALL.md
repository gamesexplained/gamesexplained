# Tools

The method needs three things. Only the capabilities matter; the named
tools are the ones we recommend because they are known to work.

| Need | Capability | Recommended tool |
|---|---|---|
| Emulator with an agent interface | attach a disk, autostart, pause, read and write memory, breakpoints, screenshots, save and load snapshots | VICE with the `vice-mcp` server (https://github.com/barryw/vice-mcp) |
| Disassembler with an agent interface | load a snapshot, disassemble, label, comment, type data, export a symbol map | regenerator2000 (on crates.io) |
| Scripting | run `kit/scripts/` | Python 3.9 or later, no packages required |

**Prerequisites the kit does not install:** Python 3 and Rust's `cargo`
(https://rustup.rs). If the contributor has no `cargo`, tell them, and let
them decide whether to install Rust; it is the one thing here that lives
outside this folder.

## The footprint principle

**The kit leaves the cleanest footprint we can reasonably manage, so that a
contributor can trust it with their computer.** In practice:

1. Everything installed lives inside this repository, under `tools/`.
2. Everything the tools write while running (settings, logs, snapshots,
   caches) lives there too, by pointing each tool's paths inside.
3. Uninstalling is deleting the folder. Whatever cannot be contained is
   listed, completely, under "Uninstall" below, and the contributor is told
   before anything is installed.
4. It is verified, not assumed: `python3 kit/scripts/tools.py verify-footprint`
   runs a whole launch, use and exit and lists anything written outside the
   repository. An empty list is the pass.
5. Nothing outside the repository is changed without asking first: no
   shell profiles, no system settings, no global package installs.

**If you are the first on an operating system** (Linux and Windows are
untested), the macOS setup is the standard to match, and matching it is
part of your run:

- Unpack the emulator into `tools/vice-mcp/` and install the disassembler
  with `cargo install --root tools/cargo`, as on macOS.
- Make `tools.py` contain the emulator's state on your system. On macOS and
  Linux that is the XDG variables it already sets. On Windows find the
  equivalent (VICE's own `-config` and directory options, or environment
  variables such as `APPDATA`) and add it to the launcher for that
  platform; do not leave it to each contributor to remember.
- Run `verify-footprint`. Fix what it finds, or, if something cannot be
  contained, add it to the Uninstall list with its exact path and size.
- Add the locations your system's tools habitually use to
  `home_candidates()` in `tools.py`, so the check looks in the right
  places next time.
- Write the section for your operating system below, change "untested" to
  what you verified, and record it in your game's `kit-feedback.md` and in
  `kit/CHANGELOG.md`.

## Everything goes in `tools/`, and uninstalling is deleting the folder

The kit installs nothing outside this repository. Tell the contributor this
before installing anything:

| What | Where | Size |
|---|---|---|
| Emulator build | `tools/vice-mcp/` | about 100 MB |
| Emulator's config, log and snapshots | `tools/vice-home/` | small; snapshots are 200 KB each |
| Disassembler binary | `tools/cargo/` | about 20 MB |
| Logs | `tools/logs/` | small |

`tools/` is gitignored and the binary scan skips it. **To uninstall, delete
the repository folder.** Two small things can be left outside it, and that
is the complete list:

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

| Operating system | Asset | Notes |
|---|---|---|
| macOS, Apple silicon | `...-macos-arm64-gui.dmg` | **what the first three games were done with.** Open the image and copy its contents (the `.app` bundles and `bin/`) into `tools/vice-mcp/` |
| macOS, Apple silicon | `...-macos-arm64-headless.zip` | no window; untested by us |
| Linux x86_64 | `...-linux-x86_64-gui.zip` or `-headless.zip` | untested by us |
| Windows x86_64 | `...-windows-x86_64-headless.zip` | headless only; untested by us |

The method only talks to the emulator over MCP, so a headless build should
be enough; the GUI build lets the contributor watch. **Ask the contributor
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

## Start, check, stop

```
python3 kit/scripts/tools.py status
python3 kit/scripts/tools.py vice                 # emulator, MCP on 127.0.0.1:6510
python3 kit/scripts/tools.py r2000 <snapshot.vsf> # disassembler, MCP on :3000
python3 kit/scripts/tools.py snapshots            # where emulator snapshots land
python3 kit/scripts/tools.py stop
```

The launcher points the emulator's XDG config, state and cache paths into
`tools/vice-home/`, gives both tools the pseudo-terminal they need, and
writes their logs to `tools/logs/`. Do not start the tools by hand; the
containment is in the launcher.

## macOS — known to work

- **The emulator** serves MCP over HTTP; `.mcp.json` registers it as the
  `vice` server. Because the transport is plain HTTP, a server started or
  **restarted** after your session began is picked up on the next call.
  VICE can and does die mid-session, sometimes on a single tool call, so
  check `tools.py status` before concluding that the emulator is telling
  you something surprising. Snapshots saved through MCP land in
  `tools/vice-home/config/vice/mcp_snapshots/`; copy the `.vsf` into the
  game's `work/`.

  `kit/scripts/vice.py` speaks to the same server from a script, which is
  how live tests should be written: one round trip per tool call adds up
  fast, and a test that halts, pokes, runs and reads is a dozen calls. It
  also carries the joystick workaround; see `skills/c64/tool-vice-mcp`.
- **The disassembler** binds port 3000 with no option to change it, and
  only one instance can run at a time. Drive it with
  `python3 kit/scripts/r2000.py <tool> '<json args>'`, which also logs
  every mutating call to the game's `work/annotations.jsonl`.

  The two servers do not answer the same way: regenerator2000 replies with
  server-sent events and vice-mcp with a plain JSON body. Both kit clients
  handle either.
- **Sandbox PATH.** Some agent shells run with a narrower `PATH` than your
  login shell, so cargo and Homebrew binaries report "command not found"
  although they are installed. Prefix commands with
  `export PATH="/opt/homebrew/bin:$HOME/.cargo/bin:$PATH"` before
  concluding `cargo` is missing.
- **Assembler (Platinum tier only).** 64tass or ACME, from Homebrew.

## Linux — untested

Release builds exist (above); regenerator2000 installs with cargo. Nobody
has run the full workflow on Linux yet. If you do, please record what happened in your
game's `kit-feedback.md` so this section can be written properly.

## Windows — untested

A headless release build exists (above). regenerator2000 installs with
cargo. The `script` wrapper
above does not exist on Windows; the tools may need a different way to get
a terminal. Report what you find.

## When the sandbox has no `timeout`

macOS ships no `timeout` command. A long-running probe needs a guard inside
the script, or a background run you poll, rather than `timeout 60 ...`.

## Health check

`python3 kit/scripts/tools.py status`. Both tools die with the session
that started them; start them again next time.
