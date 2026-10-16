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

## The Overview tab (12 October 2026)

At the contributor's request the opening section, "The game", became its
own Overview tab (`index.html`), and the rest of How it works moved to
`how-it-works.html`, renumbered from 01. The page sources in `work/page/`
were renamed to match, and `test_ports.py` now reads the map builder from
`how-it-works.html`.

## The map viewer scrolls (15 October 2026)

At the contributor's request the Maps / levels viewer draws each map as
one strip of 512 columns in a window that scrolls sideways, with 1× and 2×
zoom, a slider and drag to scroll, after the Maps tab of Mayhem in
Monsterland, in place of four wrapped strips of 128 columns. The page
sources in `work/page/` were brought up to date with the footer and the
`data-listing` block the site added to the committed pages, and assembling
them reproduced those pages byte for byte before the change.

## Four mechanics explained in depth, and a Discoveries tab (15 October 2026)

At the contributor's request How it works gained sections on the stars,
the shots and bullets, the waves' flight paths and the take-off, and the
site gained a Discoveries tab. Each new widget runs a port of the game's
routine, compared with the routine in the 6502 simulator before it went
on the page; `test_ports.py` keeps all six comparisons.

The take-off was recorded frame by frame in the emulator. It took four
attempts to get a clean recording: marking the level as landed from the
play snapshot landed the Manta at the start of Zinc, so the take-off
crossed the whole hull and crashed into it; waiting for the chamber by
its variables pressed fire before the chamber existed; and fire pressed
during the eight readings `wait_fire_release` makes at the start of each
step was ignored. A landing placed over column 408 after 150 frames of
play, and the chamber stepped frame by frame, gave the 568-frame record.
It showed the vaporising overtaking the Manta, which the listing and the
page had described as happening behind it.

Tracing the routines found six comments wrong: `vaporise_column` and
`random_heights` called the per-row column offsets heights, and the
destruction was said to follow the Manta; `new_wave`'s side byte was
described by an intent the code does not show; `fighter_move` tested
shot codes `$10`-`$1F` (it tests every code below `$20`) and was said
to turn fighters round at the edge (it notes the edge and switches them
off). `$8D` and `make_stars` were completed with the star counts.

The site now embeds the listing pieces each page names in its
`data-listing` block, so the new widgets' tables, sprites and paths were
added to it; a browser test compared every canvas drawn from the
embedded pieces with the same canvas drawn from the whole listing. The
block as the site wrote it had left out `$32F5`, the half-loop heights
the Manta widget reads.

A `hit_feature` path that ends another shot found inside a target looks
up the shot's slot without masking off `$10` (`$2B35`). It was not put
on the Discoveries tab: every target is made only of target characters,
so no shot can sit inside one without hitting it, and the path looks
unreachable.

## Homing mines (16 October 2026)

The page and `facts.md` had said mines appear "while no wave is flying",
read from `spawn_mine`'s `$6C` bit 7 test the wrong way round: the test
skips the launch when bit 7 is clear, and bit 7 is set from a wave's
launch until `wave_control` finds its sprites gone. Recorded live, mines
appeared with fighters on the screen and in the wait after them, never
between `wave_control`'s reset and the next wave; and since a mine counts
in `$6C`, it holds that wait open. `spawn_mine` also leaves the slot's
vertical fraction `$A4C8` as the last user left it, which would give a
mine a downward drift of a pixel a frame; the simulator shows the effect,
but in twelve live mines the fraction was always 0, so it is noted here
and not published.

## Release and reception (16 October 2026)

The Overview gained two sections from primary sources read in scans: ZZAP! 64 issue 11 (the
ratings, the reviewers' complaints, and the Braybrook interview's 17 and 50 updates a second), Crash
issue 35 (the Spectrum advertisement naming Dominic Robinson), Popular Computing Weekly of 20 March
1986 (the Gallup chart), and Computer and Video Games issue 66 (the Golden Joysticks). Spectrum
Computing gave the Spectrum release date, price and reviews. The release date of the C64 version,
The Last Starfighter and the Virtual Console release rest on Wikipedia and Nintendo World Report.
The Gold Medal in ZZAP! 64 issue 11 went to Mercenary, and the advertisement there calling a game a
"gold medal winner" means Paradroid, so the page claims no ZZAP! award for Uridium. Spectrum
Computing's "2nd Game of the Year" at the Golden Joysticks was left out: the C&VG report read here
does not name the runner-up for that award.
