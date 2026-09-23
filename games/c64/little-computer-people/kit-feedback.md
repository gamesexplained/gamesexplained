# Little Computer People — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). What the skills and
kit got wrong or left out, what was changed, what needs a maintainer's
decision, what took longest, operating system and tool versions.

## Notes gathered during the run (to finish in the retro)

- `tools.py use-vice` crashed on a fresh clone with no `tools/` folder:
  fixed in `kit/c64/tools.py`.
- The C64 coverage defaults exclude `$D000`–`$DFFF` as I/O; this game runs
  code in the RAM under it. Added `coverage.include` to
  `kit/scripts/symbols_export.py`.
- regenerator2000's `search_disassembly` matches mnemonic and operand
  separately, so "jmp (" finds nothing; a script over the snapshot was
  needed to find indirect jumps.
- The C64 reference has no keyboard matrix table; the game scans the
  matrix itself and `:` has no key name in the tool.
- A game that scans the keyboard from its main loop drops short matrix
  presses; holding a key until the game's own key variable changes is
  what works.
- The inline-parameter section of `50-coverage` describes a call that
  returns after its argument. This game's switch never returns: the
  table runs up to the next site.
- `tools.py status` records a local path; the public commit of the
  contributor's build is the reproducible form.
- From one snapshot the game is deterministic, including its random
  choices, which makes input experiments clean but means the person's
  next free choice after any interruption is the same in every run.
