# Third story facts

The snapshot `work/story.vsf` is the story prompt reached after forcing the Broadway success path with the Jondi/Censor disk, as described in the game’s `orientation.md`. RAM at `$C200–$C33F` and `$C341–$C520` contains eight and twelve space-padded 40-byte rows, each followed by zero. The shared story engine can read 40-byte rows from this address; its exact route into this scene remains open.

A 60-frame VICE capture at the story wait recorded 564 instruction starts in `codemap.json`. It does not cover the preceding load or the full story sequence.

The sound-driver instruction ranges $E000–$E0C1, $E256–$E2CD, $E2D7–$E314 and $E321–$E3A2 match the airshaft play snapshot byte for byte. Their code was recovered from those established instruction entries, and comments on matching routines were carried from the airshaft listing. Other driver bytes include runtime-patched operands.

The 24 two-byte command-table entries at $E226–$E255 and the two 14-byte parameter-pointer tables at $E668–$E683 match the airshaft snapshot. The pointed-to data following them and the two bytes at $E666–$E667 remain open.

The decoded `6.THIRD STORY` load writes `$3000–$37FF`, `$6400–$91FF`, `$C200–$C5FF` and `$E000–$EFE1`. Its later snapshot differs from the dual-fill output in 100 bytes, all in the sound-driver area. The part lies over Broadway; the restored engine at `$1000–$1BFF` is counted in `story-engine`.

This story load contains two picture sources: bitmaps at `$6400–$77FF` and `$7B00–$8EFF`, matrices at `$7800–$7A7F` and `$8F00–$917F`, and colour bytes at `$7A80/$9180`. The shared story copies at `$1538/$1593` use these ranges. In the captured story snapshot, `$4000–$53FF` and `$6000–$627F` match the second bitmap and matrix. The Graphics page shows the first 15 rows of both sources.

The text tail `$C521–$C5FF` is zero in both decompressor-fill runs and the story snapshot; its use beyond the text terminator remains open. The font at `$3000–$37FF` matches the title snapshot and is listed with the title. The loaded sound bytes at `$E6B6–$E7C9` also match the title snapshot and are listed there. All remaining stable output bytes have records in this part’s listing.

The 127 bytes after each loaded picture colour byte are described in the listing. The known story picture-copy routines stop at the colour byte; whether other code reads these following bytes remains open.
