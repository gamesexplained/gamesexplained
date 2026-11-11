# Fist II: The Legend Continues — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`).

## Where it ran

A Claude Code cloud session on 30 September 2026: Linux x86_64, Ubuntu
24.04, no display, vice-mcp v3.13.1 release zip (56 of 57 checks,
`pause-at-instruction`), regenerator2000 0.9.20, pages checked in headless
Chromium through the preinstalled Playwright.

The Training program was added as a second part (`parts/training`) on 11
November 2026, in a Claude Code cloud session on the same kind of
container: vice-mcp release v3.14.0 (54 of 54 checks), regenerator2000
0.9.20, and `kit/cpu/cpu6502.js` for the loader's copy and the hand-over
picture. One agent annotated it; a second, which wrote none of it,
checked the sample.

## Skill text that changed what I did

- `50-coverage`: "Bytes no instruction reads may still be read.": nothing in Training reads `$D480`-`$DC3F`, under the I/O area, but the video chip fetches the fighters' extra sprites from it, so I included `$D000`-`$DFFF` in the part's coverage instead of leaving it out as unused.
- `tool-regen2000`: "`address` is for interleaved pointers, `lo_hi_address` for split tables.": auto symbols at `$627B` and `$AC47`, in bytes nothing reads, were the tell it names; the four pointer tables (pictures, colours, the computer's plans, the move scripts) were pairs, and retyped as `address` the stray symbols went.
- `60-verify`: "In a game of several parts search every part's listing": the two RTIs the sample found called unreachable in Training had both come from the Adventure's listing, so I read the Adventure's two (`$3C22`, `$3D8A`); they follow a jump there and are right, so only Training's were corrected.
- `50-coverage`: "Know how far a description reaches.": the packed picture of location 0 runs across `$4000` and a tune's pattern across `$0800`, so each got a second comment at the edge saying where the whole starts, and the ledger counted the bytes after it.

## What was changed in the kit

- `10-orient`: take an interrupt chain's handlers from a frame capture's
  writes to the vector, and trace from all of them. Here that found the
  music driver, which the entry and the vectors did not reach.
- `c64-reference`: `$D01E`/`$D01F`, the collision registers, were
  missing from the VIC-II table; one agent read `$D01E` as
  sprite-background from the brief, and another had to correct it.
- `kit/CHANGELOG.md`: an entry headed `## next`, which the kit-version
  workflow numbers after the merge (`[kit-bump]` in the pull request).

- `kit/scripts/carry.py` (Training part, 11 November 2026) flags two
  more kinds of carried comment for rereading, and `test_carry.py` holds
  both:
  - one that names an address outside the code paired, where the copy,
    in another folder, holds other bytes. The Adventure's music driver
    names its tune tables (`$FAD7`-`$FE43`) in 11 comments; carried to
    Training they kept those addresses without a word, and there those
    addresses hold other things. I corrected them by hand while
    annotating.
  - one on an instruction the code above runs into in one copy and not
    the other, or on bytes the source holds as data that the copy's code
    runs on into. Two comments carried from the Adventure called an RTI
    unreachable (`$32C3`, `$33F6`); in the Adventure each follows a jump,
    in Training each ends its handler. The sample found one and the
    search for its repeats the other. carry.py now flags both.

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

## Candidates

- **A loader's copy count decides what reaches memory, not the file's
  length.** The Silver run took the end of TNK4B's copy under the I/O
  area from the file's length and wrote `$D000`-`$FFF8` (the About tab,
  `orientation.md`); both loaders' copy loops move `$2FF0` bytes, so the
  copy ends at `$FFEF` and the last nine bytes of the file never reach
  the game. The step it belongs to is `10-orient`, where the loader is
  read; no other game's notes show it yet.

## Maintainer asks

This session cannot reach `gamesexplained/gamesexplained` to open the
pull request or file issues. The asks are in the pull request's
description under "Maintainer asks", for whoever merges it to file:

- **Say in `kit/START.md` what a hosted session attached to a fork can
  and cannot reach** (the same ask as the Doctor Who run).

Filed from the Training part's run, 11 November 2026:

- #869: Stop colour RAM writes splitting the ledger's spans in RAM under the I/O area
- #870: Warn in r2000.py --apply when a lo_hi_address table reads as pointer pairs

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

### The Training part, 11 November 2026

About two hours in one session, most of it `50-coverage`: one agent
annotating 58,291 bytes to 100 % in about twenty files of annotations,
after `carry.py` had brought over the comments on 1,765 instructions the
Training program shares with the Adventure. `60-verify`'s checker took
another sixteen minutes. The change to the kit that would have saved the
most is the one made here: `carry.py` flagging each carried comment whose
addresses or whose way in mean something else in the copy, since those
were otherwise found by reading, one at a time, and two of them only by
the sample.
