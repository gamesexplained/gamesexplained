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

## 15 October 2026, annotating the title, the intro and the ending

- The hang noted at orient was first put down to the interrupt's raster
  setup. That routine clears bit 8 correctly (`setup_irq`, `AND #$7F`);
  the bit is set afterwards by `bitmap_mode`'s `LDA $D011 / ORA #$20 /
  STA $D011`, which writes the beam's line bit 8 into the compare.
- `parts/title/work/prompt.vsf` was described as the "Old or New Game?"
  prompt. It is the title's lift-off, mid-climb: the prompt belongs to
  `INTRO`, which the title loads only after a key. `orientation.md` is
  corrected.
- The title, the intro and the ending carry the same library at three
  addresses (the title without the wipes and scrolls); a relocation-aware
  compare mapped the intro's
  annotations onto the other two, which were then reworded for each.
- The second sound in the effect player, silent in the intro and the
  ending, is the title's engine roar: the title sets its mask and raises
  its target note at every step of the lift-off.


## 15 October 2026, verify

- Writing facts.md found the flight keys read for the C128: `key_flight_mode`
  was put down to the C128's HELP key, which gives nothing on a C64;
  `key_chars` shows that F7 gives `$1F`, the code beside CTRL-E, and F1
  gives ESC. The same reading found that the speed comes from the
  joystick in port 1, the steering and fire from port 2.
- The Codex sample marked 9 of 60 wrong. The pause routine had been read
  as counting down from its caller's A, from the loop alone; the
  `clear_key` call above the loop sets A to `$FF`, so every pause is the
  same. The zero-page bytes the model drawer uses had been named for it
  alone; listing every routine that touches each one showed 18 shared
  with the beam, HELM, QUERY, the AI and the station.
- `random_upto` (`$A298`) is inclusive, so a call with 100 gives 101
  outcomes; three comments had counted 100.
