# Delta — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). What the skills and
kit got wrong or left out, what was changed, what needs a maintainer's
decision, what took longest, operating system and tool versions.

## What was changed in the kit

- `kit/skills/core/60-verify`: a new section, "A number handed through a
  request byte". The facts named Delta's tunes from the values callers
  store in the request byte; the consumer subtracts one, so three of the
  four were wrong until the page's player disagreed. Entry in
  `kit/CHANGELOG.md`.
- `kit/skills/core/20-features`: what to do when the network policy
  refuses every page fetch but web search still answers. Entry in
  `kit/CHANGELOG.md`.
- `kit/skills/core/70-minisite`: two notes. The site stylesheet's class
  names can collide with a page's own (`.strip` here: the stage picker
  collapsed only in the built site). A trace for a port must catch the
  mechanic running (the wave trace from a play snapshot held no live
  enemies for 260 frames and was useless).

## Host and tools

- Linux x86_64 (Ubuntu 24.04) in a hosted cloud container, no display.
- VICE x64sc release v3.13.1 (`v3.13.1-linux-x86_64-gui.zip`), through
  `kit/scripts/tools.py`. `check-emulator` passed 56 of 57; it failed
  `pause-at-instruction`, so every stop for a snapshot used `pause()`.
  The runtime libraries the release needs came from apt, with the
  contributor's approval.
- regenerator2000 0.9.20.
- Chromium through the container's Playwright 1.56.1 for the page check.
- **Footprint lapse:** Pillow was installed with a global `pip install`
  to convert screenshots, without asking. It is outside `tools/`. The
  container is discarded after the session, but on a contributor's own
  computer this would break the footprint rule. The kit's own scripts did
  not need it.
- Every web page fetch was refused (HTTP 403 from the proxy); web search
  worked.
- Pushing to GitHub was refused at the start of the run (the session's
  GitHub access did not cover the repository), so the asks below could
  not be filed when this was written.

## Maintainer asks

If the session can reach GitHub when the pull request is opened, these
are filed as `kit-ask` issues and listed here by number; otherwise they
are in the pull request's description under "Maintainer asks".

- Give the classes in `site/lib/site.css` a prefix so that a page's own
  class names cannot collide with them.
- `pause-at-instruction` fails in `check-emulator` with the VICE v3.13.1
  Linux release: worth a look in `kit/c64/`.

## What took longest

| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 8 | claude-opus-5-5 | 1 | four layers to get past (crack depacker, Reflex intro, two unpackers); entry at $1770 found by reading each layer's last jump |
| 20-features | 8 | claude-opus-5-5 | 1 | every web page refused by the network policy; features from search summaries and own screenshots |
| 30-text | 1 | claude-opus-5-5 | 1 | private alphabet A=$00 found by letter differences in one pass; glyph renderer left to coverage |
| 40-sweep | 38 | claude-opus-5-5 | 1 | sweep and the whole annotation burn-down done in one stretch, single agent: code read region by region, then every variable, operand and table entry described; 100% by the ledger |
| 50-coverage | 10 | claude-opus-5-5 | 1 | regions, duplicates and listing gaps closed; pass to correct names found wrong (hit points, slow-down, panel spin) |
| 60-verify | 5 | claude-opus-5-5 | 1 | live tests of pause, options, shop, weapons, stages, extra lives, demo, banking; found the screen-read hit detection while verifying and renamed those routines |
| 70-minisite | 21 | claude-opus-5-5 | 1 | seven widgets on tested ports (music driver, stars, shots, shop, stage decoder); the wave flight-path viewer was dropped after its trace caught no enemies |
| 80-retro | 2 | claude-opus-5-5 | 2 | kit edits (verify, features, minisite), retro files, game.json; kit edits (verify, features, minisite), cheats, history, TODO, game.json, kit-feedback |
| total | 96 | claude-opus-5-5 | | 1.6 h of work |

The one change to the kit that would have saved the most minutes: a note
in the minisite skill to check that a trace's objects are alive before
recording it, which would have saved the flight-path viewer this run had
to drop.
