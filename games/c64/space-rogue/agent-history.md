# Space Rogue — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 14-15 October 2026, orient

- Two clean boots out of two froze at "Old or New Game?" with the raster
  interrupt dead. The interrupt's raster compare routine reads `$D011`,
  keeps the beam's current bit 8 and writes it back with the new line, so
  a compare written while the beam is below line 255 aims past the bottom
  of the PAL frame and never matches. Clearing bit 7 of `$D011` from the
  monitor brings it back each time; `work/scripts/sr.py` (`unstall`) does
  it whenever the interrupt counter `$3D` stops moving.
- The loader is the KERNAL's own LOAD, wrapped at `$1765`; a checkpoint on
  its `JSR $FFD5` at `$177A` logged every load with its name and
  destination (`work/loads.jsonl`), which gave the overlay map.
- Flying the docking by screenshots did not work: after lining up with
  A/D/W and S the ship flew through the starbase's open frame without a
  collision. The docking routine `$7094` was found from the `SEG1` name in
  the file name table (`$07EE`, loaded by `$1507`, called from `$70B0`),
  and called directly from the top of the flight loop (`$3102`). The same
  trick with the base number set to 9 gave the ending, and the base's
  tile-action handler `$AAD6` gave Hive!.
- A first try to catch the intro's entry compared the 16 bytes at `$6800`
  on every stop there and missed it; a checkpoint on the title's own
  `JMP $6800` after its `INTRO` load (`$2F71`) caught it.
