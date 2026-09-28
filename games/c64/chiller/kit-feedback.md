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
- `kit/skills/c64/tool-vice-mcp/SKILL.md`, "The sequence that works": a
  check that the machine is really moving before trusting a silence. In
  `20-features` the emulator left by the earlier session was held: `vice_ping`
  said running, screenshots showed play, and every joystick input and
  snapshot load seemed to do nothing. Sprite positions that never changed
  and a `vice_frame_advance` that timed out after one frame were the
  tells, and restarting the emulator cured it. That cost about ten minutes
  and very nearly a false "the stick does nothing". The same note says that
  `vice_memory_read` on a running machine returns no `data_hex` (so
  `read_mem()` raises), and that `vice_snapshot_load` takes a `name`.
- `kit/skills/c64/c64-reference/SKILL.md`, "A note table is tuned for one
  clock": read the cents offset as a size. This run first named the tune's
  notes from the PAL reading, where each sits 35 cents *sharp* of the
  semitone below, and so named every note a semitone low. The fix is to
  count the values that land within a few cents at each clock.
- `kit/skills/c64/c64-reference/SKILL.md`, "Where to read about a game
  first": the Internet Archive as the fallback when C64-Wiki has no page
  (it had none for this game: 404 on 28 September 2026) and the fan sites
  refuse an agent's fetch. The inlay scan's OCR text was the best source
  this run had.
- Re-derived from the bytes, as `TODO.md` asked, and corrected in
  `orientation.md`: the earlier model placed the engine's code at
  `$A000-$BFFF`, where nothing executes during play, and read the
  snapshot's `$01` as `$00` from the RAM image, where the port byte at file
  offset 205 is `$36`. It had also saved the play screen as
  `reference/title-screen.png`; that is now `play-forest.png`.

## Maintainer asks

Filed as `kit-ask` issues on 28 September 2026:

- #82 check-emulator: say "start the emulator first" instead of a URLError traceback (ask 1)
- #83 tool-vice-mcp: say how to autostart a bare .prg (ask 2)
- #44, a comment with this run's case: an agent that cannot tell which model it runs on (ask 3)
- #84 tools.py status: say whether another folder's tools belong to a live run (ask 4)
- #85 build.py: explain a missing listing.json, and fix the title_image hint (ask 5)
- #86 Say that the agent's shell may be the contributor's interactive zsh (ask 6)

The detail of each:

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

6. The shell Cline drives is the contributor's own interactive zsh: a
   heredoc, a `;` inside a long command, or a stray `python3 -` can leave
   it waiting on input or run only part of a line, and `timeout` is not
   installed on macOS. Writing each helper to a file under `work/` and
   running one command per call worked every time. Worth a sentence in
   `kit/INSTALL.md` for macOS or in `AGENTS.md`'s notes on the
   environment.

## What took longest

| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 4 | deepseek/deepseek-v4.1-flash | 1 | booted to play, snapshots saved, orientation.md written; stopped before the disassembler held the snapshot |
| 20-features | 27 | claude-opus-5-5 | 1 | web sources (no C64-Wiki page; manual scans on archive.org), reference shots; lost ~10 min to an emulator left paused by an open monitor, cured by restarting it |
| 30-text | 8 | claude-opus-5-5 | 1 | custom font in screen-code order (+$80); the cards are PETSCII through CHROUT; ten level cards found |
| 40-sweep | 9 | claude-opus-5-5 | 1 | register census, twin copies, where the CPU runs, and the music interpreter decoded |
| 80-retro | 4 | claude-opus-5-5 | 1 | kit edits, kit-feedback, TODO, asks |

The one change to the kit that would have saved the most minutes: a
"prove the machine is moving" check before the first input, now in
`tool-vice-mcp`, because a held emulator reads as a game that ignores
the stick.
