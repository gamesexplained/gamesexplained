# Second story facts

The snapshot `work/story.vsf` is the story prompt reached after forcing the airshaft success path, as described in the game’s `orientation.md`. RAM at `$C200–$C3B7` contains eleven space-padded 40-byte rows and `$C3B8` is zero. The shared story engine can read 40-byte rows from this address; its exact route into this scene remains open.

A 60-frame VICE capture at the story wait recorded 535 instruction starts in `codemap.json`. It does not cover the preceding load or the full story sequence.

The sound-driver instruction ranges $E000–$E0C1, $E256–$E2CD, $E2D7–$E314 and $E321–$E3A2 match the airshaft play snapshot byte for byte. Their code was recovered from those established instruction entries, and comments on matching routines were carried from the airshaft listing. Other driver bytes include runtime-patched operands.

The 24 two-byte command-table entries at $E226–$E255 and the two 14-byte parameter-pointer tables at $E668–$E683 match the airshaft snapshot. The pointed-to data following them and the two bytes at $E666–$E667 remain open.

The decoded `4.SECOND STORY` load writes `$3000–$37FF`, `$6400–$91FF`, `$C200–$C3FF` and `$E000–$EFE1`. Its later story snapshot differs from the dual-fill output in 98 bytes, all within the sound-driver area; the cause of each difference remains open. The part lies over the airshaft and counts the decoded ranges.

The sound routine at `$E43D` reads a voice sequence, adds its pitch offsets and looks up a little-endian frequency at `$E5C2`. It can adjust the frequency with the per-voice values at `$E0DB–$E0DE` and with a two-byte accumulator. It stores the result in `$E0D6/$E0D7,X`; the exact musical effect of each setting remains open.

The bytes at `$E43D–$E5C1` match the title, airshaft and third-story snapshots. The ending snapshot differs only in the adjustable immediate operand at `$E464`; the shared instruction descriptions therefore apply to all five snapshots.
