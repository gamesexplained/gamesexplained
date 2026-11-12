# Ending facts

The snapshot `work/story.vsf` is the ending prompt reached through the forced museum success path in the game’s `orientation.md`. RAM at `$C200–$C47F` contains sixteen space-padded 40-byte rows and `$C480` is zero. The display routine and full load ownership are open.

A 60-frame VICE capture at the story wait recorded 418 instruction starts in `codemap.json`. It does not cover the preceding load or the full story sequence.

The sound-driver instruction ranges $E000–$E0C1, $E256–$E2CD, $E2D7–$E314 and $E321–$E3A2 match the airshaft play snapshot byte for byte. Their code was recovered from those established instruction entries, and comments on matching routines were carried from the airshaft listing. Other driver bytes include runtime-patched operands, and load ownership remains open.
