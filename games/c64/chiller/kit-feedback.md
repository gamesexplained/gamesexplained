# Chiller — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). What the skills and
kit got wrong or left out, what was changed, what needs a maintainer's
decision, what took longest, operating system and tool versions.

## Changed in this branch

- `kit/c64/tools.py`, `STOP_PATTERNS["vice"]`: the pattern was anchored to
  `<tools/vice-mcp>/bin/x64sc`, but on a macOS **release** install that path
  is a shell wrapper (`bin/x64sc` execs `VICE.app/Contents/MacOS/VICE`) and
  the process holding :6510 is
  `VICE.app/Contents/Resources/bin/x64sc -mcpserver`. Nothing matched, so
  `tools.py stop vice` printed success and left the emulator running.
  Observed before the fix: the emulator download refused with "the emulator
  is running"; `check-emulator` printed "emulator already answering on
  :6510" instead of restarting, so its `determinism-restart` check re-tested
  the *same process* and could pass falsely; `verify-footprint` left the
  machine up. The pattern is now scoped by path and not anchored, so it
  matches the wrapper and the app both. After the fix: `stop vice` reports
  `:6510 down`, `check-emulator` shows a real restart, `verify-footprint`
  ends with the emulator down.
- `kit/c64/INSTALL.md`: the macOS arm64 **release** build (v3.13.1) had no
  row; measured 28 September 2026, 56 of 57, failing
  `pause-at-instruction` only.

## Maintainer asks

1. `check-emulator` on a machine with no emulator running dies with a raw
   `urllib.error.URLError ... Connection refused` traceback out of
   `connect()`. The documented order (`get-vice` prints "next: `tools.py
   vice`, then `check-emulator`") hides this, but a run that follows
   `10-orient` step 0 as written — `status`, then `check-emulator` — gets a
   stack trace instead of "start the emulator first".
2. Nothing in the kit says how to load a **bare `.prg`**, as against a disk
   image. `vice_autostart` on a `.prg` with no unit attached to serve it
   sits at `SEARCHING FOR *` forever; what works is to let VICE wrap it into
   `tools/vice-home/cache/vice/autostart-C64SC.d64` and attach that as unit
   8. Worth a line in `kit/skills/c64/tool-vice-mcp/SKILL.md`, "the
   sequence that works".
3. **Nothing tells the agent which model it is running on, and inferring it
   goes wrong.** `env` here carries only `CLINE_ACTIVE=true`. With no way to
   ask, this run read a session transcript out of VS Code's local state
   (`emptyWindowChatSessions/*.jsonl`), found `claude-fable-5.1` in it, and
   recorded `claude-fable-5-1` in `game.json` and `timings.json`. The
   session was actually running `deepseek/deepseek-v4.1-flash`: the
   transcript was a different window's. So the runs table gained a false
   row, and — worse — `AGENTS.md`'s rule that work needs an Opus- or
   Sol-class model or better could not be checked by the agent at all. The
   agent only learnt the truth because the contributor said so.
   `clock.py` should refuse a guessed id, or the kit should say plainly that
   an agent may not infer its model and must ask the contributor; and if the
   harness can expose the current model, the launcher should read it.
   **This is not a new issue: it belongs as a comment on #44** ("Say whether
   the model id goes in committed files when a hosted session forbids model
   identifiers"), which the retro's search-first rule surfaced.
4. A second clone of the kit on the same Mac had a *live* run holding :6510
   and :3000. `tools.py status` says the owner is from another folder, but
   nothing says a run is in progress there, so the agent cannot tell
   "abandoned leftovers" from "someone's session". The emulator download
   refuses with "the emulator is running" without naming the other folder.
5. `build.py` on a game folder that has no `listing.json` dies with an
   uncaught `FileNotFoundError` traceback for the file; it should say to run
   `listing.py` first. Separately, the `title_image` warning says "set it in
   game.json to a file under reference/" while the value is resolved
   relative to the *game folder*, so `reference/title-screen.png` is what
   works and `title-screen.png` silently keeps the warning.

## What took longest

<the table from `python3 kit/scripts/clock.py report`>

The one change to the kit that would have saved the most minutes:
