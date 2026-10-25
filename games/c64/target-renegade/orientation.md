# Target Renegade — orientation

## The image

The contributor supplied `Target Renegade [EasyFlash].crt` from OneLoad64 v6 Early Access. The private working copy is `work/target-renegade.crt`; no cartridge bytes or snapshots are distributed with this contribution. SHA-256: `4a15d0ee31f58427723170975a31bd05a900e9a5914bd84f8fc28c742e4ed924`.

The kit cartridge reader identifies `C64 CARTRIDGE`, hardware type 32, name EASYFLASH, EXROM=1 and GAME=0, with eleven banks numbered 0–10. Each has 8 KB windows at $8000 and $A000; bank 2's lower window is all zero. The edition's provenance before OneLoad64 is unknown. No trainer menu was presented and no cheat was selected. The five-life initial value differs from the manual's three.

## From power-on to play

1. Start the installed GUI emulator through `python3 kit/scripts/tools.py --platform c64 vice`. The run used PAL. Its v3.13.2 build passed all 57 `check-emulator` checks on 25 October 2026. No failed-check workaround was needed.
2. Autostart the supplied CRT using `kit/c64/vice.py`'s `autostart()` helper. A hard reset with the cartridge attached also restarts its loader. The loader shows a striped border, a loading message, and a picture before the game's text title. Wait for **PRESS FIRE TO START**, rather than timing a short input from the first black screen. Accelerating the loader with WarpMode is optional; turn it off before play or timing.
3. Hold fire on joystick port **1**. In the measured route, 100 frames carried the title into the first car-park screen; release fire. A preceding 150-frame port-2 fire test left the title unchanged.
4. Pause and save without ROMs, with all inputs released. The private gameplay image is `parts/resident/work/play-round1.vsf`; `reference/stage1.png` shows its state. PC was $A752, $00/$01 were $2F/$35, IRQ vector $FFFE was $AAF0, and NMI vector $FFFA was $A973. RAM vectors $0314/$0318 retained $EA31/$FE47 and are not the active hardware vectors here.
5. To capture the earlier image used for the listing, place a stopping execute checkpoint at $2600, hard-reset the attached cartridge, and wait through the entire loader. The first 40-second real-time wait was insufficient; enabling warp then reached the checkpoint. Check PC=$2600 and CPU-view $00/$01=$2F/$35, disable warp, save without ROMs, and remove the checkpoint. This is `parts/resident/work/entry.vsf` (RAM entry bytes begin `A2 00 BD 46 35 9D 0D 02`).

The resident listing uses **entry.vsf**. It preserves the loader source at $3546–$3645 before title entry copies it to $020D–$030C and clears/draws over its source. Generated low-RAM loader state and screens are excluded; the authored source belongs to first-load. Private snapshots and the full recorded frame stay in work/.

## Native directory

Bank-zero directory records begin at $875F, spaced 24 bytes: sixteen name bytes, bank, flags, source address, destination address and byte count. The generic loader advances $8000–$BFFF windows through $DE00. The $-prefixed directory-end record follows I.

| File | Bank/source | RAM destination | Bytes |
|---|---|---|---|
| BOOT¤EF | 1/$8000 | $0801 | 32,535 |
| T1 | 2/$BF17 | $0400 | 64,512 |
| A | 6/$BB17 | $2C00 | 2,048 |
| B | 7/$8317 | $68C0 | 5,440 |
| C | 7/$9857 | $B000 | 19,455 |
| D | 8/$A456 | $4800 | 2,048 |
| E | 8/$AC56 | $2C00 | 2,048 |
| F | 8/$B456 | $68C0 | 5,440 |
| G | 9/$8996 | $B000 | 19,455 |
| H | 10/$9595 | $68C0 | 5,695 |
| I | 10/$ABD4 | $3400 | 512 |

E/F/G and H/I match their destination bytes exactly in the native entry snapshots. A/B/D match the cold first-load image; C differs at one sprite alignment byte ($CFFF), where the indexed NMI store can write. T1 contains the initial RAM image and edition patches. Generic cartridge filesystem/boot-presentation bytes and stored RAM copies are excluded from the bank ledgers; game resources are counted once in RAM. The excluded banks do not stand for eleven independent game engines.

## Parts and capture routes

| Part | Recorded snapshot and ownership |
|---|---|
| Shared engine | `parts/resident/work/entry.vsf`, PC=$2600. Owns shared music, game logic, title/status font and fighter graphics. `play-round1.vsf` is the first-stage play reference. |
| First load | `parts/first-load/work/entry.vsf`, copied from cold entry. Owns $2C00–$33FF, $68C0–$7DFF, $B000–$FBFE, initial font $4800–$4FFF and loader source $3545–$3645. |
| Second load | From first-stage play, set stage index to 2 and enter native advance at $824F. Stop at $826C after E/F/G load, before setup. Save `parts/second-load/work/entry.vsf`. Run 150 frames for `play-stage4.vsf`. Owns the three replaced resource allocations. |
| Ending | From stage-5 state, set $0687=1 and resume the native main loop. Stop at $82A3 after H/I load and before JSR $3400. Save `parts/ending/work/entry.vsf`; run 300 frames for `play-ending.vsf`. Owns ending code $3400–$35FF and sprite payload $68C0–$7EFE; the rebuilt mirror-cache tail is excluded. |
| Bank 00–10 | Private cartridge windows are preserved for reproduction. Their stored payloads are represented by RAM parts; loader presentation, storage duplication and filler are outside the engine scope. |

Stages 2/3 are captured by entering native $824F advancement from the preceding initialized state; stage 5 advances from stage 4. Resource swaps and normal setup run unchanged. These are explicit state-assisted routes, not completed fights. References `stage2.png` through `stage5.png` and `ending.png` come from these states.

## Steady state and rendering

Port $35 keeps I/O visible with RAM under BASIC/KERNAL. The shared IRQ enters $AAF0 and dispatches by pushed target-minus-one addresses from $AB2F. The playfield uses VIC bank $4000 with screen buffers $4000/$4400 and font $4800; the lower panel uses bank zero, screen $3400 and font $3800. A full captured stage-one frame recorded 38 video writes and reproduced all 104,448 pixels exactly. Its memory capture is private `work/frame-stage1.json`.
