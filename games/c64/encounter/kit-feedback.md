# Encounter — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). What the skills and
kit got wrong or left out, what was changed, what needs a maintainer's
decision, what took longest, operating system and tool versions.

## What was changed in the kit

- `kit/skills/c64/tool-vice-mcp/SKILL.md`: a section on keys the matrix
  tool does not deliver (SPACE), the host-key tool that does, stale
  registers at a stopping checkpoint, tap versus held stick, and the
  snapshot-load corruption seen here.
- `kit/skills/core/50-coverage/SKILL.md`: resolve every pointer table
  before excluding a region. This run excluded the 8 KB of shape scripts
  as a leftover copy for twenty minutes.
- `kit/skills/core/10-orient/SKILL.md`: the second symptom of a bad
  snapshot load (`$01` changed, CPU in the KERNAL, garbage screen).
- `kit/skills/c64/c64-reference/SKILL.md`: a worked `$D018` example in
  binary. The coordinator decoded `$8E` as "charset at `$7000`" and a
  sub-agent had to correct it.
- `kit/CHANGELOG.md` 0.0.7, `kit/VERSION` bumped.

## What I would change but did not

- The MCP server registered in `.mcp.json` is only picked up if it is
  running when the agent session starts. `INSTALL.md` says a server
  started later is picked up on the next call; in this Claude Code
  session it never appeared as a tool, and the whole run went through
  `kit/c64/vice.py`, which worked. Either the note is wrong for this
  harness or the harness has changed; a maintainer with both should
  settle it.
- `.claude/launch.json` lives in the repository, but the desktop app
  looked for it one directory up (the folder the session was opened in).
  Port 8000 was also already taken on this machine by an unrelated
  server; the preview went to 8010 by hand. The skill could say "any free
  port".
- `r2000_get_address_details` reported `$84E2` as "outside the loaded
  binary range" on a 64 KB snapshot; `set_label_name` with an empty name
  did remove a misplaced label, which the skill does not mention as a way
  to delete one.
- `coverage.py --live` names duplicated descriptions but the fix it asks
  for (describe each block on its own) is the wrong fix when the blocks
  are uninitialised RAM; they belong in `exclude`. The message could say
  so.
- The sub-agent split (six ranges, own logs, Fable) took 36 minutes to
  100 % on 31 KB and every spot-check passed. What the coordinator got
  wrong was the brief: two "facts" in it were mine and false (`$7000` as
  a character set, CIA timer interrupt enabled) and two agents spent time
  disproving them. The brief should carry only checkpoint-verified facts
  and mark the rest as hypotheses.

## Operating system and tools

macOS 26.5 (Darwin 25.5.0), Apple silicon; Python 3.9.6; cargo 1.98.1;
vice-mcp v3.11.0 GUI build (VICE 3.10); regenerator2000 0.9.20. The
install went as `kit/c64/INSTALL.md` says. The dmg's contents are one
folder deep (`vice-arm64-gtk3-3.10/`) plus an `Applications` symlink;
the notes could say to move the folder's contents up so
`tools/vice-mcp/bin/x64sc` exists. `xattr -dr com.apple.quarantine` was
needed once.

## What took longest

| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 5 | claude-fable-5-1 | 1 | install, autostart, F7 to play, snapshots, loader traced via checkpoints; snapshot reload came back corrupt, re-autostarted |
| 20-features | 4 | claude-fable-5-1 | 1 | wiki, wikipedia, manual transcription, comparison blog; joystick and screenshots |
| 30-text | 5 | claude-fable-5-1 | 1 | charsets rendered from the snapshot, two alphabets read, screens decoded, skill names found; sweep for stored strings |
| 40-sweep | 4 | claude-fable-5-1 | 1 | register census over 5.8 KB of code, string sweep in both fonts, twin-page scan, sprite pointers |
| 50-coverage | 36 | claude-fable-5-1 | 1 | six sub-agents on disjoint ranges (fable), then span-filling of auto symbols inside object tables |
| 60-verify | 10 | claude-fable-5-1 | 1 | demo hit counts, gate/warp forced by poking the enemy count, level select, pause, F1, NTSC; the SPACE key cost most (matrix tool never delivered it) |
| 70-minisite | 12 | claude-fable-5-1 | 1 | reconstruction in Python first then JS; ten widgets; browser check of all three tabs; fire-script format fixed after the widget showed garbage |
| 80-retro | 2 | claude-fable-5-1 | 1 | kit edits (vice-mcp key tools, coverage exclusions, D018 example), changelog, cheats, TODO, game.json, kit-feedback |
| total | 78 | claude-fable-5-1 | | 1.3 h of work |

The one change to the kit that would have saved the most minutes: the
pointer-table rule in the coverage skill, since the excluded shape-script
region cost the re-annotation of 8 KB and two rounds of exclusion edits;
second, the input-tool note, which would have saved most of the verify
step.
