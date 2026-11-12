# Third story facts

The snapshot `work/story.vsf` is the story prompt reached after forcing the Broadway success path with the Jondi/Censor disk, as described in the game’s `orientation.md`. RAM at `$C200–$C33F` and `$C341–$C520` contains eight and twelve space-padded 40-byte rows, each followed by zero. The display routine and full load ownership are open.

A 60-frame VICE capture at the story wait recorded 564 instruction starts in `codemap.json`. It does not cover the preceding load or the full story sequence.

The sound-driver instruction ranges $E000–$E0C1, $E256–$E2CD, $E2D7–$E314 and $E321–$E3A2 match the airshaft play snapshot byte for byte. Their code was recovered from those established instruction entries, and comments on matching routines were carried from the airshaft listing. Other driver bytes include runtime-patched operands, and load ownership remains open.

The 24 two-byte command-table entries at $E226–$E255 and the two 14-byte parameter-pointer tables at $E668–$E683 match the airshaft snapshot. The pointed-to data following them and the two bytes at $E666–$E667 remain open.
