# Speedball — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "A widget that runs a mechanic is a claim too": I wrote `test_rules.js` to hold the Discoveries widgets to the game's routines, and it found the tackle-pair count and the knockout count wrong on the page, in `facts.md` and in `features.md`.
- `70-minisite`: "Sweep the whole input space, not a few plausible values": the slide test tries every random byte and the knockout test 200 seeds over the whole range, which turned up the draws with only eight wrong rounds.
- `60-verify`: "Both the sample and the audit are done by checkers: agents that wrote none of the comments": a fresh agent sampled 60 comments and found 11 wrong that I had read past.

## What was changed in the kit

- `kit/c64/INSTALL.md` and `kit/c64/tools.py`: none. This run made the disassembler's install `cargo install --locked ...`, because a plain install of regenerator2000 0.9.20 took a 0.9.21 library and failed to compile (E0308 in `main.rs`). Two other runs on 30 October 2026 had already put the same fix on main, so this branch took main's text.
- `kit/cpu/m6502.py`: `ANC #imm` (`$0B`) is in the undocumented opcodes the listing decodes, with a case in `kit/scripts/test_listing_undocumented.py`. The game's timer check (`LAX abs`, then `ANC #imm`) was listed as data before. A script fix, so no lesson.
- `kit/lessons/2026-10-30-speedball.md`: a bug in a table that two routines share is tested by running both routines together.

## Candidates

- **A widget built from the tables repeats the reader's mistake.** The
  tackle check's pair tables were read by hand: the reader took the
  measuring routine to write through the right list of cells and only
  the checking routine to read through a list 13 bytes early. Both go
  through the early list. The first widget worked its grid out from the
  same tables, so it showed the same wrong count (34 of 45 pairs where
  13 is right), and nothing disagreed until the test placed each pair
  touching and ran both routines. A skill would say, in `70-minisite`
  under "A widget that runs a mechanic is a claim too": when a claim is
  that one routine misreads what another writes, the widget and its test
  run the writer and the reader together, never a model of the two made
  from their tables. No other game folder is named for it yet.

## Operating system and tools

Ubuntu 24.04.5 in a Claude cloud container, x86_64. The vice-mcp
v3.14.0 release passed 57 of 57 of `check-emulator`'s checks after the
nine libraries `kit/c64/INSTALL.md` lists were unpacked into
`tools/vice-libs`. regenerator2000 0.9.20 built with `--locked` (above).
node 22.22.0; the container's Playwright and Chromium ran
`kit/scripts/shoot.js`.

## Maintainer asks

None.

## What cost the most time

Writing the pages' tests before putting counts into `facts.md` would
have saved the most: the two counts the tests corrected had already gone
into `facts.md`, `features.md` and the Discoveries copy from a reading of
the tables and a sample of seeds.
