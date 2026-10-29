## 0.0.259 · 2026-10-28 · Zork I (Apple II) · air with Claude

- **A story is a part of the game, listed at its own addresses.** Zork
  I's interpreter keeps the story's first 72 pages in memory and reads the
  other 248 a page at a time, so no snapshot holds the story whole, and
  the game's listing had stopped at the resident pages. The story is now
  a virtual part, `parts/story`, read from its file: `kit/zmachine/map.py`
  lays out its header, tables, 359 routines and 411 strings from the
  story's own structure, and `listing.py` lists it through
  `kit/zmachine/cpu.py`, at five-digit addresses. The run described all
  78,566 bytes, and a sample of 80 of its comments found 10 wrong.
  `kit/skills/cpu/zmachine`, "Listing the story", has the commands, and
  `kit/skills/core/15-parts`, step 7, the kind.
- **A page that reads the story's resident pages needs both listings.**
  Splitting the story into its own part removed the game's single
  `listing.json`, which Zork I's pages fetched for the story bytes at
  $2C00-$73FF: the fetch failed, and so did `test_zork.js`. The pages now
  lay the story's listing over the interpreter's, from $2C00, before
  they read it.
- **A version 1 or 2 story file runs on past the story.** Its header has
  no length. Zork I's file is 81,920 bytes and the story's own bytes end
  at $132E5: zeros follow to $133FF, then $13400-$13FFF repeats
  $11400-$11FFF byte for byte, a stale 8 KB buffer written out again.
  Read as the story, the tail decodes as strings the story never prints.
  The part's coverage excludes it, and `map.py` stops where the exclusion
  starts (`test_listing.py`).
- **A string that opens with an abbreviation can decode as a routine.**
  Strings in Zork I read as short routines whose instructions decode and
  return. Infocom's compiler puts every routine before the first string,
  so past the first string `map.py` takes a routine only where something
  calls it.
- **An operand without brackets in `dec` is the number of the variable to
  lower.** In `inc`, `dec`, `inc_chk`, `dec_chk`, `load`, `store` and
  `pull` the operand names a variable, and a variable given as the operand
  is read first: the listing writes `[L06]` for the direct form. Zork I's
  DO-FIGHT has `dec L06` where it meant `dec [L06]`, so the rounds after a
  knockout never run down and every knockout kills the player. 28
  knockouts in 40 seeded games in Bocfel, 28 deaths in the same turn.
- **Names from a later release's source, only where the code matches.**
  Infocom's released Zork I source is release 119; the disk holds release
  15. The run compared each routine, global and object with the source's
  and took the name only where release 15 does the same job in the same
  steps: 347 of 359 routines, 131 of 138 globals, 246 of 255 objects.
  Release 15 differs in 12 behaviours the source fixes, each traced in
  release 15's code and ten seen in play. The listing's comments follow
  the disk, and `games/apple2/zork-i/original-source.md` says which
  release each name comes from.
