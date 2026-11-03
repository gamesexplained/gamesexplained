# Laser Squad — orientation

How to get from your own copy to the analysed state. Someone else must be
able to follow this exactly.

## The image

Blade Software's 48K cassette of 1988, as the TOSEC set holds it (read on
archive.org, `ZXSpectrumTOSECSetV20171101LadyEklipse`, on 3 November 2026):

| Side | TOSEC file | SHA-256 of the `.tzx` |
|---|---|---|
| A | `Games/[TZX]/Laser Squad (1988)(Blade)[scenario 1-2].zip` | `2cff880377ad8abde415607ce6f61418acb1035b3cc39d91965fd648af790dad` |
| B | `Games/[TZX]/Laser Squad (1988)(Blade)[scenario 3-5].zip` | `7b67ebc8cf747defc2fb4e78d0d650dbfe415115b389cc8d4c9cd0e7c20bf292` |

Both are MakeTZX dumps of standard-speed ROM blocks (block type `$10`
only), no turbo loader and no protection. What the header bytes say:

| Side | Block | Flag | Header | Length | Lands at |
|---|---|---|---|---|---|
| A | 1-2 | `$00`, `$FF` | BASIC `LS`, autostart line 10 | 123 | the BASIC area |
| A | 3-4 | `$00`, `$FF` | CODE `SCREEN`, start `$7530` in the header | 6,912 | `$4000`: the BASIC says `LOAD ""SCREEN$`, which ignores the header's address |
| A | 5-6 | `$00`, `$FF` | CODE `LCODE`, start `$5E28` | 22,521 | `$5E28-$B620`, the engine |
| A | 7 | `$64` (100), headerless | — | 18,911 | `$B621-$FFFF`: scenario 1, The Assassins |
| A | 8 | `$65` (101) | — | 18,911 | the same: scenario 2, Moonbase Assault |
| B | 1 | `$66` (102) | — | 18,911 | the same: scenario 3, Rescue from the Mines |
| B | 2 | `$68` (104) | — | 18,911 | the same: menu option 5, The Cyber Hordes |
| B | 3 | `$69` (105) | — | 18,911 | the same: menu option 6, Paradise Valley |

The flag of each scenario block is 99 plus its number in the scenario
menu: option 4, "Saved game", would be `$67` (103), a block the player
saves. The Blade release carries all five scenarios as standard; the two
of Expansion Kit Two (The Stardrive and Laser Platoon, sold by mail
order, TOSEC `[scenario 6]` and `[scenario 7]`) are not part of this
game folder.

Two other dumps in TOSEC were looked at and not used:
`Games/[TAP]/Laser Squad (1988)(Blade).zip` (a different loader, a
1,663-byte machine-code block, and four scenario blocks all flagged
`$68`) and `Games/[TZX]/Laser Squad (1988)(Blade)[all extra levels].zip`
(the same layout as the TAP). Expansion Kit One's own tapes in TOSEC
(`Laser Squad Expansion Kit One (1988)(Blade)(Side A/B)`) hold the same
two blocks as side B's last two, byte for byte, both flagged `$68`.

## From power-on to play

The emulator is ZEsarUX 13.0 as a 48K Spectrum, started by the kit's
launcher (`tools.py --platform spectrum zesarux`). Loading at real speed
takes about five minutes for side A; `--emulatorspeed 20` at launch makes
it about 50 seconds and changes nothing else used here.

1. `hard-reset-cpu`, then `smartload` side A's `.tzx`. The ROM's
   `LOAD ""` runs the BASIC loader: `CLEAR 24100`, `LOAD ""SCREEN$`,
   `LOAD ""CODE`, `RANDOMIZE USR 24104`.
2. **Hand-over.** A stopping checkpoint on `PC=5E28H` stops on the
   engine's first instruction. `work/entry.sna` is saved there.
3. The scenario menu appears ("WHICH SCENARIO ?", options 1 to 6, the
   game waiting in `$A276`). Press the scenario's number. The tape goes on
   playing and the engine reads the scenario's block with the ROM's
   `LD-BYTES` (`$0562`, entered past its start): about 10 seconds at
   20x for scenario 1. For a scenario on side B, play the two sides as
   one tape: the side B blocks appended after side A's, which is what
   turning the cassette over does (`work/sideAB.tzx`, made by copying
   side B's blocks after side A's). ZEsarUX's `realtape-open` resets the
   machine, so it is not a way to turn the tape over mid-load.
4. "WHICH CONTROLS ?": 4, the keyboard (Q up, A down, O left, P right,
   SPACE fire). Then "HOW MANY PLAYERS ?": 1. Then "WHICH LEVEL ?":
   1. Keys from here are held for 10 frames and released for 20, stepped
   by frames over ZRCP (`set_input`, `frames`), so a route replays.
