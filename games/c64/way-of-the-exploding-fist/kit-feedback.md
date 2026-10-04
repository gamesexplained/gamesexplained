# Way of the Exploding Fist — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). What the skills and
kit got wrong or left out, what was changed, what needs a maintainer's
decision, what took longest, operating system and tool versions.

## What was changed in the kit

- `kit/skills/core/10-orient`, step 3: a frame capture's write to the
  interrupt vector is made by the handler before the one it names, so its
  line is not the named handler's line. The skill said it was; the brief
  built on it sent six agents in with wrong raster lines, and two of them
  had to correct it.
- `kit/skills/core/10-orient`, new step 7: map every file on the disk onto
  the snapshots in 16-byte pieces. It placed the program, the font, the
  speech samples and the speech period table in a minute, and caught a
  table credited to the wrong file.
- `kit/skills/core/60-verify`, "Time it": how to show that a clock kept by
  the main loop does not keep to the frame (exec counters on a per-frame
  routine and on the clock's routine over a few hundred frame advances).
- `kit/skills/c64/c64-reference`, "CIA timers and the tick": timer B
  counting timer A's underflows, measured in the emulator. The reference
  had nothing on the control bits; the figure was derived live.
- `kit/skills/c64/tool-vice-mcp`: a store watch that stayed silent where
  the code plainly writes (cause not found), and a second G64 boot time.
- `kit/lessons/2026-10-03-way-of-the-exploding-fist.md`: an entry headed
  `next` for the three lessons that change what the next agent does.

## Operating system and tools

Ubuntu 24.04 in a cloud container, x86_64, four cores, no display.
vice-mcp v3.13.1 release zip (`get-vice download`, 20 MB), with the
runtime packages listed in `kit/c64/INSTALL.md` installed by apt; it
needed no others. `check-emulator`: 56 of 57, `pause-at-instruction`
failed, as recorded for this release on Linux. regenerator2000 0.9.20
built with cargo 1.97.0. node 22.22.0; Playwright 1.56.1 with the
preinstalled Chromium for the page check. The container restarted
overnight during the minisite step; the tools and `work/` survived, both
servers had to be started again, and the disassembler session was not
needed again because `symbols.json` was current.

Every page fetch to game sites was refused by the session's proxy;
`20-features` already covers this.

## Maintainer asks

The run could not file issues: this session reaches the contributor's
fork, and upstream `gamesexplained/gamesexplained` could not be attached
beside it. The asks are in the pull request's description under
"Maintainer asks", for whoever merges it.

- **`clock.py` has no pause.** A session that stops overnight (here the
  container restarted during `70-minisite`) leaves the open step running,
  and the timings table then shows 1,592 minutes for a step of perhaps
  an hour. A `clock.py pause` / `resume`, or `start` refusing to run on
  past a gap of more than an hour without asking, would keep the runs
  table honest.

## What took longest

| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 14 | claude-opus-5-5 | 1 | boot through the G64 loader took about four minutes of warp per cold boot; hand-over found with a store watch on $FFFE |
| 20-features | 5 | claude-opus-5-5 | 1 | web pages blocked by the proxy; search summaries and the game's own screens |
| 30-text | 1 | claude-opus-5-5 | 1 | font is ASCII-ordered; strings plain |
| 40-sweep | 2 | claude-opus-5-5 | 1 | register census, strings, Fist II byte map (small overlap), two dispatch tables seeded |
| 50-coverage | 27 | claude-opus-5-5 | 1 | six annotation agents on disjoint ranges of $0400-$3FFF; the lead did $4000-$FFFF and zero page |
| 60-verify | 9 | claude-opus-5-5 | 1 | the bull round needed pokes and a distance search; the clock turned out to count loop passes |
| 70-minisite | 1592 | claude-opus-5-5 | 1 | ports of the unpackers, pose builder, hit test and music driver, each checked against the game; the session paused partway (container restarted), so this figure includes idle time |
| 80-retro | 1 | claude-opus-5-5 | 1 | kit edits, changelog, game.json, kit-feedback |
| total | 1650 | claude-opus-5-5 | | 27.5 h of work |

The 70-minisite figure is almost all the overnight pause; the steps up to
verify took about an hour.

The one change to the kit that would have saved the most minutes: a
frame capture that labels each vector write with the handler that made
it, so the brief's raster lines are right the first time.
