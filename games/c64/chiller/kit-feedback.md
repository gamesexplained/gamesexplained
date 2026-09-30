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

Filed as `kit-ask` on 29 September 2026, continuing toward Gold:

- #93 Say what a continuing agent should assume about a `work/` folder that survived from an
  earlier session (ask 7)

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

7. **The keyboard, on this build.** `vice_keyboard_matrix` held by row and
   column never reached the KERNAL's key code in `$C5`; the host-key path
   (`vice_keyboard_key_press`) did, and it has no name for SHIFT. Now in
   `tool-vice-mcp/workarounds.md`. `check_emulator.py` could test a key
   through `$C5` as well as through a game's own matrix scan.
8. **Coverage and loaded data the ledger cannot see.** `listing.py`'s
   report of loaded, untracked stretches was the real work queue once
   `coverage.py` said 100 %: 57 stretches, from a 1 KB tune tail to eight
   NOPs. It would help if `coverage.py` printed that list itself.
9. **Checking a page in a browser.** A plain `--screenshot` run of headless
   Chrome hung with the page's audio worklet loaded; a small DevTools
   protocol script (console, canvases lit, every button clicked, section
   screenshots) worked and could live in `kit/scripts/`. And `build.py`
   rewrites `_site` under a running `http.server`, which resets the
   connection for the shared scripts mid-load: it reads as a broken page.

## Continued toward Gold, 28-29 September 2026

