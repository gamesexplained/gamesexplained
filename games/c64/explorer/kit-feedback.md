# Explorer — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "A wrong comment is usually one belief written down more than once": the checker's "white stones" at `$83E8` came from a picture renderer of mine that painted the keep-the-colour cells (`$28`) white; the search found the same belief in seven more picture descriptions, and all were corrected after every picture was drawn again with the game's own `draw_image`.
- `c64-reference`: "Many disk images in circulation are not the release but a freezer backup": the TOSEC image's `RTI` into `$08F7` was read as a backup, so the listing's snapshot was taken at the release's own entry, `$0803`, found from the loader and the frozen stack, and the start-up code is in the listing.
- `70-minisite`: "A widget that runs a mechanic is a claim too": the four ports on the two pages (the terrain, the name sums, the doorway's energy sum and the bearings) each got a test against the game's routine on the listing's bytes before going on a page.
- `60-verify`: "Report it as a lower bound on the true rate": `facts.md` and the pull request give 8 of 60 as what the checker found, and recommend the audit.

## What was changed in the kit

- `kit/lessons/2026-10-31-explorer.md`: this run's three lessons. No skill was edited, because no other game folder shows the same failures; they wait under Candidates.

## Candidates

- **Describe a picture from the game's own drawing code.** Picture
  descriptions written from a renderer the run wrote itself took the
  renderer's guess at what an attribute means: cells that keep the colour
  already on the screen were painted white, and eight comments described
  white stones and pale trunks that the game never shows. The checker
  caught one, and drawing every picture with the game's routine on the
  kit's 6502 caught the rest. A skill would say, in `50-coverage`: when a
  comment says what a picture looks like, look at it drawn by the game's
  own routine on the listing's bytes, never at a decoder's rendering.
- **A comment corrected between the sample's draw and the check.** The
  run read the 60 drawn comments before handing them to the checker, saw
  that two numbered the fragments from 0, and corrected them; the checker
  then read the corrected text. That makes the measured rate look better
  than the listing was, and nothing would have shown it. They were
  counted as wrong once noticed. A skill would say, in `60-verify`: draw
  the sample after the last edit and hand it over unread; a drawn comment
  changed before the check counts as the draw found it.
- **A share or a frequency on a page from an unrecorded measurement.**
  "About one cell in 154" for the doorways, and "nearly all in jungle",
  were on the page and in `facts.md` with nothing behind them; the game's
  own terrain routine, on 150,000 cells, gives one in 255 and a third on
  open ground. A skill would say, in `70-minisite`: measure every share
  the copy states with the tested port or the game's routine, and record
  the sample's size in `facts.md` beside it.

## Maintainer asks

- #657: Add a kit script that draws the listing sample and checks the checker saw the drawn text

## What cost the most time

A script that draws the sample and holds the checker to the drawn text would have saved the most, because without it the run had to reconstruct from its own transcript which comments changed after the draw.

## Operating system and tools

Linux x86_64 cloud container (Ubuntu 24.04.5, four cores, no display), VICE 3.14.0 (x64sc, PAL) from the vice-mcp release, regenerator2000 0.9.20, Python 3.13.17, Node 22.22.0. `check-emulator` passed 57 of 57. A snapshot saved under the name `entry` clashed with an older saved snapshot of the same name in the emulator's own snapshot folder; loading it by full path from a copy with another name worked.
