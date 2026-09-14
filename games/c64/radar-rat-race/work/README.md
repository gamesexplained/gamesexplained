# work/

Gitignored. To rebuild the analysed state from your own copy of the game:

1. The disk holds one file, `RADAR RAT RACE` (34 blocks). Extract it or
   autostart the disk: `LOAD"*",8,1` then `RUN`. The BASIC line `SYS 2061`
   enters a relocator that copies the 8 KB image to its runtime homes.
2. At the title screen (PUSH 'F1' TO RUN) hold F1 for about three seconds
   until round 1 is playing. Take the snapshot then; the engine's own IRQ
   handler is installed only once play has started.
3. `python3 kit/scripts/symbols_import.py games/c64/radar-rat-race <your snapshot>.vsf`
   writes `work/radar-rat-race.regen2000proj` with every label and comment.
4. `script -q /tmp/r2000.log regenerator2000 --mcp-server games/c64/radar-rat-race/work/radar-rat-race.regen2000proj`

Details of the load sequence and the steady state are in `../orientation.md`.
