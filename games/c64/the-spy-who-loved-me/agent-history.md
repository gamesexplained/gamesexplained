# The Spy Who Loved Me — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

- 2026-11-17, one agent (Opus 5.5). The disk's `S1` is an Expert freezer
  image; the snapshot is taken at its resume, `$0A03`. The 2 KB at `$4000`
  is code at some moments and sprite shapes at others, so it became a
  second part over `main`. That needed a kit change: `parts.py` gave the
  overlay's range away from the bottom part even when the bottom part
  claimed it with `"ranges"`.
- Renaming labels inside a lo/hi address table merged two tables and made
  35 junk labels; a splitter at `$8F33` fixed it.
- Wrong turns corrected before publishing: instruments are 9 bytes apart
  (10 read), not 10; `$09D2` holds P before A; the spawn routines 0-3 are
  road obstacles, not vehicles; the weaving divers are on the sea bed;
  the "BASIC line at `$0801`" is zeros in memory, and the `SYS 2064`
  start is known from the frozen stack.
- Sections 2-4 were reached for screenshots by halting at `$0A94`, pushing
  `$0A93` and calling `start_section` (`$198A`) with X the section.
- The listing sample (seed 2617) went to one checker on claude-fable-5-2:
  14 of 60 wrong in a detail. The panel had been called extended-colour
  text; the code only uses that mode, with multicolour, to blank the
  strip above it. All 14 and their siblings (twelve spawn comments that
  called hit points "damage", two more on the panel) were corrected.
- The reader review (claude-fable-5-2, interrupted once by a usage
  limit and resumed) found three errors on the pages: hit_person does
  float a -50 sign, which explains Commodore Format's "50"; every stage
  start clears the sub capability and most weapons (`reset_car`), so a
  death costs more than the pages said; the car's frame row listed a
  blank frame. Those were fixed with the wording findings. The larger
  page ideas (animated frames, marked maps, speed bands, a screen
  section) and two leads needing a live test went to `TODO.md`.
