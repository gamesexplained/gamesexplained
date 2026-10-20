#!/usr/bin/env python3
"""The Commodore 16's and Plus/4's I/O registers by name, for the operands of the Source tab.

The TED machines keep their chips at $FD00-$FF3F, and nothing else answers there whether the ROMs
or the RAM are mapped in above $8000 (kit/skills/c16/c16-reference, "Memory map"), so an operand
there always means the chip: symbols_export.py's PLATFORM_DEFAULTS gives the c16 platform an
"io_only" range, and listing.py names every operand in it after the register.

The names follow the C64's (`vic_...`, `sid_...`), with the TED's own: one chip that is the video,
the sound, the three timers, the keyboard's input lines and the clock (`ted_...`). Commodore's
KERNAL source names the same addresses in its own way (declare.src: timr1l, tedvcr, keybrd,
tedirq, tedicr, tedmlo, tedmhi, tedvoi, tedcbr, romon, romoff); c16-reference, "TED's registers",
gives both and what each bit does.

$FF12 is two things at once: bits 0-1 are voice 1's frequency, bits 8 and 9, and bits 2-5 choose
where the bitmap and the character set are read from, so its name says both. The sound registers'
split (voice 1 low at $FF0E and high at $FF12, voice 2 low at $FF0F and high at $FF10) is BASIC
3.5's own (BASIC_TED, noise.src), where one magazine article has the two high bytes swapped
(c16-reference, "Where the sources disagree").

Only each register's own address has a name. The 6529 latches answer on every address of their
sixteen and the ACIA every four (the Plus/4's, absent on a C16); an operand on one of those repeats
keeps its address, so that the listing shows the address the code uses. Each of $FDD0-$FDDF is
named: a write there picks the ROMs by the address alone, the value written being ignored, so the
address is the meaning. The 1551 disk drive's interface answers at $FEF0 for unit 8 and $FEC0 for
unit 9 (KERNAL source, openchanl.src, tstkdy).

Usage: registers.py      print the table
"""

NAMES = {
    0xFF00: "ted_timer1_lo", 0xFF01: "ted_timer1_hi",
    0xFF02: "ted_timer2_lo", 0xFF03: "ted_timer2_hi",
    0xFF04: "ted_timer3_lo", 0xFF05: "ted_timer3_hi",
    0xFF06: "ted_control1",          # scroll, rows, display on, bitmap, extended colour
    0xFF07: "ted_control2",          # scroll, columns, multicolour, freeze, PAL/NTSC, reverse off
    0xFF08: "ted_keyboard",          # the keyboard's and joysticks' input lines, latched on a write
    0xFF09: "ted_irq_flags", 0xFF0A: "ted_irq_mask", 0xFF0B: "ted_raster_compare",
    0xFF0C: "ted_cursor_hi", 0xFF0D: "ted_cursor_lo",
    0xFF0E: "ted_voice1_freq_lo", 0xFF0F: "ted_voice2_freq_lo", 0xFF10: "ted_voice2_freq_hi",
    0xFF11: "ted_sound",             # volume, the voices on, noise, D/A
    0xFF12: "ted_bitmap_voice1_hi",  # bitmap base, character data from ROM, voice 1's frequency bits 8-9
    0xFF13: "ted_charset",           # character base, single clock, ROM mapped in (read only)
    0xFF14: "ted_screen",            # the attributes and the characters, in $800 steps
    0xFF15: "ted_background", 0xFF16: "ted_colour1", 0xFF17: "ted_colour2", 0xFF18: "ted_colour3",
    0xFF19: "ted_border",
    0xFF1A: "ted_char_pos_hi", 0xFF1B: "ted_char_pos_lo",
    0xFF1C: "ted_raster_hi", 0xFF1D: "ted_raster_lo",
    0xFF1E: "ted_hpos",
    0xFF1F: "ted_char_line",         # the line within the character row, and the flash counter
    0xFF3E: "rom_on", 0xFF3F: "ram_on",
    0xFD00: "acia_data", 0xFD01: "acia_status", 0xFD02: "acia_command", 0xFD03: "acia_control",
    0xFD10: "user_port",             # 6529, the Plus/4's user port
    0xFD30: "keyboard_latch",        # 6529: the keyboard row to read at $FF08
    0xFEF0: "drive8_data", 0xFEF1: "drive8_status", 0xFEF2: "drive8_handshake",
    0xFEF3: "drive8_data_dir", 0xFEF4: "drive8_status_dir", 0xFEF5: "drive8_handshake_dir",
    0xFEC0: "drive9_data", 0xFEC1: "drive9_status", 0xFEC2: "drive9_handshake",
    0xFEC3: "drive9_data_dir", 0xFEC4: "drive9_status_dir", 0xFEC5: "drive9_handshake_dir",
}
for _n in range(16):
    NAMES[0xFDD0 + _n] = f"rom_bank_{_n}"   # bits 0-1 the ROM at $8000, bits 2-3 the ROM at $C000

# For the register census (kit/cpu/census.py, whose header explains each). Repeats are folded
# only where c16-reference, "Input and output", gives them: the ACIA every 4 bytes, each 6529
# through its sixteen. The TED's registers and the bank port are each their own address.
CENSUS_CHIPS = [(0xFD00, 0xFD0F, 0x03, 0xFD03),    # 6551 ACIA (Plus/4)
                (0xFD10, 0xFD1F, 0x00, 0xFD10),    # 6529, the user port (Plus/4)
                (0xFD30, 0xFD3F, 0x00, 0xFD30)]    # 6529, the keyboard latch
CENSUS_PAGES = [(0xFDD0, 0xFDDF, "rom_bank"), (0xFEC0, 0xFEC7, "drive9"), (0xFEF0, 0xFEF7, "drive8"),
                (0xFF00, 0xFF1F, "ted"), (0xFF3E, 0xFF3F, "rom_ram")]
CENSUS_OTHER = {0x0000: "cpu_port_ddr", 0x0001: "cpu_port"}   # the 7501's own port


if __name__ == "__main__":
    for a, n in sorted(NAMES.items()):
        print(f"${a:04X}  {n}")
