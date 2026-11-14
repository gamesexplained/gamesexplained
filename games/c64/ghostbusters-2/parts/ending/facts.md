# Ending facts

The snapshot `work/story.vsf` is the ending prompt reached through the forced museum success path in the game’s `orientation.md`. RAM at `$C200–$C47F` contains sixteen space-padded 40-byte rows and `$C480` is zero. The shared story engine can read 40-byte rows from this address; the museum outcome enters the restored engine with X=2,Y=2, selecting `$1158`, whose `$0415` loader entry requests `8*` before the shared text renderer.

A 60-frame VICE capture at the story wait recorded 418 instruction starts in `codemap.json`. It does not cover the preceding load or the full story sequence.

The sound-driver instruction ranges $E000–$E0C1, $E256–$E2CD, $E2D7–$E314 and $E321–$E3A2 match the airshaft play snapshot byte for byte. Their code was recovered from those established instruction entries, and comments on matching routines were carried from the airshaft listing. Other driver bytes include runtime-patched operands.

The 24 two-byte command-table entries at $E226–$E255 and the two 14-byte parameter-pointer tables at $E668–$E683 match the airshaft snapshot. The pointer pairs select pitch-offset sequences, terminated by a byte with bit 7 set; the frequency lookup ends before these pointer tables. The shared sound-state and command descriptions are in the airshaft listing.

The decoded `8.THE END` load writes `$3000–$37FF`, `$6400–$7AFF`, `$C200–$C4FF` and `$E000–$ED31`. Its later snapshot differs from the dual-fill output in 87 bytes, all in the sound-driver area. The ending lies over the museum; the restored engine at `$1000–$1BFF` is counted in `story-engine`.

The ending’s first tune record selects three zero-terminated pointer lists at `$EB7F`, `$EB71` and `$EB89`. Their ten distinct entry points share several bytecode suffixes. Six further pointers at `$EC92–$EC97` and `$ECD3–$ECD8` select streams that each end in command `$91`, which stops the sound. The listing gives 16 ordered, non-overlapping decoded pieces; reassembling them reproduces all 406 stream bytes. The byte at `$ED31` follows the terminated streams. The music-state cycle, excluding inactive effect-noise state, repeats after 49,152 updates following 19,662 initialization updates.

The ending load contains a picture bitmap at `$6400–$77FF`, its 640-byte matrix at `$7800–$7A7F` and a colour byte at `$7A80`. The story copy at `$1538` uses these sources; the ending snapshot’s `$4000–$53FF` bitmap matches the source. The Graphics page shows the first 15 rows.

The text tail `$C480–$C4FF` is zero in both decompressor-fill runs and the story snapshot; it is padding after the terminating zero and is outside the text renderer’s row reads. The font at `$3000–$37FF` matches the title snapshot and is listed with the title. The loaded sound bytes at `$E6B6–$E7C9` also match the title snapshot and are listed there. All remaining stable output bytes have records in this part’s listing.

The 127 bytes after each loaded picture colour byte are described in the listing. The picture format ends with the single colour byte; these following bytes are retained to the load segment’s boundary and are outside the picture-copy reads.