This session picked the game folder back up (per `START.md`, "a Silver
game is curated to Gold") and did the technical work a human's Gold pass
does not need to redo: the TODO items that needed more code reading and
live checking, not editorial judgement.

10. **A model can look right and still be silently wrong.** The first
    version of the reachability search (`work/reach.py`) flagged almost
    every cross on every screen as unreachable — a modelling bug in
    `try_move`'s row arithmetic, not a finding, caught only by comparing
    the model's own convention against `verify.py`'s already-working
    `boy_cell()` (`0x0400 + row * 40 + col` with `row = (Y-$2C)//8`
    taken literally, not shifted). A search that is "syntactically fine
    and produces plausible-looking numbers" is not evidence until it is
    checked against a live, independent measurement. `work/verify_reach4.py`
    did that here: it cleared a column to open space and watched the boy
    fall, live, to confirm the static model's row-22 ceiling. Worth a
    line in a skill: a static analysis over the game's own rules earns
    the same live-check discipline as any other claim in `facts.md`,
    especially when the code path (`try_move`'s row/column arithmetic)
    is being re-derived rather than read straight off a comment.
11. **A one-shot poke of a KERNAL variable the game reads every frame does
    not survive the KERNAL's own scan.** `$028D` (the shift flag) is
    rewritten by `SCNKEY` about 60 times a second from the real keyboard
    state, so a single `poke` before `vice_execution_run` is undone
    before the game's own 32-pass-period input check ever sees it. Held
    with a poke before every `vice_frame_advance` call instead, it
    worked at once. This generalises past SHIFT: any KERNAL-scanned
    variable a game reads (not just `$C5`, also `$028D`, `$91` STOP,
    etc.) needs the same per-frame re-poke if the emulator's key-name
    paths cannot reach it. Worth adding next to the existing SHIFT note
    in `tool-vice-mcp/workarounds.md`.
12. **`work/` surviving between sessions on the same machine is a real
    difference from a fresh clone**, and `AGENTS.md`/`START.md` do not
    say what to assume. This session found `work/play-idle.vsf` and
    thirty-odd earlier scripts already in place from the Silver run,
    which saved re-deriving the snapshot and the level-record layout,
    but nothing marks a game folder as "continued in the same
    environment" versus "picked up in a fresh clone, `work/` regenerated
    from `orientation.md`". An agent that assumes the latter when it is
    the former re-does work for nothing; one that assumes the former
    when it is the latter has no snapshot and no disassembler project at
    all. A one-line check (does `work/` exist and does its README's
    instructions still apply) at the start of a continuation job would
    remove the guessing.

## The Gold pass, 29 September 2026

The steward, unorig, went through the How it works page section by
section in a hosted session, with Claude's hands. What changed in the
kit, and why:

13. **"Unreachable" was a negative result, and it was wrong.** The Silver
    page led with a bug: three crosses on the way home that could never
    be taken. Item 10 above fixed the search's row arithmetic and checked
    one column live, and that was taken as proof. The steward then played
    the Play tab's port through all ten levels and took every cross. On
    the game's own code (`kit/c64/machine.js`) the boy takes each of the
    three by walking left along the ground: `try_move` tests a cell one or
    two rows below his own (`probe_offset` `$5145`), which the model left
    out. `kit/skills/core/60-verify/SKILL.md`, "Negative results", now has
    the row and says to search with the game's own movement code before
    writing that something cannot be reached.
14. **Bytes the interrupt writes, read by read.** The lockstep first
    handed the port the first value the game read of `$A2`, `$C5` and
    `$028D` in each stretch, and passes drifted where the game read one
    again later. Recording every read in order, and having the port read
    those bytes through one function, took the lockstep to 357 of 366
    sessions identical. The other nine are the raster wait's own race
    (the line and `$D011` bit 7 read in two instructions). Both are now in
    `kit/skills/core/70-minisite/SKILL.md`, "A whole game, checked against
    its own code".
15. **A level picker has to finish the levels it skips.** The Play tab's
    first level jump loaded the record and left the skipped level's
    crosses on screen, so crosses of the wrong colour appeared and a
    level could be finished early. Now in the same skill section, with a
    note that a build script inlining the port through `String.replace`
    must pass a function, since `$'` in 6502 comments is expanded.
16. **The shot that was a guess.** The Silver copy called the unused kill
    code "a shooting game underneath". The steward asked whether it was a
    shot or a way to hit enemies, and the code does not say: the kill
    routine takes the enemy from the boy's last collision, and the only
    sprite that could be a shot (`switch_check`) is never moved by any
    code found. A name given while reading became a claim on the page;
    `60-verify` already says to prefer unknown, and this is a case of it.

The kit version is now 0.0.39, with an entry in `kit/CHANGELOG.md`.

### Maintainer asks from the Gold pass

This session could reach only the steward's fork, not the upstream
repository's issue tracker, so these are in the pull request's
description under "Maintainer asks" for whoever merges it to file:

8. **`clock.py` has no step for Gold curation or a Play tab added
   later.** This pass (most of it the Play port and its lockstep) had no step
   to start, so it is not in the table below; only
   its retrospective is.
9. **`kit/c64/lockstep.js` could record the game's reads of
   interrupt-written bytes itself** (item 14), as an option naming the
   bytes, and hand the port a reader; each game now writes it again.

## What took longest

| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 4 | deepseek/deepseek-v4.1-flash | 1 | booted to play, snapshots saved, orientation.md written; stopped before the disassembler held the snapshot |
| 20-features | 27 | claude-opus-5-5 | 1 | web sources (no C64-Wiki page; manual scans on archive.org), reference shots; lost ~10 min to an emulator left paused by an open monitor, cured by restarting it |
| 30-text | 8 | claude-opus-5-5 | 1 | custom font in screen-code order (+$80); the cards are PETSCII through CHROUT; ten level cards found |
| 40-sweep | 9 | claude-opus-5-5 | 1 | register census, twin copies, where the CPU runs, and the music interpreter decoded |
| 50-coverage | 133 | claude-opus-5-5 | 1 | one agent; the kit simulator run on all ten screens found the code the tracer could not reach; ~15 min lost to shell quoting |
| 60-verify | 40 | claude-opus-5-5 | 1 | one agent; the keyboard ate the most: vice_keyboard_matrix never reached $C5 on this build, the host-key path did, and it has no SHIFT name. Playing through with poked crosses was the way to see the way-back screens as the game draws them |
| 70-minisite | 74 | claude-opus-5-5 | 1 | one agent; the music port and its simulator test went fastest; checking the page in a browser took longest: headless screenshots hung, so a DevTools-protocol checker was written, and build.py rebuilding _site under a running server looked like a page failure |
| 80-retro | 684 | claude-opus-5-5 | 3 | kit edits (held-emulator tell, cents reading, archive.org fallback), kit-feedback, TODO, asks; reachability search fixed and confirmed live, enemy paths written up, SHIFT tested by poking $028D, three unread blocks looked into, Maps/levels tab built and checked in headless Chrome; the Gold retro: kit edits for unreachable claims and interrupt-written bytes, kit-feedback, TODO |
| total | 978 | deepseek/deepseek-v4.1-flash, claude-opus-5-5 | | 16.3 h of work, over 28.9 h |


The one change to the kit that would have saved the most minutes this
time: a note next to the SHIFT workaround in `tool-vice-mcp/workarounds.md`
that a poked KERNAL variable needs re-poking every frame, not once
before `vice_execution_run` — the same lesson the SHIFT entry already
half-states but does not spell out for pokes generally, and this run
worked it out again from scratch.

For the Gold pass, the change that would have saved the most: searching
for the crosses with the game's own code from the start, which would have
kept a false bug off the Silver page and out of a round of corrections.
