#!/usr/bin/env python3
"""The enhanced Apple IIe's soft switches and the cards' registers by name, for the operands of
the Source tab.

The IIe's I/O page, $C000-$C0FF, is soft switches: an access to an address flips a switch,
reads a status bit or a key, clicks the speaker. No RAM lies beneath it, nor beneath the
cards' ROM space above it ($C100-$CFFF), so an operand there always means the hardware:
symbols_export.py's PLATFORM_DEFAULTS gives the Apple II an "io_only" range, and listing.py
names every operand in it from here. kit/skills/apple2/apple2-reference, "The soft switches",
has the table with what each one does.

Many addresses mean one thing to a read and another to a write: $C000 is the keyboard to a
read and turns 80STORE off when written. NAMES has the read meaning, WRITES the write meaning
where it differs, and kit/apple2/cpu.py names a store instruction's operand from WRITES. And
`lda $C08C,x`, with X the slot number times 16, is the disk drive's data latch in slot 6, not
the language card: an operand in $C080-$C08F indexed by X or Y takes its name from SLOT, the
names DOS 3.3's disk routines give a slot's sixteen addresses.

The names are those of Apple's firmware and of most published Apple II source (SourceGen's
symbol files use them too), in lower case, except where that name starts with a digit or
misleads: Apple's CLR80COL and SET80COL ($C000, $C001) are 80STORE's, and are clr80store and
set80store here; CLR80VID and SET80VID ($C00C, $C00D) are 80COL's. The language card's and the
disk drive's have no names of Apple's, and say what they do.

Only a register's own address has a name. An address that repeats one (the language card's
switches at $C084-$C087 and $C08C-$C08F, the speaker anywhere in $C030-$C03F) keeps its
address, so the listing shows the address the code uses; the census folds the repeats.

Usage: registers.py      print the table
"""

# reads, and accesses that do the same whichever way they are made
NAMES = {
    0xC000: "kbd",              # the last key, bit 7 set until the strobe is cleared
    0xC010: "kbdstrb",          # clears the strobe; a read's bit 7 is set while a key is held
    0xC011: "rdlcbnk2", 0xC012: "rdlcram", 0xC013: "rdramrd", 0xC014: "rdramwrt",
    0xC015: "rdcxrom", 0xC016: "rdaltzp", 0xC017: "rdc3rom", 0xC018: "rd80store",
    0xC019: "rdvblbar",         # bit 7 clear while the beam is in the vertical blank
    0xC01A: "rdtext", 0xC01B: "rdmixed", 0xC01C: "rdpage2", 0xC01D: "rdhires",
    0xC01E: "rdaltchar", 0xC01F: "rd80vid",
    0xC020: "tapeout",
    0xC030: "spkr",
    0xC040: "strobe",           # the game port's strobe output
    0xC050: "txtclr", 0xC051: "txtset", 0xC052: "mixclr", 0xC053: "mixset",
    0xC054: "txtpage1", 0xC055: "txtpage2", 0xC056: "lores", 0xC057: "hires",
    # the annunciators by what they do (TRM 1987 Table 2-10); Apple's ROM listing names each pair
    # the other way round, SETANn first (kit/skills/apple2/apple2-reference, "The soft switches")
    0xC058: "clran0", 0xC059: "setan0", 0xC05A: "clran1", 0xC05B: "setan1",
    0xC05C: "clran2", 0xC05D: "setan2",
    0xC05E: "clran3",           # annunciator 3 off: double hi-res on, with 80COL
    0xC05F: "setan3",           # double hi-res off
    0xC060: "tapein",
    0xC061: "butn0",            # the open-apple key too
    0xC062: "butn1",            # the solid-apple key too
    0xC063: "butn2",
    0xC064: "paddl0", 0xC065: "paddl1", 0xC066: "paddl2", 0xC067: "paddl3",
    0xC070: "ptrig",            # starts the four paddles' timers
    0xC07E: "rdioudis", 0xC07F: "rddhires",
    # the language card: which of RAM and ROM $D000-$FFFF reads, whether RAM is written,
    # and which 4K bank of RAM is at $D000-$DFFF. Write-enable needs two reads in a row
    0xC080: "lc_read_ram2",     # read RAM bank 2, no writes
    0xC081: "lc_write_ram2",    # read ROM, write RAM bank 2
    0xC082: "lc_read_rom2",     # read ROM, no writes (bank 2 chosen)
    0xC083: "lc_ram2",          # read and write RAM bank 2
    0xC088: "lc_read_ram1", 0xC089: "lc_write_ram1", 0xC08A: "lc_read_rom1", 0xC08B: "lc_ram1",
    0xCFFF: "clrrom",           # gives up $C800-$CFFF, the cards' shared ROM space
}

