# Second story facts

The snapshot `work/story.vsf` is the story prompt reached after forcing the airshaft success path, as described in the game’s `orientation.md`. RAM at `$C200–$C3B7` contains eleven space-padded 40-byte rows and `$C3B8` is zero. The forced success path restores the story engine and enters `$10B7`; the loader opens `4*`, and the shared text renderer reads 40-byte rows from this address.

A 60-frame VICE capture at the story wait recorded 535 instruction starts in `codemap.json`. It does not cover the preceding load or the full story sequence.

The sound-driver instruction ranges $E000–$E0C1, $E256–$E2CD, $E2D7–$E314 and $E321–$E3A2 match the airshaft play snapshot byte for byte. Their code was recovered from those established instruction entries, and comments on matching routines were carried from the airshaft listing. Other driver bytes include runtime-patched operands.

The 24 two-byte command-table entries at $E226–$E255 and the two 14-byte parameter-pointer tables at $E668–$E683 match the airshaft snapshot. The pointed-to data following them and the two bytes at $E666–$E667 remain open.

The decoded `4.SECOND STORY` load writes `$3000–$37FF`, `$6400–$91FF`, `$C200–$C3FF` and `$E000–$EFE1`. Its later story snapshot differs from the dual-fill output in 98 bytes, all within the sound-driver area; the cause of each difference remains open. The part lies over the airshaft; its stable loaded picture range is included in coverage, with unclassified bytes still open.

The sound routine at `$E43D` reads a voice sequence, adds its pitch offsets and looks up a little-endian frequency at `$E5C2`. It can adjust the frequency with the per-voice values at `$E0DB–$E0DE` and with a two-byte accumulator. It stores the result in `$E0D6/$E0D7,X`; the exact musical effect of each setting remains open.

The bytes at `$E43D–$E5C1` match the title, airshaft and third-story snapshots. The ending snapshot differs only in the adjustable immediate operand at `$E464`; the shared instruction descriptions therefore apply to all five snapshots.

The sound command table and instructions at `$E226–$E2E6` match the title, airshaft, third-story and ending snapshots. The table selects commands to reset voice state, set pitch operands and set a sequence pointer. The sequence-pointer advance at `$E266` has been decoded, but its entry path remains open.

The first three seven-byte tune records begin at `$EB5C`, `$EB63` and `$EB6A`. Each supplies an increment and three sequence-list addresses to `$E000`. In the title, airshaft, second-story and third-story snapshots, record 0 points to zero-terminated lists at `$EB83`, `$EB99` and `$EB71`; the ending has different records and lists. The entries are listed individually in each part’s Source tab.

The stream reader at `$E3B7` treats bytes below `$80` as values to play and divides higher bytes into command-table dispatch (`$80–$BF`), parameter-table selection (`$C0–$CF`), a two-byte parameter (`$D0–$DF`) and a duration (`$E0–$FF`). The command and parameter table lookups do not check their indices against the known table lengths. These rules describe the shared instructions; the complete streams and their reachable values remain open.

The record-0 lists lead to 14 distinct entry points in `$EBB1–$EF41`. An ordered linear decode identifies values below `$80`, duration selectors, command bytes and their immediate parameters, stopping at a sequence-list transfer. Reassembling the listed tokens reproduces all 913 bytes. The entries at `$EE3D/$EE3E` share their tail. The four captured copies of this range match byte for byte. Actual timing and the reachability of every branch remain open.

The effect selectors at `$E6AD`, `$E70C` and `$E76B` index 26 little-endian pointers at `$E7CA–$E7FD`. Each points to a 12-byte record at `$E7FE–$E935`. The records supply effect count, interval, initial frequency, SID settings, frequency step and mode, reload count and modulation flag; the active-channel update at `$E937` uses the copied state. These bytes match in the title, airshaft, Broadway, second-story, third-story, museum and ending snapshots. The gameplay event for each record remains open.

This story load contains two picture sources: bitmaps at `$6400–$77FF` and `$7B00–$8EFF`, matrices at `$7800–$7A7F` and `$8F00–$917F`, and colour bytes at `$7A80/$9180`. The shared story copies at `$1538/$1593` use these ranges. In the captured story snapshot, `$4000–$53FF` and `$6000–$627F` match the second bitmap and matrix. The Graphics page shows the first 15 rows of both sources.

The text tail `$C3B8–$C3FF` is zero in both decompressor-fill runs and the story snapshot; its use beyond the text terminator remains open. The font at `$3000–$37FF` matches the title snapshot and is listed with the title. The loaded sound bytes at `$E6B6–$E7C9` also match the title snapshot and are listed there. All remaining stable output bytes have records in this part’s listing.

The forced airshaft success path restores the story engine with X=0 and Y=2, which enters `$10B7`. If successive story input checks leave `$19A3=$FF`, that routine calls `$15EE` and `$1649` after `$1538/$1593`. Those copy from `$9200–$A880` and `$A900–$BF80` respectively. In the captured second-story snapshot, both source ranges are byte-identical to the preceding clean airshaft snapshot; the `4.SECOND STORY` decompressor did not produce stable output there. In the saved story state, VICE reports PC `$14D6`, stack pointer `$F9`, and stack bytes `$A6 $19 $0A $11 $39 $10`. These return addresses put the machine in the tick wait inside `$19A4`, called from `$1108`, after the conditional copies in the `$10B7` path. This supports that the forced route passed the two calls; their intermediate displays have not been captured.

The 127 bytes after each loaded picture colour byte are described in the listing. The known story picture-copy routines stop at the colour byte; whether other code reads these following bytes remains open.
