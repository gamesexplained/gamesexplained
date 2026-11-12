# Title screen facts

The game loads `1.THE INTRO` before the title prompt. The prompt state is captured in `work/entry.vsf`; the opening story follows a further load. The packed file expands to the ranges in `part.json` when the captured decompressor is run over RAM filled with either zeroes or ones. Its 16,098 output bytes differ from the later title snapshot in 99 places, all in the sound-driver area `$E0C2–$E14A`, `$E43B–$E43C` and `$EB58–$EB5B`. These include mutable voice state and self-modified operands; the cause of each difference remains open. See `../../unpack-map.json`.

In the title-prompt snapshot, all 5,120 bytes at `$6400–$77FF` match `$4000–$53FF`, and all 640 bytes at `$7800–$7A7F` match `$6000–$627F`. The copied story engine has routines that perform these transfers. The individual picture bytes remain to be interpreted.

The title file contains 36 space-padded 40-byte rows at `$C200–$C79F`, followed by zero at `$C7A0`. They give staff and music credits, the developer and publisher, the title and a key prompt. The resident sequence at copied address `$1049` passes `$C200` to the story text renderer at `$1924`.
