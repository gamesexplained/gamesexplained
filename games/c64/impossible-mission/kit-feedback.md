# Impossible Mission — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). What the skills and
kit got wrong or left out, what was changed, what needs a maintainer's
decision, what took longest, operating system and tool versions.

## What was changed

- `kit/skills/core/10-orient`: read the image's header before trusting
  its extension. The contributor's file was named `.d64` and was a G64,
  which loads only with true drive emulation.
- `kit/skills/core/50-coverage`: `listing.py`'s untracked-data list only
  finds data that sits at the same address at the hand-over and in play.
  Data the start-up copies elsewhere is never listed. Here the start-up
  copied graphics under the I/O area, and `$D1C0`-`$D3FF` sat outside
  every span with coverage at 100 %. The skill now says to follow the
  start-up's copy loops to their destinations.
- `kit/CHANGELOG.md`: an entry for both of the above.

## What surprised

- The first hand-over snapshot was taken at the packer's `$B000`, not
  at the game's `$3855`. The listing's untracked report then found
  almost nothing, because the image was still packed. `10-orient`
  already says to keep the last hand-over; the step was followed too
  early. Comparing with the right snapshot turned up 12 KB.
- The tracer followed `jsr $DD03` (a CIA register used as an `rts`, a
  protection check) into the RAM under I/O and decoded a picture as
  code, twice. After that the range was typed `byte` so a re-trace
  cannot reach it.
- The container's proxy refused every game site (c64-wiki, Wikipedia,
  archive.org, Lemon64, MobyGames). Only web search summaries were
  readable, and `features.md` marks those rows "(search)".
- VICE v3.13.1 on Linux under xvfb passed every check except
  pause-at-instruction, as the tool notes say. The vice MCP server's
  `registers_set` takes `{register, value}`.

## Maintainer asks

Issues are disabled on `chunkypixel/gamesexplained`, so the asks could
not be filed. They are in the pull request's description under
"Maintainer asks":

- check_docs: let quoted game text through the narration rule. The
  game's message "ORIENTATION CORRECTED" could not be quoted as it
  appears.
- listing.py: report authored data the start-up moves to another
  address. Search the hand-over image for untracked play-snapshot runs.

## What took longest

| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 13 | claude-opus-5-5 | 1 | G64 with true-drive loading at warp; loader traced to find $3855; pocket-computer controls found by trial |
| 20-features | 1 | claude-opus-5-5 | 1 |  |
| 30-text | 2 | claude-opus-5-5 | 1 |  |
| 40-sweep | 3 | claude-opus-5-5 | 1 |  |
| 50-coverage | 30 | claude-opus-5-5 | 1 | single agent; ~20 KB code + 30 KB data annotated by reading disassembly in chunks; room records parsed by script |
| 60-verify | 9 | claude-opus-5-5 | 1 | live tests scripted (protections, clock, death, snooze, forced win, terminal, phone); facts.md written |
| 70-minisite | 11 | claude-opus-5-5 | 1 |  |
| 80-retro | 1 | claude-opus-5-5 | 1 | kit edits, feedback, issues blocked (issues disabled) |
| total | 72 | claude-opus-5-5 | | 1.2 h of work |

The one change to the kit that would have saved the most minutes: have
`listing.py` find moved data itself. Searching for the moved graphics by
hand, after coverage already read 100 %, was the costliest detour.
