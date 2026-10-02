# Mr. Hat — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). What the skills and
kit got wrong or left out, what was changed, what needs a maintainer's
decision, what took longest, operating system and tool versions.

## The machine

Ubuntu 24.04.3 desktop, Linux 6.8, x86_64, sixteen cores; Python 3.12.3,
node 20.19.5. The agent's shell had no `DISPLAY`, so the launcher ran the
emulator under `xvfb-run` as on a server. vice-mcp v3.13.1, the release
zip; regenerator2000 0.9.20, built with a Rust installed inside `tools/`.
`check-emulator`: 56 of 57, all but `warp`. `verify-footprint`: clean.
Three runtime packages the release needs were missing and need `sudo`
(`libieee1284-3t64`, `libmicrohttpd12t64`, `libportaudio2`); the contributor
installed them.

## What was changed in the kit

- **The emulator's port can move** (`kit/c64/tools.py`, `vice.py`,
  `get_vice.py`, `check_emulator.py`, `check_cpu6502.js`). The
  contributor's own web server held 6510. `KIT_VICE_PORT` starts the
  emulator elsewhere, `-mcpserverport` passes it to VICE, and the
  launcher writes it to `tools/vice-port`, which every client reads, so a
  shell that loses the variable still reaches this clone's emulator. The
  first version used only the variable, and the next call went to the
  contributor's server. Documented in `kit/c64/INSTALL.md` ("Another
  program on port 6510") and the tool skill.
- **Rust inside `tools/`** (`kit/c64/INSTALL.md`): rustup with `RUSTUP_HOME`
  and `CARGO_HOME` under `tools/` and `--no-modify-path`, so a contributor
  without Rust can have the disassembler and nothing in the home folder.
- **A Linux desktop run** (`kit/c64/INSTALL.md`, its measurements table,
  `site/status.json`), and a `warp` section in the tool skill's
  `workarounds.md`.
- **Agents write as they go** (`kit/skills/core/50-coverage/brief.md`), and
  the coverage skill says to resume an agent stopped by a usage limit
  rather than start a new one, to stop the clock while the run waits, and
  to correct a brief the moment a fact in it proves wrong.
- **Freezer backups: read the resume's stack** (`c64-reference`): the
  return addresses above the `RTI`'s lead to the game's own entry.
- **PETSCII spaced with cursor controls** (`c64-reference`).
- **Test a control from a standing start** (`20-features`).

## Where the kit was silent or wrong

- The kit assumed 6510 was free, and every client hard-coded it.
- Usage limits are not in the kit at all. Nine parallel Opus agents ran
  through the account's five-hour allowance before writing anything, and
  later through the weekly one. The brief told them what to write but not
  when, and they all planned one batch at the end.
- `clock.py` has no way to leave out a wait, so the coverage step's
  figure (2,513 minutes) is mostly hours spent waiting for limits to
  reset. Ask below.
- `frame.py capture` failed three times in one room, "the samples
  disagree about the beam's position (1 > -19650)": an offset of one
  frame, in a room whose code installs no interrupt handler of its own.
  The other eleven captures matched to the pixel. Ask below.
- `check-emulator`'s `warp` check fails on a software-rendered display.
  Nothing in the workflow needs warp, and no workaround section existed;
  one is added.
- `.mcp.json` names port 6510 and cannot follow `KIT_VICE_PORT`; `vice.py`
  works regardless. Ask below.
- The Chrome extension was not connected, so the page check used
  Playwright's cached headless Chromium (`--screenshot`, and `--dump-dom`
  on a copy of the page that clicks every control and reports). The skill
  could name that fallback.

## Maintainer asks

The contributor asked to see the pull request before it is opened, so
nothing was filed. The asks are in the pull request's description under
"Maintainer asks", for whoever merges it to file:

- `clock.py` should be able to leave out a wait (a usage limit, a
  contributor away), so that a run's step times stay comparable.
- `frame.py capture` fails to settle the beam's position in one room of
  this game (no interrupt of its own); the samples are a frame apart.
- `.mcp.json` could take the port from the environment (Claude Code
  expands `${VAR:-default}` in it), or `tools.py vice` could write it.
- `check-emulator`'s `warp` threshold fails on a software-rendered
  display, though nothing needs warp; perhaps a warning, not a failure.

## What took longest

| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 13 | claude-opus-5-5 | 1 |  |
| 20-features | 5 | claude-opus-5-5 | 2 |  |
| 30-text | 4 | claude-opus-5-5 | 1 |  |
| 40-sweep | 2 | claude-opus-5-5 | 1 |  |
| 50-coverage | 2513 | claude-opus-5-5 | 2 | all nine annotation agents stopped at once on the account's session usage limit (HTTP 429) and did no work; the step sat idle about six hours until the limit reset at midnight, then was restarted; nine annotation agents on disjoint ranges, all claude-opus-5-5 (inherited from the lead), interrupted twice by the account's usage limits (a five-hour session limit, then the weekly limit) and resumed from their own contexts; the wall clock includes those waits |
| 60-verify | 2 | claude-opus-5-5 | 1 |  |
| 70-minisite | 19 | claude-opus-5-5 | 1 |  |
| 80-retro | 3 | claude-opus-5-5 | 1 | retro: kit edits (port, contained Rust, Linux desktop notes, brief and coverage skill on usage limits, reference notes on freezer stacks and PETSCII cursor controls, features note on testing controls), game records |
| total | 2562 | claude-opus-5-5 | | 42.7 h of work |

The tools' set-up before the clock started took about twenty minutes,
most of it the disassembler's compile and waiting for the contributor's
`apt-get`. Of the coverage step's 2,513 minutes, the agents worked for
roughly two hours in all; the rest was waiting for usage limits to
reset. The live tests of the verify step were mostly done during
coverage, while the agents worked, so `60-verify`'s two minutes understate
it. The research subagent ran on the Agent tool's `sonnet` alias, for web
sources only.

The one change to the kit that would have saved the most minutes:
telling annotation agents to write each routine as they understand it,
so that a usage limit costs minutes, not a whole session's reading.
