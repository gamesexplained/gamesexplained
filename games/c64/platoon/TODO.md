# Platoon — TODO

Tier: Bronze. Coverage 10.5 % of load 1 (3,041 of 28,890 bytes), one of
four parts analysed.

## For Silver

- Load 1: run `30-text` on the character set at `$4800` (the credits and
  panel words), then annotate the rest of the program to 100 %
  (`50-coverage`). Largest bare blocks: `$B000`, `$E395`, `$C62C`,
  `$2FD0`, `$BAFC`.
- Say what the RAM under the I/O chips holds: OVL1 loads `$D000`-`$DFFF`
  and play rewrites `$D000`-`$D7FF` (`listing.py` lists it).
- Loads 2 to 4 (`parts/load2` to `load4`): reach each through the game's
  own disk turn (play load 1 to its end, or find the section variable and
  call the load at `$3DDE`), save a hand-over and a play snapshot each,
  and say which of the film's sections each holds.
- Compare the four loads for anything resident and set `over` and
  `ranges` if any is.
- Test the controls the manual names, the P and G keys, RUN/STOP, and
  what `$2CB7` does when the ZACH1 cheat skips it.
- What opens the CHOOSE YOUR MAN panel.
- Read the C64-Wiki page and a manual directly: this run saw them only
  through search summaries. Reception: C64 reviews only.
- `60-verify` and the minisite (`70-minisite`).
