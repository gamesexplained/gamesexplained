# Commando — orientation

## The image

`work/Commando.d64` is a 35-track D64 (174,848 bytes). Its directory is `0 "once upon a time" -rem-` and contains two PRG files:

| Directory entry | Blocks | Observed purpose |
|---|---:|---|
| `COMMANDO+5HI/REM` | 120 | REMEMBER crack release, with manual, high-score menu, and up to five trainer options. This is the game's packed program. |
| `COMMANDO HI /REM` | 1 | 93-byte PRG including its two-byte load address; 91 payload bytes at `$0EED-$0F47` match the gameplay snapshot and the save routine writes that same range as the high-score file. |

The image is a cracked/trainer release, not an unmodified retail image. No trainer option was chosen. `c1541` extracted working copies to `work/trainer.prg` and `work/game.prg`; these are ignored working files and must not be committed.

## From power-on to play

1. Start VICE through `python3 kit/scripts/tools.py vice`. Attach `work/Commando.d64` to unit 8 and hard-reset before autostarting directory file 1 (`COMMANDO+5HI/REM`). VICE's direct image autostart of the one-block auxiliary file only returned to BASIC READY.
2. Wait about 25 seconds for the REMEMBER crack screen. Press Space to read the built-in manual. Press Escape (the VICE Run/Stop key) to leave the manual. At `Highscore or Trainer?`, press `H`; at `Load or Restart Highscore?`, press `R` to reset the score list and continue without selecting trainer options.
3. Wait about 30 seconds for the Commando title screen. Press joystick fire on port 2; wait for the battlefield. This was confirmed in VICE by a screenshot with Super Joe and the score/lives HUD.
4. Save without ROMs as `work/play.vsf`. The captured snapshot is live gameplay. The initial capture recorded PC `$3FEF`, `$01=$36`, RAM IRQ vector `$0314/$0315=$4116`, and NMI vector `$0316/$0317=$FE66` (KERNAL). A second known address corroborates the IRQ path: `$4116` jumps through `$0406-$0407`, whose gameplay value points to `$41A7`. Tracing the code writes maps the raster chain `$416A → $41A7 → $4266 → $436B → $4119 → $416A`; the active raster handler is selected through `$0406-$0407`. VICE was configured as PAL C64SC with 64 KB RAM, VIC-II 6569, SID 6581, and CIA 6526s.

Rebuild the captured state with:

```text
python3 kit/scripts/tools.py vice
# attach games/c64/commando/work/Commando.d64 to unit 8
# hard reset, autostart file 1, then follow steps 2–4 above
```

## Steady state

The gameplay snapshot is `work/play.vsf`; it was captured without ROMs or embedded disks. The CPU port value is `$36`. The IRQ vector in RAM points to `$4116`; the NMI vector still points into KERNAL ROM at `$FE66`. `$4116` dispatches through the current raster-handler pointer in `$0406-$0407`. The traced handler chain sets raster compare `$D012` for the next split and replaces this pointer at each stage. Whether levels reload data has not been checked.

`work/frame.json` records a full PAL frame. CIA2 port A `$C4` selects VIC bank `$C000`; the VIC screen matrix is at `$E000`. `$D018` changes from `$81` to `$85` at raster line 216, switching the character source from `$C000` to `$D000` for the lower raster band. The site's frame renderer matched the emulator's screenshot on all 104,448 pixels.

The snapshot names a stable gameplay screen with the player, terrain, and HUD visible. The screen was observed moving from the title to play after fire on joystick port 2; no complete frame-chain trace or entry snapshot has been captured yet.

## The loader, in a paragraph

VICE loads the first disk PRG at `$0801`. It shows a REMEMBER crack screen and a built-in manual before offering a high-score/trainer choice. Choosing the high-score path and restarting its score list leads to the Commando title screen; port-2 fire starts play. The second PRG contains 91 data bytes after its two-byte load address. All 91 match `$0EED-$0F47` in the gameplay snapshot. The routine at `$44E0` saves that exact range as `@S:COMMANDO HI /REM`, identifying the file as high-score data. A 16-byte-window search did not establish a contiguous memory mapping for the packed trainer payload in the gameplay snapshot; its unpacking and transfer-of-control sequence still needs tracing from a hand-over snapshot.
