# Thrust — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier: Bronze

Coverage 15.9 % (2,675 of 16,817 tracked bytes). The run stopped after
`40-sweep`, as a Bronze run does. To reach Silver, continue from
`50-coverage` (start the disassembler on `work/play.vsf`; the launcher
rebuilds the project from `symbols.json`):

- Describe the rest of the program to 100 %. Largest bare runs:
  `$AF90` (810 bytes), `$9926`, `$9014`, `$9E77`, `$869F`, the sound code
  at `$9B58`, `$9799`, `$AB26`, `$858E`, `$A38E`; data at `$583F` (961
  bytes) and the five raster handlers' bodies.
- Decode the start-up code at `$B773`-`$BA72`, which is assembled for
  `$0400` and so cannot be traced in place.
- Say what the data the ledger does not count is: `$0F44`-`$2FFF`,
  `$3003`-`$3FFF`, `$4D00`-`$52FF`, `$BE96`-`$CFFF`, `$E008`-`$E63F`, the
  RAM under the I/O, and the tables copied to `$4000`-`$4CFF`
  (`listing.py` prints the list).
- What `$3000`, run once in the code map, is.
- Then `60-verify` (`facts.md`, a checked sample) and `70-minisite`.

## Open questions for the code

- What sets `$63`, and how the attract mode's pilot is steered.
- Who calls `show_bbc_keys_page` (`$B74B`), if anything.
- What RUN/STOP does (`$B269`, `$B3E0`).
- How the status bar's FUEL, LIVES and SCORE are drawn.
- Whether the levels, the reversed gravity and the invisible landscape
  are all in this one load (no reloading was seen).
- The C64 wording of the messages after levels 24, 48 and 72.

## Article ideas

- The BBC Micro key page the C64 program kept, shown as the BBC would
  draw it in MODE 7 next to how the C64 would print it.
- The pod on its rod: the physics, with a widget to swing it.
- The level cycle: six planets, then reversed gravity, invisible walls,
  and both.
- Rob Hubbard's music, with a player.
