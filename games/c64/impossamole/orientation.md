# Impossamole — orientation

## Image and boot

The analysed disk is the Dynamix release from https://csdb.dk/release/?id=200006, downloaded from https://csdb.dk/getinternalfile.php/208736/Impossamole%2B%5Bdynamix%5D.d64. Its name, hash, two files and answers are in media.json. The image and snapshots stay in work/.

Start the installed headless VICE through `python3 kit/scripts/tools.py vice`. Its wrapper enables sound with `-sounddev dummy`. Autostart the disk, allow loading to finish (about 18 seconds on this setup), press SPACE through the intro, and answer N to unlimited energy. The game hands over at $0810. The title joystick selects music/effects. Press fire, allow the selector to settle, and press fire on Klondike for normal play. The steady-state snapshot is parts/resident/work/impossamole-play.vsf. Screenshots are in reference/.

## Parts and routes

The resident engine stays in memory. Five level payloads replace graphics, map blocks, actor templates and map streams. Level IDs are 0 Klondike, 1 Orient, 2 Amazonian Forest, 3 Iceland, and 4 Bermuda Triangle. Each part has entry.vsf (stopped at $16AE after load) and play.vsf (ten frames later) under work/.

The inspection route restores the steady-state snapshot, neutralises joystick 2, sets requested level $08B9 to the ID, invalidates loaded ID $08BA with $FF, sets $08BD=1, and enters the game's load call at $1780. A breakpoint at $16AE stops after $16A6 accepts payload ID $7EC0. This is a debugger inspection route, not a recorded playthrough or proof of ordinary access to the final level. No replay is part of this run.

CPU breakpoints before and after decompression ($04FA/$0508) establish the loaded regions. Seven segments end at $F800, $E800, $CE00, $BD40, $9B00, $8400, and $7EC2. The engine uses CPU port $35 and vectors in RAM. Generated screens $E800/$EC00 and mutable actor slots are excluded from the resident coverage ledger; level-owned ranges are counted in their own parts.

## Rejected candidate

A Light release was tried before choosing this disk. An instruction trace at $1607 showed requested and loaded ID both zero, skipping the load, followed by the payload check at $16A6 rejecting ID 1 and looping to $1602. This was a failure of that boot state, not evidence of an original game bug. Its image is excluded from the canonical media ledger and analysis.

## Tools

The installed VICE MCP v3.14.0 headless build was retained. The emulator contract run passed 56 checks. Host-key injection failed and the final compatibility probe raised KeyError(checkpoints); joystick, keyboard-matrix injection, exact stops, stepping, watchpoints and snapshot determinism passed. regenerator2000 answers on ports 3000–3005, one session per part. All launches use tools.py, keeping configuration and snapshots under tools/.
