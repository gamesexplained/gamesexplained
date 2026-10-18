#!/usr/bin/env python3
"""The NES's I/O registers by name, for the operands of the Source tab.

The PPU answers at $2000-$2007 and repeats every 8 bytes up to $3FFF; the APU and the I/O
registers (the controllers and the sprite DMA) are at $4000-$4017, and $4018-$401F is the
CPU's test mode, normally disabled (kit/skills/nes/nes-reference, "Memory map"). No RAM lies
under any of them, so an operand there always means the chip: symbols_export.py's
PLATFORM_DEFAULTS gives the NES an "io_only" range, and listing.py names every operand in it
after the register.

The names are the ones regenerator2000 0.9.20 gives the same addresses in its NES mode
(regenerator2000-core, assets/systems/system-NES.toml), so the session and the listing agree,
with two changes:

  * $4014 is OAMDMA, as the NESdev wiki and the reference name it, where regenerator2000
    has OAM_DMA;
  * $4017 is JOY2_FRAME. Read, it is controller 2; written, it is the APU's frame counter
    (kit/skills/nes/nes-reference, "Sound: the APU"), and nearly every game writes it at
    reset. regenerator2000 calls it JOY2, which reads wrongly on the store.

$4009 and $400D, which do nothing, have no name, nor has any of the PPU's repeats: an
operand on one keeps its address, so the listing shows the address the code uses.

Usage: registers.py      print the table
"""

NAMES = {
    0x2000: "PPUCTRL", 0x2001: "PPUMASK", 0x2002: "PPUSTATUS", 0x2003: "OAMADDR",
    0x2004: "OAMDATA", 0x2005: "PPUSCROLL", 0x2006: "PPUADDR", 0x2007: "PPUDATA",
    0x4000: "SQ1_VOL", 0x4001: "SQ1_SWEEP", 0x4002: "SQ1_LO", 0x4003: "SQ1_HI",
    0x4004: "SQ2_VOL", 0x4005: "SQ2_SWEEP", 0x4006: "SQ2_LO", 0x4007: "SQ2_HI",
    0x4008: "TRI_LINEAR", 0x400A: "TRI_LO", 0x400B: "TRI_HI",
    0x400C: "NOISE_VOL", 0x400E: "NOISE_LO", 0x400F: "NOISE_HI",
    0x4010: "DMC_FREQ", 0x4011: "DMC_RAW", 0x4012: "DMC_START", 0x4013: "DMC_LEN",
    0x4014: "OAMDMA", 0x4015: "SND_CHN", 0x4016: "JOY1", 0x4017: "JOY2_FRAME",
}

# For the register census (kit/cpu/census.py, whose header explains each). The PPU repeats
# its eight registers every 8 bytes through $3FFF; the APU's and the I/O's are each their own
# address, and the test registers after them are counted as themselves.
CENSUS_CHIPS = [(0x2000, 0x3FFF, 0x07, 0x2007)]    # the PPU
CENSUS_PAGES = [(0x4000, 0x4017, "apu_io"), (0x4018, 0x401F, "test")]


if __name__ == "__main__":
    for a, n in sorted(NAMES.items()):
        print(f"${a:04X}  {n}")
