# work/

Gitignored. To rebuild the analysed state from your own copy of the game:

1. The disk holds one file, `RADAR RAT RACE` (34 blocks). Extract it or
   autostart the disk: `LOAD"*",8,1` then `RUN`. The BASIC line `SYS 2061`
   enters a relocator that copies the 8 KB image to its runtime homes.
2. At the title screen (PUSH 'F1' TO RUN) hold F1 for about three seconds
   until round 1 is playing. Take the snapshot then; the engine's own IRQ
   handler is installed only once play has started.
3. Save the snapshot in this folder, then
   `python3 kit/scripts/tools.py r2000 games/c64/radar-rat-race/work/<your snapshot>.vsf`.
   It writes `work/<your snapshot>.regen2000proj` with every label and
   comment from `../symbols.json`, and starts the disassembler on it.

Details of the load sequence and the steady state are in `../orientation.md`.
