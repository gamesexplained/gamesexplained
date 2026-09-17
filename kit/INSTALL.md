# Tools

The method needs three things. Only the capabilities matter; the named
tools are the ones we recommend because they are known to work.

| Need | Capability | Recommended tool |
|---|---|---|
| Emulator with an agent interface | attach a disk, autostart, pause, read and write memory, breakpoints, screenshots, save and load snapshots | VICE with the `vice-mcp` server (https://github.com/barryw/vice-mcp) |
| Disassembler with an agent interface | load a snapshot, disassemble, label, comment, type data, export a symbol map | regenerator2000 (https://github.com/RetroStaff/regenerator2000 or as installed with cargo) |
| Scripting | run `kit/scripts/` | Python 3.9 or later, no packages required |

## Get the emulator

Nobody needs to compile VICE. The vice-mcp project publishes builds on its
releases page, https://github.com/barryw/vice-mcp/releases. As of v3.11.0:

| Operating system | Asset | Notes |
|---|---|---|
| macOS, Apple silicon | `...-macos-arm64-gui.dmg` | **what the first three games were done with.** Open the image and copy its contents (the `.app` bundles and `bin/`) to a folder outside this repository |
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

The disassembler installs with `cargo install regenerator2000` (it is on
crates.io); Rust's `cargo` comes from https://rustup.rs.

## Local paths

Copy `kit/tools.env.example` to `.tools.env` in the repository root (it is
gitignored) and set `VICE_MCP_DIR` to the folder you unpacked the emulator
into. Keep that folder outside the repository. Scripts do not read
`.tools.env`; you do, with `source .tools.env`.

## macOS — known to work

- **VICE with vice-mcp.** A self-contained GUI build with its own ROMs
  lives in the folder `VICE_MCP_DIR` points at. Start it from that folder
  through the `bin/` wrapper (running the binary inside `VICE.app` directly
  fails with a GSettings error) and give it a pseudo-terminal:

  ```
  cd "$VICE_MCP_DIR" && script -q /tmp/vice.log ./bin/x64sc -mcpserver &
  ```

  It serves MCP over HTTP on `127.0.0.1:6510`; `.mcp.json` registers it as
  the `vice` server. Check with `nc -z 127.0.0.1 6510`. Because the
  transport is plain HTTP, a server started or **restarted** after your
  session began is picked up on the next call; you do not have to restart
  the agent session. VICE can and does die mid-session, sometimes on a
  single tool call, so check the port before concluding that the emulator
  is telling you something surprising, and start it again from here.

  `kit/scripts/vice.py` speaks to the same server from a script, which is
  how live tests should be written: one round trip per tool call adds up
  fast, and a test that halts, pokes, runs and reads is a dozen calls. It
  also carries the joystick workaround: the server's own joystick tool only
  reaches one control port, so `stick_arm`/`stick` drive the other one
  through the CIA's data direction register instead. See
  `skills/c64/tool-vice-mcp`.
- **regenerator2000.** Installed with cargo to `~/.cargo/bin`. It needs a
  pseudo-terminal even in MCP mode, binds port 3000 with no option to
  change it, and only one instance can run at a time:

  ```
  script -q /tmp/r2000.log regenerator2000 --mcp-server <snapshot.vsf or project.regen2000proj> &
  ```

  Drive it with `python3 kit/scripts/r2000.py <tool> '<json args>'`, which
  also logs every mutating call to the game's `work/annotations.jsonl`.
  Check with `nc -z 127.0.0.1 3000`.

  The two servers do not answer the same way: regenerator2000 replies with
  server-sent events and vice-mcp with a plain JSON body. Both kit clients
  handle either.
- **Sandbox PATH.** Some agent shells run with a narrower `PATH` than your
  login shell, so cargo and Homebrew binaries report "command not found"
  although they are installed. Prefix commands with
  `export PATH="/opt/homebrew/bin:$HOME/.cargo/bin:$PATH"` before
  concluding a tool is missing.
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

Both servers answering:

```
nc -z 127.0.0.1 6510 && echo emulator up
nc -z 127.0.0.1 3000 && echo disassembler up
```

Both die with the session that started them; start them again next time.
