## next · 2026-11-11 · Stop the Express (Plus/4) · jankfoundry

- **An address does not say which memory an instruction came from, so a
  code map on a machine that pages ROM over RAM records the source at the
  fetch.** The game pages the Plus/4's ROMs out to play its title music,
  and runs the sequencer at $9FF1 and the output at $A070 from the RAM
  beneath them. The code map counted by address, so those instructions
  and the KERNAL's own, which run at $8000 up in every game, were one
  record, and the dump left out the whole half rather than keep the
  KERNAL's code as the game's. The run wrote an exporter of its own to
  keep them. plus4emu's opcode fetch now also counts, apart, each one
  read from RAM at $8000-$FFFF (`kit/c16/codemap.patch`), the server
  names those addresses `under_roms`, and `kit/c16/codemap.py dump` keeps
  them (`kit/skills/c16/tool-plus4emu`, "What ran").
