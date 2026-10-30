# Speedball 2 — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 30 October 2026 — the run to Silver

One session, about three hours, on claude-opus-5-5, in a cloud container
with no display. The contributor answered yes to every question at the
start (looking the game up, installing the tools, pushing and opening the
pull request, filing kit asks).

**Tools.** VICE came from vice-mcp's v3.14.0 Linux release and passed
`check-emulator` 57 of 57. regenerator2000 0.9.20 would not compile: cargo
picked `regenerator2000-core` 0.9.21, published after the release, and
the build stopped with `error[E0308]: mismatched types` at
`src/main.rs:838`. No earlier run had written this down. `cargo install
--locked` builds it with the dependencies it was published with, and that
worked; `kit/c64/INSTALL.md` now says so.

**The image.** The C64 Preservation Project's G64 of the 1991 Mirrorsoft
disk, from the Internet Archive. It boots in about 70 seconds to the
intro and another 130 after fire to the game, both at the KERNAL's speed.

**The loader.** No file is found in memory as it is on the disk: every
one but the save file is encrypted or packed. `BOOT` asks the drive for
track 1 sector 0, which cannot be read on the original, and adds the two
digits of the drive's error reply (`21`) to make the key that decrypts
the rest of itself. The decrypted code, read once the key was tried
offline, loads `PART0`, which decrypts itself with the same key at $CA00
and then unpacks three times (the game, `SPDBALL`, twice). Running the
game's own passes in VICE to the jump into each program gave the two
hand-over snapshots; nothing was rebuilt offline from the disk's files.

**Two parts.** The intro (`PART0`) and the game (`SPDBALL`) each fill
$0200-$DFFF and replace the program before them, so each is a part with
its own snapshot, code map and listing, neither `over` the other.

**Four routines the game keeps packed.** Inside the game, four short
routines are packed (at $534F, $5434, $559E and $764D) and unpacked to
$C000 when they are called. The code maps, recorded over two sessions of
play (menus, gym, a knockout match, a league match, the manager and
transfer screens), recorded their instructions at $C000 as well, but the
game's snapshot holds the title routine there. Seeding the disassembler
from every recorded start would have typed the title's bytes as code at
the wrong boundaries. The merge kept, at $C000-$FFFF, only the starts a
trace of the snapshot reaches from its entry, and each packed routine is
described on its packed bytes, from a Python port of the game's own
unpacker ($498E). They are not parts: none is a load, and they share one
buffer.

**Coverage.** The game part was annotated region by region from $0200
to $DFFF, then the intro. Both reached 100 % (87,102 bytes in all) with
no uncounted stretches. The pictures, sprites, tiles and fonts were
rendered from their packed streams before their comments were written.

**Verify.** One sample of 80 comments, seed 20261030, 60 from the 914
written by hand and 20 from the 173 written from templates. A fresh
checker on the same model marked 21 wrong, and each held when read
against the code. The frame comments' template had called frames $D340
and $D3C0 menu frames when they hold match frames between matches, and 23
more frame comments said the same; all were corrected together. Writing
`facts.md` found 21 more wrong comments outside the sample. Rebuilding
the pickups' sprites from the listing's bytes for the page found the
match's sprite blocks described wrongly: the block at $A5BB is the
players' run-out (now `door_sprites`), and match set-up unpacks the
frames at $A1D0 a second time and mirrors five more pairs. The live
tests are listed in `facts.md`.

**Online.** C64-Wiki has no page for the game. The sources used were the
coaching manual on the Internet Archive, ZZAP!64 issue 78's review, CSDb
and Wikipedia. No source on the web says why BRADFORD-ON-AVON is the
cheat or whose face MARTIN shows.

**The minisite.** No `levels.html`: the game has one arena. The tune
player runs the intro's own player on the kit's 6502, held to it by
`test_music.js` over 6,643 frames, with a button for tune 1, which
nothing starts. The score panel's frame was rebuilt from a recorded frame
and matched the emulator's picture.
