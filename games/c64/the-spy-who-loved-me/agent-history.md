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
