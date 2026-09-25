#!/usr/bin/env python3
"""The C64's I/O registers by name, for the operands of the Source tab.

$D000-$DFFF has two meanings: the chips' registers while the I/O area is
banked in, and RAM while it is out (kit/skills/c64/c64-reference, the
memory map and "$01"). listing.py names an operand after the register
when the instruction sees the chips, and after the game's own symbol when
it sees the RAM; which one it sees is the rule in
kit/skills/core/50-coverage, "A game can live under its I/O".

Only each register's own address has a name. The chips repeat through
their pages (the video chip every 64 bytes to $D3FF, the sound chip every
32 to $D7FF, each CIA every 16 through its page), and an operand on one
of those repeats keeps its address, so that the listing shows the
address the code uses. Colour RAM is named at its start only.

Usage: registers.py      print the table
"""

NAMES = {}

for _n in range(8):
    NAMES[0xD000 + 2 * _n] = f"vic_sprite{_n}_x"
    NAMES[0xD001 + 2 * _n] = f"vic_sprite{_n}_y"
    NAMES[0xD027 + _n] = f"vic_sprite{_n}_colour"
NAMES.update({
    0xD010: "vic_sprite_x_msb", 0xD011: "vic_control1", 0xD012: "vic_raster",
    0xD013: "vic_lightpen_x", 0xD014: "vic_lightpen_y", 0xD015: "vic_sprite_enable",
    0xD016: "vic_control2", 0xD017: "vic_sprite_expand_y", 0xD018: "vic_memory",
    0xD019: "vic_irq_status", 0xD01A: "vic_irq_enable", 0xD01B: "vic_sprite_priority",
    0xD01C: "vic_sprite_multicolour", 0xD01D: "vic_sprite_expand_x",
    0xD01E: "vic_sprite_collision", 0xD01F: "vic_sprite_bg_collision",
    0xD020: "vic_border", 0xD021: "vic_background0", 0xD022: "vic_background1",
    0xD023: "vic_background2", 0xD024: "vic_background3",
    0xD025: "vic_sprite_mc0", 0xD026: "vic_sprite_mc1",
})

for _v in range(3):
    for _i, _r in enumerate(("freq_lo", "freq_hi", "pulse_lo", "pulse_hi", "control",
                             "attack_decay", "sustain_release")):
        NAMES[0xD400 + 7 * _v + _i] = f"sid_v{_v + 1}_{_r}"
NAMES.update({
    0xD415: "sid_filter_cutoff_lo", 0xD416: "sid_filter_cutoff_hi",
    0xD417: "sid_filter_resonance", 0xD418: "sid_filter_mode_volume",
    0xD419: "sid_paddle_x", 0xD41A: "sid_paddle_y",
    0xD41B: "sid_v3_oscillator", 0xD41C: "sid_v3_envelope",
})

NAMES[0xD800] = "colour_ram"

for _base, _cia in ((0xDC00, "cia1"), (0xDD00, "cia2")):
    for _i, _r in enumerate(("port_a", "port_b", "ddr_a", "ddr_b",
                             "timer_a_lo", "timer_a_hi", "timer_b_lo", "timer_b_hi",
                             "tod_tenths", "tod_seconds", "tod_minutes", "tod_hours",
                             "serial", "interrupt", "control_a", "control_b")):
        NAMES[_base + _i] = f"{_cia}_{_r}"

del _n, _v, _i, _r, _base, _cia


if __name__ == "__main__":
    for a in sorted(NAMES):
        print(f"${a:04X}  {NAMES[a]}")
