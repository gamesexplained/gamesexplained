## 0.0.340 · 2026-11-13 · Short Circuit (C64) · Nico-van-der-Zijden with Claude

- **A run's own samples on an unproven model said one comment in five
  was wrong; an audit on a proven model found two in five.** The first
  run of this game, on a model not on the proven list, sampled its
  listing twice with that same model: 12 of 60 and 5 of 28 wrong. A full
  audit on claude-opus-5-5, each address range given to a checker that
  wrote none of it, then marked 454 of the 1,146 comments wrong (424 in a
  detail, 30 in their main claim). The worst range, the music driver's
  per-voice variables, had 156 of 286 wrong: writer lists that missed the
  tunes' own commands, which copy bytes into the variables by index. So a
  self-sample on an unproven model is not a rate to quote, and the audit
  `kit/CHECKING.md` asks for is the measure.
- **A drawing test that compares screen codes passes with the wrong
  font.** The Maps tab drew part one's laboratory with the character set
  the panel uses, and its test, which found the recorded frame's screen
  codes in the drawn strip, passed. The frame's own `$D018` named the
  other set. A drawing's test now takes its sources from the recorded
  frame's registers (`kit/skills/core/70-minisite`).
- **A turbo tape can be pages with no addresses beyond a page number.**
  Ocean's 1987 loader reads a lead-in of 0 bits, one 1, then pages of a
  flag byte, a page number and 256 bytes until page 0, a bit per pulse
  split at 480 cycles. The flags drive the loading picture and tune.
  `kit/c64/tap.py` reads it as the row "pages after a 1 bit"; on Short
  Circuit's cassette all 275 pages decoded, and every page of the game
  equalled the listing.
