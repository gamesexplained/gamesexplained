# Castle Master — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Strength full | `$2455` = 24 (`$18`), the cap script opcode `$13` allows | candidate |
| Sensors take no strength | `$754F-$7551` = `EA EA EA`, removing the `DEC $2455` the timer runs every 10 seconds | tested live: strength stayed at 16 for 600 frames in the Magister, where it otherwise falls a point every 500 (`work/scripts/drain.py nop`) |
| The spirit meter never ends the game | `$2454` = 13, spirits destroyed; the meter's signed multiply then never reaches 64 (Discoveries) | tested: every clock value in `test_meter.js`, and live the step from 127 to 128 in `work/scripts/meter.py`; the 13 count towards the 20 the Dragon's Lair waits for |
