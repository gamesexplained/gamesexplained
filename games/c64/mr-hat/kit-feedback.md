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

The lessons, told once: `kit/lessons/2026-10-02-mr-hat.md`.

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
- **Measure the listing's comments with a random sample** (`60-verify`),
  after a full audit took this run's from 25 % to 3 % wrong.
- **Count the instances before a claim about all of them** (`60-verify`),
  after the maintainer's review found that most wrong claims were one
  room or one test written up as the game's.

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
  Fixed afterwards on this branch: `phase()` counted the line counter's
  wraps from drops in the line, and two samples a frame or more apart
  show none; it now counts them from the stopwatch. `frame.py test`
  passes, and the room captured with 0 pixels different.
- `site/lib/c64.js` gains `drawSpriteMC`, a multicolour sprite drawer, for
  the page's sprite gallery; checked against `renderFrame` on Mr Hat's
  sprite in a recorded frame (248 pixels, none different).
- `check-emulator`'s `warp` check fails on a software-rendered display.
  Nothing in the workflow needs warp, and no workaround section existed;
  one is added.
- `.mcp.json` names port 6510 and cannot follow `KIT_VICE_PORT`; `vice.py`
  works regardless. Ask below.
- The Chrome extension was not connected, so the page check used
  Playwright's cached headless Chromium (`--screenshot`, and `--dump-dom`
  on a copy of the page that clicks every control and reports). The skill
  could name that fallback.

## After the merge: three copies compared (4 October 2026)

- `40-sweep`, "Twin-copy check": a source and its copy that differ where
  no instruction can write mean damage from outside the game; the copy
  made earlier is the right one. Mr. Hat's title font differs from its
  copy in 14 bytes, which is the broken I after a game over; the run had
  excluded the copy as output and never compared them.
- `tool-regen2000`: the saved project is not kept up to date. Restarted
  on it after the full audit, the disassembler held the comments from
  before it (275 differ), and an export would have undone the audit.
  Start each later session from `symbols_import.py`, or compare the
  comments with `symbols.json` before the first write.

## Maintainer asks

- #174: `clock.py` should be able to leave out a wait (the coverage step's 2,513 minutes were mostly usage-limit waits)
- #175: `.mcp.json` cannot follow `KIT_VICE_PORT`
- #176: `check-emulator`'s `warp` check failed on a Linux desktop under `xvfb-run`

## What took longest

| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 13 | claude-opus-5-5 | 1 |  |
| 20-features | 5 | claude-opus-5-5 | 2 |  |
| 30-text | 4 | claude-opus-5-5 | 1 |  |
| 40-sweep | 2 | claude-opus-5-5 | 1 |  |
| 50-coverage | 2513 | claude-opus-5-5 | 2 | all nine annotation agents stopped at once on the account's session usage limit (HTTP 429) and did no work; the step sat idle about six hours until the limit reset at midnight, then was restarted; nine annotation agents on disjoint ranges, all claude-opus-5-5 (inherited from the lead), interrupted twice by the account's usage limits (a five-hour session limit, then the weekly limit) and resumed from their own contexts; the wall clock includes those waits |
| 60-verify | 643 | claude-opus-5-5 | 4 | after the maintainer's review: merge of main, the asks reformatted, five wrong claims checked and fixed, a verifier agent (claude-opus-5-5) auditing all ~120 page claims and re-checking the fixes, kit lesson on generalised claims; audits of facts.md and features.md (every claim) and of 60 sampled listing comments, by two claude-opus-5-5 agents (one interrupted by the usage limit and resumed); corrections; live tests showing room 5's object cannot be taken and the ending is reached without it; full audit of all 1,268 listing comments by nine claude-opus-5-5 agents on balanced ranges (235 corrected; interrupted once by the session limit and resumed), and a fresh 60-comment sample to measure the result (25% before, 3.3% after) |
| 70-minisite | 19 | claude-opus-5-5 | 1 |  |
| 80-retro | 3 | claude-opus-5-5 | 1 | retro: kit edits (port, contained Rust, Linux desktop notes, brief and coverage skill on usage limits, reference notes on freezer stacks and PETSCII cursor controls, features note on testing controls), game records |
| total | 3204 | claude-opus-5-5 | | 53.4 h of work, over 71.4 h |

The tools' set-up before the clock started took about twenty minutes,
most of it the disassembler's compile and waiting for the contributor's
`apt-get`. Of the coverage step's 2,513 minutes, the agents worked for
roughly two hours in all; the rest was waiting for usage limits to
reset. The live tests of the verify step were mostly done during
coverage, while the agents worked, so the first `60-verify` session took
two minutes and understates it; the 643 in the table are mostly the
work after the maintainer's review. The research subagent ran on the Agent tool's `sonnet` alias, for web
sources only.

The work added after the retrospective on 2 October (the in-play tunes,
the sprite gallery, room 9 as designed, room 10's frame and the
consistency pass) was not clocked: the clock was stopped, and a time for
it cannot be made up afterwards. The fixes after the maintainer's review
on 3 October are clocked as further `60-verify` sessions: the review's
fixes and a full audit of the page, then audits of `facts.md`,
`features.md` and a random sample of 60 listing comments.

The one change to the kit that would have saved the most minutes:
telling annotation agents to write each routine as they understand it,
so that a usage limit costs minutes, not a whole session's reading.
