# Bruce Lee — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 2026-11-10, Bronze run (claude-sonnet-5-5)

- The disk's one file is a Remember crack. The memory image never matches the file at its load address, because the file is packed; the stub copied to `$00F0`-`$01EF` unpacks it. Searching the file's 16-byte pieces in the snapshot found only that stub.
- The key presses to get past the front end took five tries. The intro and the text page both wait on keys the screens do not name: fire on port 2 leaves the intro, and RUN/STOP leaves the text page (read from the code at `$2FA2`: `$DC01` against `$EF` and `$7F` with column 7 selected). `Escape` is the key name vice-mcp takes for RUN/STOP.
- The hand-over was found by reading the trainer's code at `$C60C` while its prompt was up, then putting a stopping checkpoint on `$0400` and answering `N` to both questions.
- A hundred seconds of random joystick input from the play snapshot ran 8,317 bytes of code, almost all of it room one's.
