# The Detective — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 1 November 2026: Bronze, claude-opus-5-5

- The T64's directory has two entries; the second, `DETECTIVE DOX`, is
  the crackers' instructions. Its text types itself out with deliberate
  mistakes and `$14` (DEL) bytes to correct them; applying the deletions
  to the stored bytes gives the clean text at once.
- The game is packed three times. A stopping checkpoint on `$BD0A` set
  before the load fired inside BASIC's ROM while it read the `SYS`
  number; stopping first on `$0812` (RAM only) and arming from there
  worked. The exit of each stage is code the stage before unpacked, so
  reading one stage's exit and arming it missed the next. What found the
  game's entry was an execute checkpoint over `$0900`-`$CFFF`, re-armed
  around each stub it stopped on: the fourth distinct stop was `$2000`.
- A script named `dis.py` in the working folder shadowed Python's
  standard `dis` module, which `vice.py`'s imports load, so every script
  ran it first and printed its output. Renamed, the problem went away.
- The emulator's snapshot folder already held an `entry.vsf` from another
  game; saving under that name was refused and the copy step picked up
  the old file. The hand-over was saved again as `detective-entry` and
  copied over it.
