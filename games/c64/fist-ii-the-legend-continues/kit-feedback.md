# Fist II: The Legend Continues — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`).

## Where it ran

A Claude Code cloud session on 30 September 2026: Linux x86_64, Ubuntu
24.04, no display, vice-mcp v3.13.1 release zip (56 of 57 checks,
`pause-at-instruction`), regenerator2000 0.9.20, pages checked in headless
Chromium through the preinstalled Playwright.

## What was changed in the kit

- `10-orient`: take an interrupt chain's handlers from a frame capture's
  writes to the vector, and trace from all of them. Here that found the
  music driver, which the entry and the vectors did not reach.
- `c64-reference`: `$D01E`/`$D01F`, the collision registers, were
  missing from the VIC-II table; one agent read `$D01E` as
  sprite-background from the brief, and another had to correct it.
- `kit/CHANGELOG.md`: an entry headed `## next`, which the kit-version
  workflow numbers after the merge (`[kit-bump]` in the pull request).

## What went well

Putting the whole load in `coverage.extra` before splitting the work
(the Doctor Who run's lesson) gave the eight agents every byte from the
start; they reached 100 % with nothing left for the lead but four
labels.

## Other things that cost time

- A multi-file loader through the KERNAL with true drive emulation is
  slow; warp mode during the load, off afterwards, cut it to seconds.
- Web pages were refused again, so the history rests on search
  summaries.

## Changes made in the curate pass (1 October 2026)

- `kit/scripts/build.py`: `gameplay.html` and `graphics.html` are
  authored tabs, so a game can split play and pictures out of How it
  works.
- `site/lib/sid.js`: a driver may define `readback(env3, osc3)`; the
  player calls it before each frame with voice 3's envelope and the top
  of its waveform, as `$D41C` and `$D41B` read. Fist II's tune 1 sweeps
  its filter from the envelope, and a port without it cannot match.

## Maintainer asks

This session cannot reach `gamesexplained/gamesexplained` to open the
pull request or file issues. The asks are in the pull request's
description under "Maintainer asks", for whoever merges it to file:

- **Say in `kit/START.md` what a hosted session attached to a fork can
  and cannot reach** (the same ask as the Doctor Who run).

## What took longest

| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 11 | claude-opus-5-5 | 1 | slow KERNAL loading of six files; warp helped |
| 20-features | 1 | claude-opus-5-5 | 1 |  |
| 30-text | 0 | claude-opus-5-5 | 1 |  |
| 40-sweep | 2 | claude-opus-5-5 | 1 |  |
| 50-coverage | 14 | claude-opus-5-5 | 1 | eight agents on 8 KB ranges, the whole load counted from the start |
| 60-verify | 1 | claude-opus-5-5 | 1 | merging eight reports; live checks of energy, lives, pause, double buffer |
| 70-minisite | 3 | claude-opus-5-5 | 1 | three tabs, fighter-image gallery with mirroring, fight frame rebuilt |
| 80-retro | 1 | claude-opus-5-5 | 1 | kit edits and feedback |
| total | 36 | claude-opus-5-5 | | 0.6 h of work |

The one change to the kit that would have saved the most minutes:
recording a frame at orientation and tracing from every interrupt
handler it names, before the first coverage count.
