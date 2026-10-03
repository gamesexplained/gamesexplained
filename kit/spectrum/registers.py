#!/usr/bin/env python3
"""The ZX Spectrum's I/O registers by name, for the operands of the Source tab.

Empty on purpose. The C64's chips answer at addresses in RAM's range
(`kit/c64/registers.py`), so an instruction that reads `$D000` can be
shown as `vic_sprite0_x` and the listing has two meanings to choose from.
The Spectrum is port-mapped: the keyboard and border are read and written
through port `$FE`, the AY through `$FFFD`/`$BFFD`, and no chip has an
address in the image at all. An operand that names a port keeps its own
hex; there is no address here to rename, and an empty table says so rather
than leaving the next reader to wonder whether the ports were forgotten.

  kit/skills/spectrum/zx-spectrum-reference: the port map.

Usage: registers.py      print the table
"""

NAMES = {}

if __name__ == "__main__":
    print(f"{len(NAMES)} named registers: the Spectrum's are port-mapped, not addressed")
