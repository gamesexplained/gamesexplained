# Where Time Stood Still — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`Where Time Stood Still (1988)(Ocean)(128K)[aka Land That Time Forgot, The][aka Tibet].tzx`
from the TOSEC ZX Spectrum set (V2017-11-01; the entry with no `[a]`,
`[b]`, `[h]` or `[cr]` flag: Ocean's original 128K release), 126,274
bytes, SHA-256
`10d2f1cdc169697db0290b0e621d5ff0c83d93bebeca70a14f5daa56f7f89bc4`. TOSEC
lists a second clean tape tagged `[SpeedLock 7]`; its blocks carry the
same bytes, recorded with different pulses. A TOSEC `.z80` of the game
exists too and was not used: the listing comes from the tape.

The tape holds a standard-speed BASIC loader, `WTSS128` (3,232 bytes,
autostarting), then SpeedLock 4 turbo blocks: a 258-byte loader, the
loading screen (6,144 and 768 bytes), 22,183 bytes of the game's program,
four short blocks (2, 4, 80 and 217 bytes), five blocks of 16,384 bytes,
one of 9,472, and four more short ones (115, 49, 32, 15). The turbo blocks
are encoded: none of their bytes appears as it is in memory once loaded.
By the paging seen while the tape loads (port `$7FFD` sampled every three
seconds), the 16 KB blocks go to banks 0, 1, 3, 4 and 6 in that order, and
the 9,472 bytes to bank 7 at `$DB00`-`$FFFF`.

## From power-on to play

1. Start ZEsarUX as a Spectrum 128:
   `python3 kit/scripts/tools.py --platform spectrum zesarux --machine 128k`
   (add `--emulatorspeed 5000` to load at warp). `smartload` the `.tzx`.
   ZEsarUX plays the turbo blocks in real time: the load takes about nine
   minutes at normal speed, and bank 7 is paging in about 90 seconds after
   the load starts at warp.
2. The loading screen (`reference/` has the same picture) stays up
   throughout. The loader runs at `$BB00`-`$BFFF`.
3. **The hand-over**: once the last block is in, the loader jumps to a stub
   at `$5B00` that pages in bank 0 and ROM 1 (`$7FFD` = `$10`), moves
   `$6302`-`$BA85` up by `$500` to `$6802`-`$BF85`, sets the stack at
   `$5FFF` and jumps to `$8521`, the game's first instruction. Arm a
   breakpoint on `PC=8521H` once bank 7 is paging in and save the machine
   there: `work/entry.sna` (a 131,103-byte 128K `.sna`, SHA-256
   `c1653798c4bec7bc9c489cc73afe15aceb438c58c27838c0dd8d16b2be13f5cd`).
   `work/entry.py` does all of this.
4. The game sets up its interrupt, starts the title music and shows the
   control selection screen (0 SELECT, 1 KEYBOARD, 2 KEMPSTON, 3 SINCLAIR,
   4 CURSOR). Press `4` and `0` (each held 10 frames), then `Y` to
   confirm: play starts at the crash site on day 1, about 250 frames later.
   `work/play-start.sna` is the machine there.

## The parts

One load, six parts: everything is in memory after the tape, and the game
pages its RAM banks in at `$C000` as it runs. The parts are cut by bank,
not by load (`kit/spectrum/banks.py`):

| Part | Addresses | What it holds |
|---|---|---|
| `main` | `$4000`-`$FFFF` with bank 0 at `$C000` | the program, the sound driver, the screen and bank 0's tiles and starting values |
| `bank-01` | bank 1 at `$C000` | the ground of the area loaded, the packed ground of each area, the animations, and the sprites of Jarret, Dirk and two kinds of creature |
| `bank-03` | bank 3 at `$C000` | most of the game's logic: shots, menus, the party's needs, the creatures, the objects, the zones |
| `bank-04` | bank 4 at `$C000` | the scenery pieces of the area loaded and the characters they are drawn from |
| `bank-06` | bank 6 at `$C000` | Gloria's and the creatures' sprites, the scenery objects of each area, the objects' pictures |
| `bank-07` | bank 7 at `$DB00` | each area's scenery record and packed map; `$C000`-`$DAFF` is the second screen |

Each part's listing is built from `work/entry.sna` with the part's bank
paged in (`part.json`'s `bank`).

## Steady state

Interrupt mode 2 with I = `$84`: the table at `$8400` is 257 bytes of
`$BE`, so every interrupt goes to `$BEBE`, which runs the clock and a pass
of the sound driver at `$7000`. The sound driver, the main loop and every
routine that switches banks live below `$C000`; bank 3 holds most of the
logic and is paged in for most of a pass, and the other banks are paged in
for a few instructions at a time (`$8C75`-`$8CB5`). `$8D1E` keeps the last
value written to `$7FFD`, so each paging keeps the screen and ROM bits. In
play the 128 ROM (ROM 0) is paged in; the game calls none of it.

The view is drawn in the screen not shown (bank 5 or bank 7), and at the
end of a pass the two swap (`$9987`). In the sessions recorded with
`kit/spectrum/bankmap.py`, code ran at `$C000`-`$FFFF` from bank 3 and
bank 0 only: banks 1, 4, 6 and 7 hold data.

The plateau is sixteen areas, four by four. When the view runs off an
edge of the area, the next area is loaded (bank 3's `$DB0B`, then
`$87CF`): its ground into bank 1 `$C000`, its scenery pieces into bank 4
`$C000`, the boxes the actors walk round into bank 3 `$C000` and its map
into bank 0 `$C000`. Nothing is loaded from tape after the start.

## The loader, in a paragraph

The BASIC loader starts a SpeedLock 4 turbo loader, which loads its second
stage at `$BB00`, the loading screen, the program and the banks, paging
each bank in at `$C000` before its block, then jumps to the stub at
`$5B00`. Not annotated further, by policy.
