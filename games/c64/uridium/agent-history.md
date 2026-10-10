# Uridium — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 10 October 2026: getting the image to load

The contributor's G64 autostarted in VICE (v3.13.2 Linux release, all 57
emulator checks passed) to the loading screen and stopped there. Six
minutes of sampling the program counter gave `$C234`/`$C237` every
time: `LDA $DD00 / BPL`, the fast loader waiting for the drive. VICE's
text monitor on the port above the MCP port (6511) reaches the drive with
`device 8:`; the drive sat at `$0391`, `BIT $1800 / BPL`, waiting for
ATN. A deadlock, the same to the cycle on a second boot with no polling,
so not the instrument.

The C64's loader code at `$C200`-`$C22F` had been overwritten with
data. A stopping store checkpoint on `$C22F` named the writer: the
loader's own `STA ($AE),Y` at `$C2E1`, 18 seconds in. Logging every
load address the loader received (`$C329`, `$C331`) showed a first
file to `$C800` that loaded cleanly and a second whose address read
`$6168`, which then ran on over the loader. The main file's chain is
184 sectors, 46,592 bytes: it cannot start at `$6168`. Its first two
bytes on the disk are `$97 $9E`; XORed with `$97` they are `$0900`,
and the next ones decode to `SEI / LDA #$0B / STA $D011`.

The `$C800` stage sends drive code encrypted with `$74` (the XOR of the
drive ROM's `$F510`, `$F556`, `$C118`: `$A5 ^ $A9 ^ $78`). Decrypted
(`work/drv0300.bin`), it reads track 39, finds a sync followed by raw
`$69 .. $A9`, times the next ten syncs with a 9-cycle loop, and sends a
byte with one bit per sync 3 to 10, set when that sync is at least as
long as sync 2. On this G64 those syncs are 24 or 25 bits long, all but
equal, and the byte came out `$FF`. `$97` needs syncs 4, 5 and 7 to be
shorter than sync 2. Wrong turns first: the drive ROM revision (the
1541-II's key bytes `$F576`, `$F577`, `$F510`, `$F556`, `$C118` all
equal the 1541's), the video standard (PAL), badlines (`$D011` = `$1B`,
no sprites).

The fix writes a copy of the image with those eight sync units rewritten
and leaves everything else alone. With it the main file loads to
`$0900`-`$BEFF` in 20 seconds and equals the bytes on the disk XORed
with `$97`. The script, for anyone who has the image:

```python
"""Write work/uridium-t39.g64: the contributor's G64 with the ten sync marks the protection
times on track 39 given lengths that measure the signature $97.

The protection (drive code decrypted from the $C800 stage, key $74) finds the sync followed by
raw bytes $69 .. $A9, then counts the length of the next ten syncs. Sync 2 is the reference;
syncs 3..10 each give one bit, set when that sync is at least as long as the reference, first
bit highest. The image's syncs are all 24 or 25 bits, which a 9-cycle counting loop cannot tell
apart, so the emulated drive reads $FF. Units here: long = 33 bits, short = 16 bits, the
reference left at 25.
"""
import struct, sys
src, dst = sys.argv[1], sys.argv[2]
key = int(sys.argv[3], 16) if len(sys.argv) > 3 else 0x97
d = bytearray(open(src, "rb").read())
n = d[9]
offs = struct.unpack("<%dI" % n, bytes(d[12:12 + 4 * n]))
o = offs[(39 - 1) * 2] + 2
t = d[o:o + 6250]
marker = bytes.fromhex("ffffff695959a9a9")
m = t.find(marker)
assert m >= 0, "marker not found"
syncs = [i for i in range(m + 8, m + 200) if t[i:i + 3] == b"\xff\xff\xff" and t[i - 1] != 0xff]
# syncs[0] is sync 1 (the 31-bit one, $0500), syncs[1] the reference ($0501), syncs[2:10] the eight bits
first = syncs[2]
assert all(syncs[k + 1] - syncs[k] == 9 for k in range(2, 9)), syncs
LONG = bytes.fromhex("ffffffff5555555555")
SHORT = bytes.fromhex("fffe55555555555555")
for i in range(8):
    bit = (key >> (7 - i)) & 1
    p = o + first + 9 * i
    d[p:p + 9] = LONG if bit else SHORT
open(dst, "wb").write(d)
print("wrote", dst, "signature $%02X" % key)
```

## Verify and the pages (10 October 2026)

The independent check of 60 comments (seed 1986) found 8 wrong. Because
13 % is a bad first sample, every comment was read again against the
others and the bytes, which found 13 more: the collision flags were
described as "bit 0 edge-on", when bit 0 marks the end-on frames of a
half-loop and the edge-on frames are the ones with no flag at all (one row,
three columns); `copy_enemy_shapes` copied the tile set, not sprites, and
became `copy_tile_set`; `level_setup` leaves the Manta facing left, not
right. The page's draft carried the collision mistake and was fixed with
the listing.

The sound driver and the map builder were ported for the page and
compared with the game's code in `kit/c64/cpu6502.js`; `test_ports.py`
keeps the comparison. A first mutation of the driver (`& 15` to `& 7` on
the mode) passed the test because every mode value agrees under both
masks; a change to the tempo failed it, as it should.

## The music page and the piece sheet (10 October 2026)

The contributor reported that none of the sound effect buttons played.
The driver port had passed its comparison with the game, but that test
set the effect requests itself, one frame after the switch to effects
mode. The page made its requests on the same frame as the switch, and the
switch runs `sound_reset`, which clears `$91`-`$93`: every button was
silent while the title tune, which needs no request, played. The port
now counts the page's request frames from the first frame after the
switch, and `test_ports.py` renders every button of the page through the
SID model and fails if one is silent; with the old driver it reports 0 of
27.

The sound sections moved to their own page, `music.html`. For the piece
sheet, the map port records where it lays each piece; replaying those
placements rebuilds all 16 maps exactly, and that is in `test_ports.py`
too.
