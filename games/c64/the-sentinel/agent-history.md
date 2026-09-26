# The Sentinel — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 25-26 September 2026, one session, Silver

**Orientation.** The contributor's `SENTIN.D64` holds two freezer-cartridge
backups, not the release. `SENTINEL+` loaded, unpacked itself and resumed
the frozen game with an `RTI`, and crashed at the first interrupt: the RAM
at `$F900`-`$FFFF` had come back as `$FF`, the interrupt vector with it.
The game's own entry was found as the only caller of its machine set-up
(`$3F00` → `$8900`), which writes the vectors itself; restarting there with
the stack pointer set made the backup play. The second backup,
`SENTINEL`, wants a file the disk does not have and was not followed up.
Early on, `frame.py test` passed with 0 writes captured; the machine had
been left paused, and autostart does not resume a paused machine. A rerun
captured 36 writes and passed for real.

**Features, and a second image.** The manual, the C64-Wiki page, Wikipedia,
Simon Owen's code generator and Mark Moxon's reconstruction of the BBC
Micro version gave the feature list. Holding S on the first view jumped
into memory at `$B006` that held the emulator's power-up fill: store and
execute checkpoints over `$B000`-`$B5FF` showed nothing touched it on the
way to play, and the first pan called it. The contributor supplied a
second image, which turned out to be Synsoft's unrelated game of the same
name, and then a track-level G64 of the original from the C64 Preservation
Project. The G64 hung in its loader with true drive emulation, whatever
the drive type and idle method; reading the drive's own processor through
VICE's binary monitor showed it retrying sector 0 of track 25, which is
damaged in the image, and a copy with that track rebuilt in clean GCR
stopped on an illegal opcode before any of the game arrived. About forty
minutes went on the two images, and the analysis stayed on the backup,
with an `RTS` poked at `$B006` for live tests only.

**The BBC Micro map.** Ten-byte windows of the BBC listing, kept where each
was found exactly once in the C64 image, placed 10,751 of 23,534 BBC code
bytes and 556 of 885 labels, in a few blocks at fixed offsets. That map
seeded the disassembler's code blocks and went into the annotation brief as
a guess about purpose, with the rule that names and comments are written
from the C64 bytes in the agents' own words.

**Coverage.** Eight annotation agents on disjoint ranges took the image to
100 % in an hour; a ninth ported the landscape generator, the placement
and the code check to JavaScript and matched eight landscapes recorded
in the emulator byte for byte, and all 10,000 published codes. Meanwhile
the lead tested mechanics live with the `$B006` patch: creating and
absorbing, transfer, being drained to death, hyperspace, the pause and
volume keys, F1. The agents shared one scratch folder and overwrote each
other's helper scripts; one agent's trace had followed `JSR $B006` into
the fill pattern and typed it as code, which another agent undid. Agent
8's report existed only in the conversation and had to be recovered from
the transcript after the lead's context was summarised; the kit's brief
now asks for each report in a file too.

**Verification.** Two reports were wrong in ways that mattered: the code
check does not depend on the return-address trick (the trick routes every
landscape into the overview; the check comes later, at `$14DC`), and
`$3670` does not wait for raster line 230 (it reads the line once and
delays about 400 cycles when it is lower). The enemy clock was measured
over 1,000 frames and the Sentinel's turns over 45 seconds; the "first key
swallowed" seen early was the rig typing while the game was still
redrawing a title already on screen. A claim of mine, that the 24-tree
limit decides most eight-enemy landscapes, was 916 of 2,603 when counted.

**Minisite.** The page is built around the landscape port. The perspective
view draws the port's output with the game's overview camera and colours,
and projects onto a plane where the game uses angles, so the caption says
so. A second captured frame of play differed from the emulator's picture
by 2,160 pixels, all along edges; it matches at every pixel one line lower,
so the emulator's picture of that state is offset, not the renderer wrong,
and `frame.py compare` now says so. The sound driver was ported by a
subagent and tested against the game's own code in a 6502 simulator.
