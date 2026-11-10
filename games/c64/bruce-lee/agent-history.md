# Bruce Lee — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 2026-11-10, Bronze run (claude-sonnet-5-5)

- The disk's one file is a Remember crack. The memory image never matches the file at its load address, because the file is packed; the stub copied to `$00F0`-`$01EF` unpacks it. Searching the file's 16-byte pieces in the snapshot found only that stub.
- The key presses to get past the front end took five tries. The intro and the text page both wait on keys the screens do not name: fire on port 2 leaves the intro, and RUN/STOP leaves the text page (read from the code at `$2FA2`: `$DC01` against `$EF` and `$7F` with column 7 selected). `Escape` is the key name vice-mcp takes for RUN/STOP.
- The hand-over was found by reading the trainer's code at `$C60C` while its prompt was up, then putting a stopping checkpoint on `$0400` and answering `N` to both questions.
- A hundred seconds of random joystick input from the play snapshot ran 8,317 bytes of code, almost all of it room one's.

## 2026-11-10, Silver run (claude-opus-5-5)

- The coverage pass rewrote the Bronze run's comments as it went. Several
  were wrong and are recorded only here: `$50DB` is `screen_on`, not a
  high-score check; `$7C` is the character set's page, not a sprite bank;
  the outline shapes sit at `$9000`-`$9FBF` and `$C000`-`$CA7F`, not
  `$9000`-`$B75F`; the room decoder's two kinds of byte were the wrong way
  round; and the left-handed flags were inverted (1 is right-handed).
- `$1166` looked like the RTS of `random` and is a check byte after it.
  The fuse in the jump sound burns only while it or `$2007` is zero; in
  this copy `$CF79` XOR `$CF99` is `$89` and `$2007` is 4.
- The video setting recorded at Bronze, screen `$9C00`, was wrong:
  `setup_screen` puts the screen at `$8C00` and the characters at `$A000`.
- The sample (seed 2611) found 16 of 60 comments wrong. Each finding was
  read against the code before it was counted; all held. Corrected with
  the other comments that said the same things (`ann/a13`, `a14`).
- Checking the key comments against the keyboard matrix while writing
  the Controls tab showed the keys read in play are F1, S, SPACE and V,
  not RUN/STOP and the function keys. Drawing the frames for the Graphics
  tab showed that `copy_shape`'s second loop copies wide frames; it is not
  a mirrored copy, and each facing is a frame of its own.
- The extra-fall test was run with the game's own `add_score` in the
  kit's simulator, which is how the byte-by-byte comparison was found.
- Reviews: the web search found scores only (MobyGames, C64-Wiki); the
  ZZap!64 site refused the fetch.
