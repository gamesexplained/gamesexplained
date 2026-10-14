#!/usr/bin/env python3
"""The BBC Micro's I/O registers by name, for the operands of the Source tab.

The Model B's chips answer in SHEILA, the page at $FE00-$FEFF; FRED ($FC00) and JIM
($FD00) are for devices on the 1 MHz bus and have nothing of the machine's own. No RAM lies
under any of them, so an operand there always means the chip: symbols_export.py's
PLATFORM_DEFAULTS gives the BBC an "io_only" range, and listing.py names every operand in it
after the register.

Only each register's own address has a name. A chip answers on every address of its slot
(the VIAs every 16 bytes of their 32, the CRTC every 2 of its 8), and an operand on one of
those repeats keeps its address, so that the listing shows the address the code uses. The
decode is jsbeeb 2.4.0's (src/6502.js, readDevice and writeDevice), which follows the
Model B's hardware: kit/skills/bbc/bbc-reference, "SHEILA", has the table and its sources.

Usage: registers.py      print the table
"""

VIA = ("orb", "ora", "ddrb", "ddra", "t1c_lo", "t1c_hi", "t1l_lo", "t1l_hi",
       "t2c_lo", "t2c_hi", "sr", "acr", "pcr", "ifr", "ier", "ora_nh")

NAMES = {
    0xFE00: "crtc_address", 0xFE01: "crtc_data",
    0xFE08: "acia_status", 0xFE09: "acia_data",       # status reading, control writing
    0xFE10: "serial_ula",
    0xFE20: "ula_control", 0xFE21: "ula_palette",
    0xFE30: "romsel",
    0xFE80: "fdc_status", 0xFE81: "fdc_result",       # the 8271: command and parameter writing
    0xFE82: "fdc_reset", 0xFE84: "fdc_data",
    0xFEA0: "econet",
    0xFEC0: "adc_status", 0xFEC1: "adc_high", 0xFEC2: "adc_low",   # writing $FEC0 starts a conversion
    0xFEE0: "tube",
}
for _i, _r in enumerate(VIA):
    NAMES[0xFE40 + _i] = f"sysvia_{_r}"
    NAMES[0xFE60 + _i] = f"uservia_{_r}"


if __name__ == "__main__":
    for a, n in sorted(NAMES.items()):
        print(f"${a:04X}  {n}")
