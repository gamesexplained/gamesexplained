# Flowers Of Crystal — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "A widget that runs a mechanic is a claim too": every widget's routine was ported and held against jsbeeb before it went on a page (the flower and the map byte for byte, the game's own PROChaz run 12,000 times, all 56 journeys), and five `test_*.js` files beside the pages keep them there.
- `70-minisite`: "open each built page with `?listing-reads` after its address": a script clicked every button and stepped every menu on the three pages, and the report named no byte the pieces left out.
- `60-verify`: "Read every comment it marks wrong or doubtful against the code yourself": the checker's one doubtful mark turned out wrong when read against the program, so the sample counts six wrong, not five.
- `60-verify`: "Any claim that can be tested in the emulator in under a few minutes gets tested": the river's flag across a fresh start, the 19th `Map`, the LIST guard, Fibber's detector, the Fright Freak and `END` were all played in jsbeeb before they reached the Discoveries tab.

## What was changed in the kit

- `kit/lessons/2026-10-24-flowers-of-crystal.md`: two lessons, on reading every line of the same shape before calling one special, and on a table read by an index.

## Candidates

- **A table read by an index is not a list of outcomes.** The Maps tab's
  first spells table showed part 2's three next-place DATA lists, one
  value for each of the ten places, as where each spell leads. Most
  entries are never read, or are overwritten by the place's own line
  after the spell. Nothing failed: the table drew, and every value was
  the game's. It was caught while looking at the screenshot and reading
  lines 10035-10062 to write the caption. A `70-minisite` bullet, beside
  "Every claim shows its evidence", would say: before a widget shows a
  table entry as an outcome, find the code that reads that entry and
  what runs after it. No other game folder could be named for it.
- **One line's shape, read in its siblings.** The Discoveries draft said
  only the sky spitter's "You are safe." came through another `IF`'s
  `ELSE`; the storm's and the cave's lines are built the same way. It was
  caught in the copy pass. A `60-verify` bullet would say: a finding
  about one line's or routine's shape names the others of that shape, or
  says there are none. No other game folder could be named for it.

## Maintainer asks

- #537: Add a script that screenshots each section of a built game page

## Operating system and tools

A hosted Linux container (6.18, x86_64) with no display; jsbeeb 2.4.0 in
the kit's server and regenerator2000 0.9.20, as `game.json` says. Both
installed and ran as `kit/bbc/INSTALL.md` describes. Playwright's
Chromium, already in the container, served for the browser check.

## What cost the most time

A script that screenshots each section of a built page, scrolled into view, and prints the console and the `?listing-reads` report (#537) would have saved the most.
