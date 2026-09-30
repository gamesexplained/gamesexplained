# A View to a Kill — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 30 September 2026, the Silver run

- The disk is a crack: a BASIC menu and five packed files. Each file was
  autostarted by name after a hard reset and stopped at the packer's jump
  into the game. Running each packer in `kit/c64/cpu6502.js` over memory
  filled with `$00` and then `$AA` showed that files 1 to 4 write all of
  memory from `$07E8` and file 5 only `$0800`-`$80FF`. Without that, the
  finale's stale half (bytes like Paris's code) would have been read as
  the ending's own.
- The kit had no notion of a game made of several programs, so the run
  added one (`parts/`) before annotating. Five agents, one per part, each
  had a disassembler of its own in a separate network namespace.
- The brief guessed that the codes might carry a result from play, or be
  the crack's addition. Every agent found the code shown at its end to be
  fixed text, and the flag `$1BA0` read once, at the end. That turned the
  question round: the prompt is not a level skip, since without the code
  City Hall and the mine cannot be won. Tested live by setting the state
  and running the end tests.
- City Hall's agent traced a branch into the middle of an instruction on
  a burning room; setting Bond's room on fire in the emulator confirmed
  it, down to the undocumented `SLO`'s write.
- The intro's credits race was suspected from the code and caught once in
  four boots started a tenth of a second apart.
- Paris once seemed to start stuck after fire was held for a second.
  Held for 1.2 s in a second try it started normally, so the orientation
  now says only what was seen, and it is listed as open.
- The mine's agent put ILVCT one byte late (`$0AFF`); the image has it at
  `$0AFE`-`$0B02`, and the symbol was moved.
