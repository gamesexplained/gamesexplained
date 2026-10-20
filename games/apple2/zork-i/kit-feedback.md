# Zork I — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "Give them a stratum of their own": the 597 comments the story decoder wrote got 20 draws of their own beside the 60 hand-written, and the rate was reported weighted, 4.1 % beside the plain 8.75 %.
- `50-coverage`: "go through that list and say what each stretch is": the story's resident 18 KB, which nothing in the 6502 code names, went into `coverage.extra` and got its comments, and the text past $2000 that `listing.py` named got labels, before 100 % was claimed.
- `10-orient`: "Nor is data the game fetches into a buffer during play": the 76 page buffers were left out as runtime state and no part was made for the story's pages; it also hid the paged two thirds of the story from the count, which is #428.
- `70-minisite`: "A page never carries a processor of its own": the Discoveries calculator runs the interpreter's own divide on the site's 6502 (`C64Cpu`) instead of a copy of the routine in the page.

## What was changed in the kit

- `site/lib/apple2.js`: `Apple2.load`, which rebuilds the game image from `listing.json` as `C64.load` and `BBC.load` do (embedded listings and `?listing-reads` included), and `Apple2.text`, the text page as letters and inverse. The Apple II library had no loader, so no Apple II page could draw from its listing.
- `kit/apple2/test_text.py`: holds `Apple2.text` to `kit/apple2/screen.py` for every byte value, in 40 and 80 columns, both character sets and page 2.
- `kit/skills/apple2/steps`: the `page` row names `Apple2.load` and `Apple2.text`, and the `frame` row says the text is read with `Apple2.text`. A path, so no lesson.
- `kit/lessons/2026-10-19-zork-i.md`: the run's lessons.
- `site/status.json`: the Apple II on Linux cell's note adds that Zork I went through the kit on it, dated. Its state stays `limited` for a maintainer to judge.

## Candidates

- **A size a caller passes is a test too.** Zork's story tells the
  interpreter it may write 120 words into a parse buffer with room for
  59, and the 60th word writes over the next buffer's size, which leaves
  the game reading one letter of every line. Nothing in the code is
  wrong locally: the interpreter honours the limit it is given. It was
  found by typing lines of commas live, not by reading. `60-verify`,
  "What a test lets through", would say: for every limit one routine
  hands another (a count, a length, a buffer's size), compare it with
  the room the buffer actually has. I could name no other game folder
  where it would have mattered (`kit/lessons/2026-10-19-zork-i.md`).
- **A published disassembly of the same program.** `40-sweep`, "A
  documented version on another machine", says to map a published
  reconstruction onto the image before reading code. It speaks of
  another machine, and this run did not think of it for Eric Smith's
  a2zip, a disassembly of this very interpreter on this machine. It read
  the 26 pages by hand instead, which cost about half an hour and no
  facts. The section could say "on another machine, or this one". No
  other game folder had a published disassembly of its own version.

## Maintainer asks

- #428: Count the game code an interpreter reads from disk during play, so a Z-machine story's paged 62 KB is not left out of a 100 % figure.
- #429: Add a shared Z-machine decoder for Infocom games, in `kit/` and `site/lib/`.

## What cost the most time

Writing a Z-machine decoder from nothing, first in Python for the
listing's comments and the story's routines and then in JavaScript for
the pages, cost the most; a shared decoder (#429) would have saved most
of it.

## Operating system and tools

Linux 6.18 x86_64 (Ubuntu 24.04, no display), Node 22.22.0, Python
3.13.16. Apple2TS 3.7.0 (git c900979) in the kit's server, 42 of 42 checks.
regenerator2000 0.9.20 in its Apple II mode. The server stopped while the
session waited about 45 minutes for the contributor's answers, and
`tools.py apple2ts` started it again; its log, started afresh, kept
nothing of why (`agent-history.md`).
