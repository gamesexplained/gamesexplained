# Tycoon Tex — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "A widget that runs a mechanic is a claim too": every widget runs the game's own interrupts on the kit's 6502, and the engine was held to 419 frames of plus4emu traces, running and falling, and to its sound logs before a page used it.
- `60-verify`: "A negative result is a claim about your search": the first jump search said no break clears from speed 3 upwards; I widened the window of timings instead of publishing it, and the truth was the reverse.
- `70-minisite`: "each verified live, with the evidence beside it": the jump limits and a bomb's cost by the part cell were run in plus4emu before Discoveries said them, and both became sections.

## What was changed in the kit

- `kit/lessons/2026-10-21-tycoon-tex.md`: sweep a timing from before it can work to after it cannot; count a loop's passes by running it at its limits.
- `kit/scripts/build.py`, `site/source.html`: a game whose authors' source survives says what it shows of how the game was made in `original-source.md`, which the build renders as a section of the Source tab above the listing, `source.html#original-source`. The contributor asked for a section there, and the tab had no place for one. `kit/scripts/test_build_original_source.py` tests it, and `kit/scripts/check_docs.py` lets a game folder hold the file. `70-minisite` does not name it yet: the skill-edit bar wants a second game whose source survives.
- `kit/scripts/check_listing.py`, `kit/scripts/symbols_export.py`, `kit/skills/c16/c16-reference`: two bytes at BASIC's start that hold the link a BASIC line there has are named BASIC's in the listing, an error at Silver. The source showed `$1001`-`$1002` were BASIC's link, not the skyline's pixels, and nothing in the graphics could tell. The check found one more, Alter Ego's BASIC line at `$0801`, now named. `kit/scripts/test_check_listing_basic.py` tests it, and `kit/lessons/2026-10-21-tycoon-tex-basic.md` records it.

## Candidates

- **A sweep of timings that starts too late reports "never".** The first
  search for jumps that clear a break began after the window had opened
  at the higher speeds, so it found no clear at speed 3 and up. It was
  caught because the result made no sense next to the demo, which clears
  breaks at speed 5. `60-verify`, "Negative results", would gain a row:
  "the jump can never clear that gap" | "every try began after the
  window had opened". No other game folder shows the same mistake yet.
- **A page's class can collide with the site's.** A table cell given the
  class `pick` took `site/lib/site.css`'s `.pick` (the stepper's flex
  layout) and broke the table; a screenshot showed it. Prefix a page's own
  classes (this run used `tt-`). It showed itself, so no skill edit.

## Maintainer asks

- #449: kit/c16: Give pages a model of TED's registers for running a game's own code

## What cost the most time

A model of TED's registers that a page can pass to the kit's 6502 (#449) would have saved the hour spent writing and debugging the one in `reference/tex.js`.

## Operating system and tools

Linux (Ubuntu 24.04) on x86_64, in a hosted container. plus4emu 1.2.11 at
git 939e652 with `kit/c16/codemap.patch`, built without libsndfile;
regenerator2000 0.9.20; Python 3.13.16; Node 22 with the container's
Playwright and Chromium for the browser checks. The install notes were
right as written.
