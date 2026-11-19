## 0.0.341 · 2026-11-14 · Mike Read's Computer Pop Quiz (C64) · Nico-van-der-Zijden with Claude

- **Let the game's own text builder be the extractor.** The quiz keeps
  1,275 questions as compressed records (plain bytes, and `$80` + n for
  a word of a list), with wrong answers borrowed from other records and
  a separate builder for the clue rounds. Rather than write a decoder,
  the run set the question number in zero page and called the game's
  builders on the kit's 6502 over each block's snapshot, once per
  record, and read the text from the buffers they fill. Every question
  and clue came out as the game shows it, quirks included (its spaces
  inside quotation marks, the capital it forces on the first letter),
  and a test beside the page builds block 1 again from the listing the
  same way. A decoder would have had to rediscover each of those rules
  and could still differ in one nobody noticed
  (`games/c64/mike-reads-computer-pop-quiz/test_questions.js`).
- **Run a drawing routine before naming what it draws.** The listing
  called 63 tiles and the routine that places them "the screen's
  frame", and the Graphics tab's first draft drew the tiles as a sheet
  under the heading "The pink pipes round the screen are 63 tiles", in
  colours that matched nothing on the screen. Run on the kit's 6502,
  the routine drew the speech bubble's rounded outline; the pipes are
  part of the title picture. A label written while annotating is a
  guess about purpose; the routine's output is the evidence, so draw
  it with the game's code before a section is titled from the label.
- **Try a turbo format with a checksum before one without.** The tape
  reader takes its formats in turn, each from the stretches the earlier
  ones left. A format with no checksum (pages after a run of 0 bits and
  a 1) found about 220 false blocks in this cassette's Novaload files,
  which open the same way, because nothing told it they were not its
  own. Novaload's header checksum rejects a stretch that is not
  Novaload, so it goes first, and a format is added with the tapes the
  kit's game folders hold read again beside it (`kit/c64/tap.py`,
  `kit/c64/test_tap_novaload.py`).
