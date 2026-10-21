## next · 2026-10-21 · Uridium (C64) · air with Claude

- **Count typed data whether or not a label reaches it.** The ledger
  counted data only inside a label's span, so data typed with no label
  over it was neither explained nor bare: coverage read 100 % and the
  listing kept a gap with none of its bytes. A scan of every Silver and
  Gold game on 20 and 21 October 2026 found about 14 KB of it in 27
  games, from a call's inline arguments to whole tables past their
  label's 64-byte reach. Uridium's 544 bytes were the
  bottom halves of its status font, which start-up builds into the
  character set, so the check for data copied after the hand-over did
  not see them either. The ledger now counts such data as bare, so the
  work queue asks for it (#442).
- **A comment explains the bytes it sits on.** Runs on those games had
  written 123 line comments on bytes no label held, and the ledger dropped every
  one: the listing showed the comment with none of the bytes it
  described. Uridium's said its eight bytes at `$16B4` were never
  reached. They decode as four instructions that run straight into
  the routine both its branches enter, after them: the routine's own
  unused start. A comment on bytes no label reaches now owns them as
  a label there would.
