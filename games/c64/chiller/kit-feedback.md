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
3. The harness does not name the model to the agent: `env` here carries only
   `CLINE_ACTIVE=true`, so `clock.py --model` was first given `unknown` and
   `game.json` said the same. It was recovered only by reading this
   machine's local session transcript out of VS Code's state
   (`claude-fable-5.1`, recorded here as `claude-fable-5-1`). A hosted
   session could not have done even that. Either a way to ask the harness,
   or a documented wording for "the harness does not name it", would keep
   the runs table honest.
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