# a write's meaning, where it is not a read's
WRITES = {
    0xC000: "clr80store", 0xC001: "set80store",
    0xC002: "rdmainram", 0xC003: "rdcardram",     # where $0200-$BFFF is read from
    0xC004: "wrmainram", 0xC005: "wrcardram",     # where it is written to
    0xC006: "setslotcxrom", 0xC007: "setintcxrom",
    0xC008: "setstdzp", 0xC009: "setaltzp",       # zero page, the stack and the language card
    0xC00A: "setintc3rom", 0xC00B: "setslotc3rom",
    0xC00C: "clr80vid", 0xC00D: "set80vid",
    0xC00E: "clraltchar", 0xC00F: "setaltchar",
    0xC07E: "ioudison", 0xC07F: "ioudisoff",
}
# A read of $C001-$C00F reads the keyboard, as a read of $C000 does: the switches there answer only
# to a write. A game written for the II or II+, where all sixteen addresses were the keyboard, may
# read any of them, so a read there keeps its address, as a repeat does

# a slot's sixteen addresses, $C080 + slot * 16, as DOS 3.3's disk routines name them; on the
# kit's machine the disk drive is in slot 6, $C0E0-$C0EF
SLOT = {0x0: "phaseoff0", 0x1: "phaseon0", 0x2: "phaseoff1", 0x3: "phaseon1",
        0x4: "phaseoff2", 0x5: "phaseon2", 0x6: "phaseoff3", 0x7: "phaseon3",
        0x8: "motoroff", 0x9: "motoron", 0xA: "drv1", 0xB: "drv2",
        0xC: "q6l", 0xD: "q6h", 0xE: "q7l", 0xF: "q7h"}
for _r, _n in SLOT.items():
    NAMES[0xC0E0 + _r] = f"s6_{_n}"

# the Mockingboard in slot 4: two 6522s, at $C400 and $C480, each driving a sound chip
VIA = ("orb", "ora", "ddrb", "ddra", "t1cl", "t1ch", "t1ll", "t1lh",
       "t2cl", "t2ch", "sr", "acr", "pcr", "ifr", "ier", "ora_nh")
for _i, _r in enumerate(VIA):
    NAMES[0xC400 + _i] = f"mb1_{_r}"
    NAMES[0xC480 + _i] = f"mb2_{_r}"

# For the register census (kit/cpu/census.py, whose header explains each). The speaker, the
# cassette output, the game port's strobe and the paddle trigger answer anywhere in their 16
# addresses; the language card's switches repeat at +4.
CENSUS_CHIPS = [(0xC020, 0xC02F, 0x00, 0xC020), (0xC030, 0xC03F, 0x00, 0xC030),
                (0xC040, 0xC04F, 0x00, 0xC040), (0xC070, 0xC07D, 0x00, 0xC070),
                (0xC080, 0xC08F, 0x0B, 0xC08B)]
CENSUS_PAGES = [(0xC000, 0xC00F, "keyboard when read, memory switches when written"), (0xC010, 0xC01F, "status"),
                (0xC050, 0xC05F, "video switches"), (0xC060, 0xC06F, "game port inputs"),
                (0xC07E, 0xC07F, "iou"),
                (0xC090, 0xC09F, "slot1_io"), (0xC0A0, 0xC0AF, "slot2_io"), (0xC0B0, 0xC0BF, "slot3_io"),
                (0xC0C0, 0xC0CF, "slot4_io"), (0xC0D0, 0xC0DF, "slot5_io"), (0xC0E0, 0xC0EF, "disk"),
                (0xC0F0, 0xC0FF, "slot7_io"), (0xC400, 0xC4FF, "mockingboard")]
CENSUS_OTHER = {0xCFFF: "clrrom"}


if __name__ == "__main__":
    for a in sorted(set(NAMES) | set(WRITES)):
        w = WRITES.get(a)
        print(f"${a:04X}  {NAMES.get(a, '-'):16}" + (f" written: {w}" if w and w != NAMES.get(a) else ""))
    print("indexed by X, $C080-$C08F: " + ", ".join(f"${0xC080 + r:04X},x {n}" for r, n in sorted(SLOT.items())))
