# Publication history

30 September 2026: contributor authorized publication directly from the existing exhaustive disassembly, online research, and a separate PR for each game. Imported annotations without claiming a new reverse-engineering run. Measured the repository’s own prose coverage and retained Bronze pending completion and maintainer review.

30 September 2026: reviewer correction booted disk from hard reset into THE BATHROOM with trainers disabled, compared title/play, rebuilt canonical symbols/listing and held the article at Bronze pending verification. Shared tooling moved to #125.

1 October 2026: resumed coverage, described all room and sprite records, corrected operand-label addresses and misplaced post-row descriptions, and removed duplicate follow-on annotations. Tracked coverage reached 100%; hidden I/O RAM and loader hand-over remain open, so this is not a Silver completion.

The retained `$D000` bootstrap was checked by controlled execution: it relocates a descending-page room-copy loop, rather than being arbitrary residue. Native room-copy checks passed all 60 ids and rope staging passed all 34 positions. Initial comparison against an older saved room image failed because an animated glyph had changed; comparison against each live source immediately before copying passed. Misplaced screen-page prose and color-RAM/template aliases were corrected in the exported listing. Two new trainer/decompression attempts did not reach a healthy title; they are not evidence of absent RAM accesses.

The complete title-music native tick loop agreed with independently decoded stream boundaries. The packed terrain renderer matched screen codes and color nibbles for all 60 rooms. The restored browsers matched independent pixels for all 60 terrain and 34 rope views; their controls worked. One full captured frame matched every emulator pixel.

The copyright checker passed a positive code, each wrong digit and an incomplete entry. RESTORE entered the title through the retained cartridge header. The initial reset test did not run: despite run_after=true, this MCP call needed a separate execution_run. A positive breakpoint at KERNAL reset entry then established that reset clears DDR before reaching the same restart stub; the jump fetched BASIC ROM rather than the RAM title. No claim of a missing reset path rests on the initial zero checkpoint count.

The native cold trajectory established a correction to phase attribution: it entered $3C23 with port $37, without executing $D002 or $0334. Those retained copy routines remain valid in controlled execution. The real decoder at $0100 reads a BA-marked RLE stream; an independent decoder reproduced all 63,511 output bytes. A checkpoint at $0100 and final store checkpoints distinguished packed relocation from final unpacking. The unclocked interval between the copyright check and the following verification session included the first phase-trajectory investigation; no time is reconstructed for it.

All item records and BCD boundaries passed controlled native collection calls. An initial natural-jump expectation that the player would return to the starting bathroom floor was wrong: room geometry changed the state at jump index 33. The replay with an input-only fire pulse still matched every unobstructed table step and rose 20 pixels; the no-input control stayed grounded. A death fixture initially guessed the checkpoint field order and failed; the fixture was corrected from the actual symbol addresses and all six counter cases then passed. Maria checks showed that suppressing its updates does not clear an existing enable bit. Two retained copier clones matched full 8 KB outputs; in-place safety is explicitly not claimed.


## 1 October 2026 — annotation review correction

Corrected 121 inherited comments whose text had been attached to the following row. Matched each moved text to its original Ghidra address, restored missing original descriptions where no newer annotation existed, and retained independently tested replacement claims. The Commodware review exposed the import error; byte data and code boundaries are unchanged.

## Review corrections, 3 October 2026

Corrected $0D6F from skipping byte-1 spaces to rejecting them via the
editor error path; $0BC5 is the actual skipper. Corrected the title's
fire condition: it requires a held key, while Return starts directly.
Described the 612-byte rope directory/trajectory span at $1858 and the
seven mask-table bytes at $2233. The former 100% metadata overstated the
99.0% measured ledger; the corrected descriptions now reproduce 100%.
Reran verification against the published code and a fresh private
headless/dummy-sound gameplay snapshot. Re-export preserved the previous
auto symbols as well as the edited user annotations. Remaining loaded
gaps and mechanics stay open; tier remains Bronze pending a fresh
maintainer check.

