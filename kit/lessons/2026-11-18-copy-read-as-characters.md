## 0.0.355 · 2026-11-18 · Super Wonder Boy in Monster Land (C64) · 64kramsystem with Codex and Claude, reviewed by air with Claude

- **A routine that copies a block says nothing about what the block
  holds.** Each of the game's 31 loads copies eight pages (2,048 bytes)
  into character memory, and the run described every eight bytes of
  each copy as a character: 9,526 notes. The copy runs on past the
  load's own shapes, over its compressed screens, tile definitions,
  sound patterns, records and messages, and 5,060 of those notes were on
  them. Running the game's screen loader at `$7130` in the kit's 6502
  for every load and selector gave the bytes it reads, and found every
  one (#963). `50-coverage` now says a copy is no reader of what it
  moves.
- **A checker passes a note when every fact it states holds.** Two
  samples on gpt-6-astra found 1 wrong in 60 and 1 in 80. A third, on
  claude-fable-5-2, found 17 in 80, and 15 of them were these notes:
  true that the copy moves the bytes, silent about what they are. The
  third checker read the notes around each address; the brief did not
  ask it to. `checker.md` now asks what data is, from the listing's other
  notes on the same bytes and the routine that reads them (#968), and
  `sample.py` draws five notes of each large template side by side, so
  the checker sees them together.
- **Filler makes a listing long and still reads as explained.** The
  listing had 32,319 notes, one for every 15 bytes where the typical
  game on the site has one for every 51. Seven notes in ten ended with a
  use left open ("Display use and other possible code uses remain
  open"), and about half told how the run had checked ("A controlled
  resource load copied them ... in a 200-frame capture"). The next game
  was at 5.7 % and 0.2 %. `check_listing.py` now names a game past 20 %
  or 10 % (`listing_shape.py`), and `50-coverage` says where the run's
  checks and its open questions go.
