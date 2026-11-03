# Lords of Chaos — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`Lords of Chaos (1990)(Blade).tzx` from the TOSEC ZX Spectrum set
(V2017-11-01, `Games/[TZX]/`; the entry with no `[a]`, `[h]` or `[t]`
flag, which holds both sides of Blade Software's 1990 tape), 81,025
bytes, SHA-256
`7cd5291b66586906fdb8380dd596859c0adac26d025e5ed68bc4ea94a5b55f70`. Its
header reads `ZXTape!` version 1.10. SkoolKit's `tapinfo.py` lists
fifteen blocks, every one at the ROM's standard speed:

| Block | What |
|---|---|
| 1, 2 | the header and 76 bytes of the BASIC program `T:LOC`, auto-run from line 10 |
| 3, 4 | the header and 135 bytes of `T:LOC2`, code saved from 25000 and loaded at 24000 (`$5DC0`) by the BASIC |
| 5 | a headerless block, flag byte 200, of 6,912 bytes: the loading screen |
| 6 | a headerless block, flag 200, of 33,203 bytes: the program, `$606E`-`$E220` |
| 7 | "stop the tape": the end of side one |
| 8, 9 | the game's own header (flag 100, twelve characters of name: `DESIGNER.   `) and 3,653 bytes, flag 200: `$D3DC`-`$E220` |
| 10, 11 | the header `1       .GAM` and 12,285 bytes: scenario 1, `$D003`-`$FFFF` |
| 12, 13 | `2       .GAM` and scenario 2, `$D003`-`$FFFF` |
| 14, 15 | `3       .GAM` and scenario 3, `$D003`-`$FFFF` |

The BASIC is one line: `10 PAPER 0: INK 7: BORDER 0: CLEAR 23999: LOAD
""CODE 24000: RANDOMIZE USR 24000`.

The same TOSEC folder's `.tap` of the game (`Games/[TAP]/Lords of Chaos
(1990)(Blade).tap`, 81,434 bytes) holds the same thirteen blocks after its
BASIC, byte for byte, and a different BASIC program, `LORDS`, of 540
bytes, which pokes the code before it starts it: a cheat loader, not the
original. It was not used. TOSEC's `(128K).z80` snapshot was not used
either. The game is a 48K program: no instruction writes the 128's paging
port or its sound chip.

## From power-on to play

1. Start ZEsarUX as a 48K Spectrum, at warp:
   `python3 kit/scripts/tools.py --platform spectrum zesarux --emulatorspeed 5000`.
   Power-cycle it (`hard-reset-cpu`) and `smartload` the `.tzx`. ZEsarUX
   plays the whole tape through its ROM traps; side one takes about 42
   seconds of wall clock at warp.
2. **The hand-over**: `LOC2` jumps to `$E1ED`, the game's first
   instruction, with the stack at `$5DA8`. `work/scripts/entry.py` arms a
   checkpoint on `PC=E1EDH` before the load, runs the tape in bounded
   chunks and saves the machine when it fires: `work/entry.sna`, SHA-256
   `4f7595fa9409de184a0909611931e49e22b59ca7cdb808d847cb5db13962776d`.
   At that moment `$606E`-`$E220` holds block 6 exactly and `$4000`-`$5AFF`
   block 5. This is the snapshot of the engine and the designer
   (`parts/engine/work/entry.sna`, `parts/designer/work/entry.sna`).
3. The first screen is **SELECT CONTROLS** (keyboard, Kempston joystick,
   Sinclair joystick), about 100 frames after the hand-over. Q and A move
   the bar, SPACE chooses. Every route here chooses the keyboard: SPACE,
   held 10 frames and released 20.
4. The **wizard designer's file panel** follows: DESIGN WIZARD, LOAD
   WIZARD, SAVE WIZARD, DELETE WIZARD, LOAD SCENARIO, LOAD SAVED GAME.
   `work/filing.sna` is the machine here.
5. **Loading a scenario**: A four times (each held 10 frames, released
   20) to LOAD SCENARIO, SPACE, then the scenario's number and ENTER at
   `FILE NAME:`. The game reads the tape from where it stands: it shows
   each file's name as it passes (`DESIGNER.`, `1 .GAM` ...) and loads
   the one asked for. `work/scripts/route.py <n>` does all of the above
   from power-on and saves the machine once `$D003`-`$FFFF` holds the
   scenario's block: `parts/scenario-<n>/work/entry.sna`. The panel then
   reads SCENARIO LOADED:n, with PLAY GAME, LOAD SCENARIO, LOAD DESIGNER,
   LOAD WIZARD, LOAD SAVED GAME and SAVE WIZARD.
6. **Play**: from scenario 1's panel, SPACE on PLAY GAME, `1` at HOW MANY
   PLAYERS?, wait 600 frames (the independent creatures' turn), and SPACE
   at the game turn panel: the map is drawn with WIZARD1 in his house.
   `work/s1-play.sna` is the machine 200 frames after that SPACE.

| Snapshot | SHA-256 |
|---|---|
| `parts/scenario-1/work/entry.sna` | `67ee86a20c9e2a8c451f92c5da073ee5375bd172a599cc170c76622de5879bfc` |
| `parts/scenario-2/work/entry.sna` | `c2a3473dd533235d1bf235fb32a2fa2ac8534c163e9358c0166093755a82c4b3` |
| `parts/scenario-3/work/entry.sna` | `a4d54e6d632ad7920a68e629acd31afff429c9dd97a9c6a83980711393182902` |

## The parts

The program stays in memory from `$606E` to `$D002` for the whole game;
everything from `$D003` up is replaced by whatever the player loads
next. So the game is five parts:

| Part | Folder | Addresses | Comes from |
|---|---|---|---|
| The engine | `parts/engine` | `$4000`-`$D002` | block 6, resident |
| The wizard designer | `parts/designer` | `$D003`-`$E220`, over the engine | block 6's tail at power-on; block 9 rewrites `$D3DC`-`$E220` when LOAD DESIGNER is chosen |
| Scenario 1, 2 and 3 | `parts/scenario-1` ... | `$D003`-`$FFFF`, over the engine | blocks 11, 13 and 15 |

Each scenario's block lands whole: the snapshot after it holds the
tape's bytes at `$D003`-`$FFFF` but for five (`$FFF8`, `$FFFB`-`$FFFE`),
which the loader's own stack overwrote while it read. Block 9 is byte
for byte the last 3,653 bytes of block 6, so the designer loaded at
power-on and the designer loaded later are the same code. A game saved
from the turn panel's menu is the same kind of file as a scenario, the
whole of `$D003`-`$FFFF` under a name ending `.SVG`, and is the player's
data, not a part.

## Steady state

- **Interrupts.** In the designer and the file panels the game runs with
  the interrupts off, in `IM 1`. In play it is in `IM 2` with `I` =
  `$FE`: the table at `$FE00`-`$FF00` is filled with `$FF`, so the vector
  is `$FFFF`, which holds `$18` (`JR`); its offset is the ROM's byte at
  `$0000` (`$F3`), which lands on `$FFF4`, `JP $A879`. The handler at
  `$A879` runs every frame and does its main work on every second one
  (the byte at `$606E` toggles).
- **No banking.** A 48K machine; the ROM is paged in throughout.
- **Tape during play.** The game reads and writes the tape through the
  ROM's own routines (`LD-BYTES` entered at `$0562`, `SA-BYTES` at
  `$04C6`), from its own routine at `$C5xx`.

## The loader, in a paragraph

`LOC2` clears the attributes, loads the loading screen through the ROM's
`LD-BYTES` into `$61A8` and copies it to the screen, loads the program at
`$606E` and jumps to `$E1ED`. Its loading routine at `$5DF5` is a short
wrapper around the ROM's (it enters `LD-BYTES` at `$0562` with a return
address that tests the BREAK key). Nothing is packed, moved or decrypted.
