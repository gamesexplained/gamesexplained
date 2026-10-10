# Qix — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## The loader (10 October 2026)

The image is a North East Crackers crack. Its directory looks like six
files, but every entry but the intro points at one 426-byte stub; the real
files start at the track and sector kept in each entry's side-sector field.
On PAL the intro's loader jammed the CPU at `$0154` (after a long SPACE
press) or waited for ever at `$0181`. Turning on the drive's own processor
(`Drive8TrueEmulation=1`, `TrapDevice8=0` in vicerc) did not help. Switching
the machine to NTSC did: the loader's two-bit transfer is timed for NTSC.
Decoding the files' stream format statically failed (the first bytes feed
self-modifying code), so the loads were mapped instead by logging each
segment's address at the loader's segment start (`$02B1`), which also
showed when the game loads `ALIEN`, `SCENE` and `TAITO` later.

## Choosing the image

The hand-over (`entry.vsf`, at `$8000`) lacks the music player, which the
start-up copies from `$4000` to `$E000`; play overwrites `$C000`-`$FFFF`
and `$6000`-`$7FFF`. A snapshot on the title, eight seconds after the
hand-over, holds everything at once, and was analysed and listed.

## The code map

The first code map, recorded through a boot, play, two- and one-player
games and the attract demonstration, held 307 addresses of the KERNAL's
LOAD and serial code: the game banks the KERNAL in for its loads, and the
memmap marks by address. A second map of the title music alone, and a
trace of the music player through its three 21-entry dispatch tables,
separated the player's code from the KERNAL's; the KERNAL addresses were
dropped from `codemap.json` (the raw dumps stay in `work/`).

## Annotation

One agent annotated all of it. The tracer twice ran from inline text into
`$4000` (the print routine's arguments decode as JSRs); typing the
arguments as bytes after every trace fixed it, and the arguments must be
typed again after any later trace. Several first readings were wrong and
were corrected before the checker saw them: the Sparx's diagonal movers
are the Spritz roamers; `$A4A9` animates sprites rather than moving the
marker; the level hints show on levels 2 and 4, not from level 9; the
flag `$23` marks a fast line, not a slow one; and the split doubling is a
bug. About 300 data and operand symbols were described by a script from
their cross-references, to finish the ledger; those comments are thin.

## Verify

Live tests: the music's frame skip, the pause, slow and fast draw speeds,
the lives and requirement at the start, and a level end with the
requirement poked to 1 %. The scoring port and the music player were
checked against the game's code in `kit/c64/cpu6502.js`. A second agent
checked 60 sampled comments: 6 of 45 hand-written ones were wrong, all
fixed (see `facts.md`).

## Interruption

The worker restarted part way through verify and the contributor's usage
limit paused the run; the files, snapshots and the exported symbols
survived, and work continued from `symbols.json` with the listing rebuilt
from the snapshot.