## 16-17 October 2026 — a fresh run on the BCS release

The game's first contributor was not expected back, so Aaron asked for
the game to be taken to Silver under kit 0.0.173, from his upload of
the Berlin Cracking Service disk ("Jet Set Willy - BCS.d64"). The earlier
listing was of another crack, whose boot, trainer and packer this release
does not have: `LADER` loads `JET` and `SET WILLY` and hands over at the
title, so orientation, the start-up comments and the coverage record were
written again from this release, keeping the imported names and comments
only where its own code bore them out.

Annotation described all 172 sprites and 60 rooms from their bytes, traced
the code card the crack bypasses and the room-select cheat it switches
off, and named every untracked stretch the listing build reported. Five of
those stretches are scraps of the programmers' source text, and four of
them match the shipped code line for line.

The run's own sample (seed 20261016) found 16 of 60 comments wrong; with
them, all 87 routine headers written in one templated form were rewritten
from the code. Aaron's maintainer sample (seed 1792191626), on a Codex
checker, found 7 wrong, so the listing went to a full audit. Zero page was
audited on Codex, which corrected 9; Codex's usage limit ran out there.
The audit was briefly moved to Fable, read as a different model was what
`kit/CHECKING.md` asked for; Aaron said a fresh agent on the run's own
proven model is the baseline, so the rest went to fresh Opus agents, one
range at a time, and `CHECKING.md` was reworded to say so.

Live tests in VICE settled the Discoveries: one jump off the Watch Tower
took all nine lives, because the restart point saved on entering We Must
Perform a Quirkafleeg keeps the fall count; walking off the Security Guard's floor
into the Entrance to Hades cost every life in ten entries; three rooms'
arrows flew for 0, 83 and 51 frames of 600; standing on the bed did nothing;
one conveyor's glyph changed and another's did not; no store reached $60;
and the code card, run by hand from its entry, accepted the colours the
game's own code gives for cell 252. A test of the Entrance to Hades first
released the joystick too early and Willy stopped on the floor; holding it
until room 6 reproduced the trap.

`reference/` lost the earlier run's import audit, its review script and an
unused picture, none of which a page loads. `kit-feedback.md` was
rewritten for this run; the earlier run's version is in the history.

After the pull request was opened Aaron asked for a Play tab. The port
(`reference/jsw-port.js`) follows the game routine by routine and was
held against the game's own code on the kit's C64 in lockstep, pass by
pass, from the crackers' start-up. The kit's machine has no sprite
collisions and the game finds its hits through them, so a model of the
chip's collisions (`reference/jsw-collide.js`) was written for both
sides. Two differences were the game's own races with its interrupt: the
room build's sprite writes against the interrupt's rope copy, at pass
250,471 of steered play, and every main-program load and store of
`$D010` against the interrupt's update of Willy's bit, at pass 10,670 of
a player who only wanders. The port now yields at both ends of each, and
400,000 passes of steered play and 300,000 of wandering play run
identical. The page's clock first ran 1.8 % slow, then 1.4 %: the
measured costs counted the sound sweeps' waits twice, the routines the
player update leaves by a jump had no cost, and the interrupt's cost was
averaged per band of lines rather than per branch it takes. Measured
again, the page keeps the game's pace within 0.04 % over 60,000 frames.

The audit of the listing ended with 77 of its 781 comments corrected,
most of them wrong in one detail of a count, a range or a caller list.
The audit of `facts.md` marked 23 of its 93 claims wrong in a detail;
22 held when read against the code and were corrected, among them the
end of the player code, a fourth unused copy routine and the
interrupt's own switch of the processor port, and one did not: the
census script it said was missing is in `kit/c64`. The second sample,
seed 1122228220, found 1 comment of 60 wrong, and `tier` became
`silver`.