5. **Equipment.** Armour: Q twice and SPACE for each of the five
   assassins (type 2 each). Weapons: for each unit, A then P (one M4000
   auto-gun each), then SPACE twice.
6. **Deployment.** O held 40 frames and then 100 (the cursor runs to the
   map's left edge), Q twice, SPACE; then four times P and SPACE: the
   five assassins on the top row of red squares at the left. The computer
   deploys its side without showing it.
7. The options screen ("WHICH OPTION ?": change controls, save, load,
   verify): SPACE. The turn summary (turn 1, 19 turns left, victory
   points 0 to 0): SPACE. Play begins in cursor mode.

Snapshots, all in `work/` (48K `.sna`):

| File | State |
|---|---|
| `entry.sna` | hand-over, PC `$5E28`, the loading screen on show |
| `menu.sna` | the scenario menu |
| `s1-level.sna` | scenario 1 loaded, "WHICH LEVEL ?" after controls 4 and one player |
| `s1-weapons.sna` | scenario 1, armour bought, weapons screen |
| `s1-deploy.sna` | scenario 1, deployment of the first unit |
| `s1-play0.sna` | scenario 1, the five deployed |
| `s1-turn1.sna` | scenario 1, the turn summary of turn 1 |
| `s1-play.sna` | scenario 1, cursor mode in turn 1: steady-state play |
| `s2-controls.sna`, `s3-controls.sna`, `s5-controls.sna`, `s6-controls.sna` | each scenario just loaded, at "WHICH CONTROLS ?" |

Each scenario snapshot's `$B621-$FFFF` was checked against its tape block:
equal, byte for byte, in all five.

## The parts

The engine stays in memory and each scenario is loaded over the same
18,911 bytes at its top, so the game is six parts (`parts/`):

| Order | Part | Load | Snapshot |
|---|---|---|---|
| 1 | `engine` | `LCODE`, `$5E28-$B620` | `parts/engine/work/entry.sna` = `work/entry.sna` |
| 2 | `assassins` | flag `$64`, `$B621-$FFFF` | `parts/assassins/work/entry.sna` = `work/s1-level.sna` |
| 3 | `moonbase-assault` | flag `$65` | `parts/moonbase-assault/work/entry.sna` = `work/s2-controls.sna` |
| 4 | `rescue-from-the-mines` | flag `$66` | `parts/rescue-from-the-mines/work/entry.sna` = `work/s3-controls.sna` |
| 5 | `cyber-hordes` | flag `$68` | `parts/cyber-hordes/work/entry.sna` = `work/s5-controls.sna` |
| 6 | `paradise-valley` | flag `$69` | `parts/paradise-valley/work/entry.sna` = `work/s6-controls.sna` |

The route to each scenario is steps 1 to 3 above with its menu number.
The engine's bytes are the same in every scenario's snapshot except the
variables the game writes and the 17 bytes of start-up at `$5E28-$5E38`,
which the stack (set to `$5E39`) runs down over once the game is going:
the engine's listing is built from the hand-over, which still holds them.

## Steady state

The interrupts are off for the whole game: the engine's first instruction
is `DI`, and nothing turns them on again (IFF2 is 0 in every snapshot from
`menu.sna` on). The ROM's tape routines are entered past their own `DI`
and their exit through `SA/LD-RET`, which would turn them on: `LD-BYTES`
at `$0562` and `SA-BYTES` at `$04C6`, each with the game's own return
address (`$B1AE`) pushed first. So the game paces itself with its own
delay loops and reads the keyboard itself: in play with `IN` from port
`$FE` (the routines at `$B0E8-$B15A`, one for each control option, picked
through the table at `$B0E0`), in the menus by calling the ROM's
`KEY-SCAN` (`$028E`) directly. `IY` is free for the game's own use
(`$D2B4` in `s1-play.sna`). There is no banking: 48K.

The game's memory: the ROM's system variables and the game's own
variables at `$5B00-$5E27` (cleared from `$5B00` to `$5E24` by the first
instructions), the stack below `$5E39`, the engine at `$5E28-$B620`, the
scenario at `$B621-$FFFF`. Nothing is reloaded during play; a saved game
goes to tape as a block of its own.

## The loader, in a paragraph

There is no loader of the game's own for the main program: a three-line
BASIC program loads the screen and the code with the ROM and calls
`$5E28`. The engine clears its variables, sets its stack and goes to
`$B1C3`, which shows the scenario menu and loads the chosen scenario with
the ROM's `LD-BYTES`, entered at `$0562` with the flag 99 + the option's
number, the length 18,911 and `IX` = `$B621`; a failed load comes back to
the menu. Option 4 loads a saved game the same way.
