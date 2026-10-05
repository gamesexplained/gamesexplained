# A View to a Kill — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). What the skills and
kit got wrong or left out, what was changed, what needs a maintainer's
decision, what took longest, operating system and tool versions.

## What the kit got wrong or left out, and what was changed

- **One program per game.** The kit assumed a game is one image. This one
  is five programs loaded from a menu. The run first added its own
  support for parts; the kit's own layout for games of several parts
  (`kit/scripts/parts.py`, merged in PR #202) replaced it before this pull
  request merged, and the game now uses that: each part is a folder with
  a `part.json`, its own Source page `source-<id>.html`, and `data-part`
  on the sections of the authored pages whose addresses are one part's.
  The five programs each replace the whole of memory, so none lies over
  another.
- **The disassembler's fixed port.** Five parts meant five disassemblers.
  They ran side by side in five Linux network namespaces; `tools.py` now
  starts one on any port with `KIT_R2000_PORT`, which is simpler.
- **Packers that do not write everything.** The ending's packer writes
  `$0800`-`$80FF` only, so its hand-over snapshot holds the previous
  program's memory. `10-orient` says to run each packer over memory
  filled two ways.
- **A flag read only at the end.** `60-verify` now says to find every
  reader of a value the player sets at the start.
- Subagents could not write their report files (the harness refused the
  write), so the reports lived only in their final messages, as
  `50-coverage` warns.
- **A tab for maps and solutions.** Here `levels.html` explains the five
  parts, so the maps and the ways to finish them have `maps.html`.

## Maintainer asks

None. The two this run first wrote (a disassembler per part on its own
port, and creating the parts' folders from a list) are answered by
`KIT_R2000_PORT` in `tools.py` and `parts.py add`.

## What took longest

| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 29 | claude-opus-5-5 | 1 | a crack's BASIC menu over five packed programs; each part unpacked, booted by name and captured at its hand-over and in play |
| 50-coverage | 398 | claude-opus-5-5 | 1 | features, the depack simulation and five parts annotated in parallel, one disassembler per part in its own network namespace; the mine (a 100 x 150 scrolling map with 60 object handlers) ran longest |
| 60-verify | 2 | claude-opus-5-5 | 1 | live tests of the code checks in three parts, the City Hall fire ending and the intro's credits race; cross-part byte comparisons |
| 70-minisite | 9 | claude-opus-5-5 | 1 | five authored tabs, per-part Source pages and footprints, and the build changes for parts |
| 80-retro | 2 | claude-opus-5-5 | 1 | kit docs for games of several programs, changelog, feedback |

The 50-coverage figure holds more than annotation: the features pass,
the parts support in the kit and most live verification ran while the
five agents worked, so the later steps are short. The mine's agent alone
ran about 6.5 hours; the other four finished well before it.

The one change to the kit that would have saved the most minutes:
splitting the mine, the largest part, across two or three agents by
address range, as `50-coverage` already describes for a single image.

## Environment

Linux 6.18 x86_64 cloud container, no display, Python 3.11.15, node
22.22.2. VICE release v3.13.1 (`v3.13.1-linux-x86_64-gui.zip`,
`check-emulator` 57 of 57), regenerator2000 0.9.20, Playwright with
Chromium for the browser check.
