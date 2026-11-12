# Title screen facts

The game loads `1.THE INTRO` before the title prompt. The prompt state is captured in `work/entry.vsf`; the opening story follows a further load. The packed file expands to the ranges in `part.json` when the captured decompressor is run over RAM filled with either zeroes or ones. Its 16,098 output bytes differ from the later title snapshot in 99 places, all in the sound-driver area `$E0C2–$E14A`, `$E43B–$E43C` and `$EB58–$EB5B`. These include mutable voice state and self-modified operands; the cause of each difference remains open. See `../../unpack-map.json`.

In the title-prompt snapshot, all 5,120 bytes at `$6400–$77FF` match `$4000–$53FF`, and all 640 bytes at `$7800–$7A7F` match `$6000–$627F`. The copied story engine has routines that perform these transfers. The individual picture bytes remain to be interpreted.

The title file contains 36 space-padded 40-byte rows at `$C200–$C79F`, followed by zero at `$C7A0`. They give staff and music credits, the developer and publisher, the title and a key prompt. The resident sequence at copied address `$1049` passes `$C200` to the story text renderer at `$1924`.

The title snapshot has sprite pointers `$A0–$A7` at `$07F8–$07FF`. The stored setup writes those pointers, places sprites 0–3 in four positions and sprites 4–7 at the same positions, and sets their colours to 1 and 2. The raster handler selects VIC bank 0 for the sprite portion of the display, so the pointers select eight 64-byte slots at `$2800–$29FF`; each slot contains 63 bitmap bytes and a padding byte.

In the saved title state `$145D=$01`, `$1905=$3B` and `$1906=$1B`. The raster handler at copied address `$1805` writes `$1906` to `$D011`, `$07` to `$DD00` and `$19` to `$D018`; in that character-mode band the character set begins at `$2000` in VIC bank 0. The renderer at `$1A12` maps each text byte to two screen codes: space becomes `$00/$01`, digits 0–9 become `$20/$21` through `$32/$33`, and either case of A–Z becomes `$42/$43` through `$74/$75`. It writes the even and odd codes into separate 40-byte buffers for successive screen rows. Other character patterns in the set have not been classified.
